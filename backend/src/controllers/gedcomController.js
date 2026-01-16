const fs = require("fs");
const path = require("path");
const { prisma } = require("../lib/prisma");
const {
  resolveStoredFilePath,
  safeMoveFile,
  safeUnlink,
  TREE_UPLOADS_DIR,
  PRIVATE_TREE_UPLOADS_DIR,
  ensureUploadDirs,
} = require("../utils/files");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");
const { treeUpload } = require("./treeController"); // Reuse existing upload config

// Helper to normalize names
const normalizeGedcomName = (raw) => {
  const cleaned = String(raw || "")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
};

// Robust GEDCOM Parser
const parseGedcom = (content) => {
  const lines = String(content || "").split(/\r\n|\n|\r/);
  const individuals = [];
  let familiesCount = 0;
  let eventsCount = 0;

  let currentIndi = null;

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    // Parse level, tag, value
    // Level is 1-2 digits, tag is alphanum, value is rest
    const match = line.match(/^(\d+)\s+(@[^@]+@\s+)?(\w+)(\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    // const xref = match[2]; // e.g. @I1@
    const tag = match[3].toUpperCase();
    const value = match[5] || "";

    if (level === 0) {
      // Save previous
      if (currentIndi) {
        if (!currentIndi.name && (currentIndi.given || currentIndi.surname)) {
          currentIndi.name = [currentIndi.given, currentIndi.surname]
            .filter(Boolean)
            .join(" ");
        }
        if (currentIndi.name) individuals.push(currentIndi);
        currentIndi = null;
      }

      if (tag === "INDI") {
        currentIndi = { name: null, given: "", surname: "" };
      } else if (tag === "FAM") {
        familiesCount++;
      }
    } else if (currentIndi) {
      if (tag === "NAME" && !currentIndi.name) {
        currentIndi.name = normalizeGedcomName(value);
      } else if (tag === "GIVN") {
        currentIndi.given = value;
      } else if (tag === "SURN") {
        currentIndi.surname = value;
      } else if (["BIRT", "DEAT", "MARR", "BURI", "CHR"].includes(tag)) {
        eventsCount++; // Just counting for stats as requested
      }
    }
  }

  // Flush last
  if (currentIndi) {
    if (!currentIndi.name && (currentIndi.given || currentIndi.surname)) {
      currentIndi.name = [currentIndi.given, currentIndi.surname]
        .filter(Boolean)
        .join(" ");
    }
    if (currentIndi.name) individuals.push(currentIndi);
  }

  return { individuals, familiesCount, eventsCount };
};

const importGedcom = async (req, res) => {
  let uploadedPath = null;
  try {
    const treeId = Number(req.params.treeId);
    if (!treeId || isNaN(treeId)) {
      return res.status(400).json({ message: "Invalid tree ID" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "GEDCOM file is required" });
    }

    // Verify ownership/permissions
    const tree = await prisma.familyTree.findUnique({ where: { id: treeId } });
    if (!tree) {
      if (req.file) safeUnlink(req.file.path);
      return res.status(404).json({ message: "Tree not found" });
    }

    // Check permissions (assuming req.user is populated by auth middleware)
    const isOwner = Number(tree.userId) === Number(req.user.id);
    const canManageAll = req.user.permissions?.includes("manage_all_trees");
    if (!isOwner && !canManageAll) {
      if (req.file) safeUnlink(req.file.path);
      return res.status(403).json({ message: "Forbidden" });
    }

    // Determine storage path
    ensureUploadDirs(TREE_UPLOADS_DIR, PRIVATE_TREE_UPLOADS_DIR);
    let finalPath = `/uploads/trees/${req.file.filename}`;

    if (!tree.isPublic) {
      const src = req.file.path; // Multer saves to uploads/trees by default (configured in treeController)
      const dest = path.join(PRIVATE_TREE_UPLOADS_DIR, req.file.filename);
      // If multer config saved it to TREE_UPLOADS_DIR, move it
      // We need to check where multer put it.
      // In treeController.js, storage is set to TREE_UPLOADS_DIR.
      // So we move it if private.
      safeMoveFile(src, dest);
      finalPath = `private/trees/${req.file.filename}`;
    }
    uploadedPath = finalPath;

    // Parse Content
    const resolvedPath = resolveStoredFilePath(finalPath);
    const content = fs.readFileSync(resolvedPath, "utf8"); // Encoding handling: auto-detect not easy in node without libs, assuming utf8 or latin1 compatible
    const { individuals, familiesCount, eventsCount } = parseGedcom(content);

    // Transaction: Update Tree Path + Replace People
    await prisma.$transaction(async (tx) => {
      // 1. Update Tree Link
      await tx.familyTree.update({
        where: { id: treeId },
        data: { gedcomPath: finalPath },
      });

      // 2. Clear existing people
      await tx.person.deleteMany({ where: { treeId } });

      // 3. Bulk Insert People (Chunked)
      if (individuals.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < individuals.length; i += chunkSize) {
          const chunk = individuals.slice(i, i + chunkSize);
          await tx.person.createMany({
            data: chunk.map((p) => ({
              treeId,
              name: p.name ? p.name.substring(0, 190) : "Unknown",
            })),
          });
        }
      }
    });

    // Clean up OLD file if it was different
    if (tree.gedcomPath && tree.gedcomPath !== finalPath) {
      safeUnlink(resolveStoredFilePath(tree.gedcomPath));
    }

    res.json({
      success: true,
      counts: {
        individuals: individuals.length,
        families: familiesCount,
        events: eventsCount,
      },
      message: "GEDCOM imported successfully",
    });
  } catch (err) {
    if (uploadedPath) safeUnlink(resolveStoredFilePath(uploadedPath));
    console.error("GEDCOM Import Failed:", err);
    return res
      .status(500)
      .json({ message: "Import failed", error: err.message });
  }
};

const exportGedcom = async (req, res) => {
  try {
    const treeId = Number(req.params.treeId);
    if (!treeId) return res.status(400).json({ message: "Invalid tree ID" });

    const tree = await prisma.familyTree.findUnique({
      where: { id: treeId },
      select: {
        id: true,
        userId: true,
        isPublic: true,
        gedcomPath: true,
        title: true,
      },
    });

    if (!tree) return res.status(404).json({ message: "Tree not found" });

    // Access Control
    const isOwner = req.user && Number(tree.userId) === Number(req.user.id);
    const canManageAll = req.user?.permissions?.includes("manage_all_trees");

    // If public, anyone can export? Usually yes, or at least logged in users.
    // User requirements didn't specify, but existing downloadPublicGedcom implies public access.
    // If the route is mounted under /api/trees/:id/gedcom/export, we assume auth is handled by middleware if needed.
    // But for safety:
    if (!tree.isPublic && !isOwner && !canManageAll) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const filePath = resolveStoredFilePath(tree.gedcomPath);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "GEDCOM file not found" });
    }

    const filename = `tree-${treeId}.ged`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error("GEDCOM Export Failed:", err);
    res.status(500).json({ message: "Export failed" });
  }
};

module.exports = {
  importGedcom,
  exportGedcom,
  treeUpload, // Re-export for route usage
};
