const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma } = require("../lib/prisma");
const { logActivity } = require("../services/activityService");
const { createResetCode } = require("../services/authService");

const listUsers = async (_req, res) => {
  try {
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { role: { select: { name: true } } },
    });
    res.json(
      rows.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        phone: u.phoneNumber,
        email: u.email,
        roleId: u.roleId,
        roleName: u.role?.name,
        status: u.status || "active",
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
      }))
    );
  } catch (err) {
    console.error("Failed to load users:", err.code || "", err.message);
    res.status(500).json({ message: "Failed to load users" });
  }
};

const createUser = async (req, res) => {
  try {
    const { fullName, phone, email, roleId } = req.body;
    const safeEmail = String(email || "").trim().toLowerCase();
    if (!fullName || !safeEmail) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const safeRoleId = roleId ? Number(roleId) : 2;

    const existing = await prisma.user.findUnique({ where: { email: safeEmail } });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const randomPassword = crypto.randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(String(randomPassword), 10);
    const created = await prisma.user.create({
      data: {
        fullName,
        phoneNumber: phone || null,
        email: safeEmail,
        password: passwordHash,
        roleId: safeRoleId,
        status: "active",
      },
    });

    await createResetCode(safeEmail);
    await logActivity(req.user.id, "users", `Created user: ${safeEmail}`);

    res.status(201).json({
      id: created.id,
      fullName,
      phone: phone || null,
      email: safeEmail,
      roleId: safeRoleId,
      status: "active",
    });
  } catch (err) {
    console.error("Create user failed:", err.code || "", err.message);
    res.status(500).json({ message: "Create user failed" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const { fullName, phone, roleId, status } = req.body;
    const data = {};
    if (fullName !== undefined) data.fullName = fullName || null;
    if (phone !== undefined) data.phoneNumber = phone || null;
    if (roleId !== undefined) {
      const nextRoleId = Number(roleId);
      if (!Number.isFinite(nextRoleId) || nextRoleId <= 0) {
        return res.status(400).json({ message: "Invalid role id" });
      }
      data.roleId = nextRoleId;
    }
    if (status !== undefined) data.status = status;

    const result = await prisma.user.updateMany({ where: { id: userId }, data });
    if (!result.count) {
      return res.status(404).json({ message: "User not found" });
    }

    await logActivity(req.user.id, "users", `Updated user #${userId}`);
    res.json({ message: "User updated" });
  } catch (err) {
    console.error("Update user failed:", err.code || "", err.message);
    res.status(500).json({ message: "Update user failed" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (Number(req.user?.id) === Number(userId)) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.book.updateMany({
        where: { uploadedBy: userId },
        data: { uploadedBy: null },
      });
      await tx.familyTree.updateMany({
        where: { userId },
        data: { userId: null },
      });
      try {
        await tx.gallery.updateMany({
          where: { uploadedBy: userId },
          data: { uploadedBy: null },
        });
      } catch {}
      await tx.activityLog.updateMany({
        where: { actorUserId: userId },
        data: { actorUserId: null },
      });
      if (target.email) {
        await tx.passwordReset.deleteMany({ where: { email: target.email } });
      }
      await tx.user.delete({ where: { id: userId } });
    });

    await logActivity(req.user.id, "users", `Deleted user #${userId}`);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user failed:", err.code || "", err.message);
    res.status(500).json({ message: "Delete user failed" });
  }
};

module.exports = { listUsers, createUser, updateUser, deleteUser };
