import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Archive,
  Download,
  Eye,
  FileText,
  Network,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useThemeStore } from "../../store/theme";

import { api } from "../../api/client";
import {
  getApiErrorMessage,
  requestWithFallback,
  shouldFallbackRoute,
} from "../../api/helpers";

import { useTranslation } from "../../context/TranslationContext";

import Toast from "../../components/Toast";
import ErrorBoundary from "../../components/ErrorBoundary";

import TreesBuilder, {
  buildGedcom,
  parseGedcom,
} from "../components/TreesBuilder";

import { useAuth } from "../components/AuthContext";

const MAX_GEDCOM_BYTES = 50 * 1024 * 1024;

const normalizeOwner = (tree) => {
  if (!tree) return tree;

  const ownerRaw = tree.owner ?? tree.owner_name ?? "";

  const owner =
    ownerRaw && typeof ownerRaw === "object"
      ? ownerRaw.fullName || ownerRaw.email || ""
      : ownerRaw || "";

  return { ...tree, owner };
};

const buildMockTrees = () =>
  Array.from({ length: 10 }).map((_, i) => ({
    id: `mock-tree-${i}`,
    title: `Family Tree of Clan ${i + 1}`,
    description: `A mock tree with 20 members for testing.`,
    owner: "kameladmin",
    isPublic: i % 2 === 0,
    hasGedcom: true,
    createdAt: new Date().toISOString(),
  }));

export default function Trees() {
  const { theme } = useThemeStore();

  const { locale, t } = useTranslation();

  const { user } = useAuth();

  const isDark = theme === "dark";

  const isAdmin = user?.role === 1;

  const pageBg = isDark ? "bg-[#3e2723]" : "bg-[#f5f1e8]";
  const text = isDark ? "text-white" : "text-[#6c5249]";
  const card = isDark ? "bg-[#3e2723]" : "bg-white";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const metaPanel = isDark
    ? "bg-white/5 border-white/10"
    : "bg-[#5d4037]/5 border-[#e8dfca]/80";

  const hoverRow = isDark ? "hover:bg-white/5" : "hover:bg-black/[0.02]";

  const inputBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const inputText = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";

  const [tab, setTab] = useState("my"); // my | public

  const [q, setQ] = useState("");

  const [myTrees, setMyTrees] = useState([]);

  const [publicTrees, setPublicTrees] = useState([]);

  const [loadingTrees, setLoadingTrees] = useState(true);

  const [treesError, setTreesError] = useState("");

  const [selectedTree, setSelectedTree] = useState(null);

  const [selectedScope, setSelectedScope] = useState(null); // "my" | "public" | null

  const [loadingGedcom, setLoadingGedcom] = useState(false);

  const [gedcomError, setGedcomError] = useState("");

  const [people, setPeople] = useState([]);

  const [treeForm, setTreeForm] = useState({
    title: "",

    description: "",

    archiveSource: "",

    documentCode: "",

    isPublic: false,
  });

  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] = useState("");

  const [saveSuccess, setSaveSuccess] = useState("");

  const [autoSaveNotice, setAutoSaveNotice] = useState("");

  const [autoSaving, setAutoSaving] = useState(false);

  const [deletingTree, setDeletingTree] = useState(false);

  const autoSaveTimerRef = useRef(null);

  const autoSavePeopleRef = useRef(null);

  const autoSaveInFlightRef = useRef(false);

  const peopleDirtyRef = useRef(false);

  const refreshLists = useCallback(async ({ notify = false } = {}) => {
    setLoadingTrees(true);

    setTreesError("");
    setSaveError("");

    const isMock =
      import.meta.env.DEV &&
      localStorage.getItem("mockupDataActive") === "true";

    const mockTrees = isMock ? buildMockTrees() : [];

    const mergeById = (list) => {
      const map = new Map();

      list.forEach((t) => {
        if (!t) return;

        map.set(String(t.id), t);
      });

      return Array.from(map.values());
    };

    let loadError = "";

    try {
      const shouldFallbackAdminRead = (err) =>
        shouldFallbackRoute(err) ||
        err?.response?.status === 401 ||
        err?.response?.status === 403 ||
        err?.response?.status === 500;

      const myRequest = isAdmin
        ? () =>
            requestWithFallback(
              [() => api.get("/admin/trees"), () => api.get("/my/trees")],
              shouldFallbackAdminRead
            )
        : () => api.get("/my/trees");

      const [mineRes, pubRes] = await Promise.allSettled([
        myRequest(),
        api.get("/trees"),
      ]);

      if (mineRes.status === "fulfilled") {
        const mine = mineRes.value?.data;

        const myList = mergeById([
          ...(Array.isArray(mine) ? mine.map(normalizeOwner) : []),

          ...mockTrees,
        ]);

        setMyTrees(myList);
      } else if (isMock) {
        setMyTrees((prev) =>
          Array.isArray(prev) && prev.length ? prev : mockTrees
        );
      }

      if (pubRes.status === "fulfilled") {
        const pub = pubRes.value?.data;

        const publicList = mergeById([
          ...(Array.isArray(pub) ? pub.map(normalizeOwner) : []),

          ...mockTrees.filter((t) => t.isPublic),
        ]);

        setPublicTrees(publicList);
      } else if (isMock) {
        setPublicTrees((prev) =>
          Array.isArray(prev) && prev.length
            ? prev
            : mockTrees.filter((t) => t.isPublic)
        );
      }

      const err =
        mineRes.status === "rejected"
          ? mineRes.reason
          : pubRes.status === "rejected"
          ? pubRes.reason
          : null;

      if (err) {
        loadError = getApiErrorMessage(err, "Failed to load trees");
        setTreesError(loadError);
        setSaveError(loadError);
      } else if (notify) {
        setSaveSuccess(t("trees_loaded", "Trees loaded."));
      }
    } finally {
      setLoadingTrees(false);
    }
  }, [isAdmin, t]);

  useEffect(() => {
    void refreshLists({ notify: true });
  }, [refreshLists]);

  useEffect(() => {
    if (!saveSuccess) return;

    const timer = setTimeout(() => setSaveSuccess(""), 3500);

    return () => clearTimeout(timer);
  }, [saveSuccess]);

  useEffect(() => {
    if (!saveError) return;

    const timer = setTimeout(() => setSaveError(""), 5000);

    return () => clearTimeout(timer);
  }, [saveError]);

  useEffect(() => {
    if (!autoSaveNotice) return;

    const timer = setTimeout(() => setAutoSaveNotice(""), 2500);

    return () => clearTimeout(timer);
  }, [autoSaveNotice]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedTree) {
      setTreeForm({
        title: "",
        description: "",
        archiveSource: "",
        documentCode: "",
        isPublic: false,
      });

      setSelectedScope(null);

      return;
    }

    setTreeForm({
      title: selectedTree.title || "",

      description: selectedTree.description || "",

      archiveSource: selectedTree.archiveSource || "",

      documentCode: selectedTree.documentCode || "",

      isPublic: !!selectedTree.isPublic,
    });
  }, [selectedTree]);

  useEffect(() => {
    autoSavePeopleRef.current = null;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = null;
    }

    peopleDirtyRef.current = false;
  }, [selectedTree?.id, tab]);

  const trees = tab === "public" ? publicTrees : myTrees;

  const canUpdateSelected =
    selectedTree &&
    !String(selectedTree.id).startsWith("mock-") &&
    (selectedScope === "my" || isAdmin);

  const builderReadOnly = !!selectedTree && !canUpdateSelected;

  const filteredTrees = useMemo(() => {
    const query = q.trim().toLowerCase();

    if (!query) return trees;

    return trees.filter((tree) => {
      const title = String(tree.title || "").toLowerCase();

      const ownerRaw = tree.owner ?? tree.owner_name ?? "";

      const ownerValue =
        ownerRaw && typeof ownerRaw === "object"
          ? ownerRaw.fullName || ownerRaw.email || ""
          : ownerRaw || "";

      const owner = String(ownerValue).toLowerCase();

      return title.includes(query) || owner.includes(query);
    });
  }, [trees, q]);

  const upsertTree = (list, patch) => {
    const id = String(patch?.id);

    const existing = list.find((t) => String(t?.id) === id) || null;

    const merged = existing ? { ...existing, ...patch } : patch;

    return [merged, ...list.filter((t) => String(t?.id) !== id)];
  };

  const applyTreeUpdate = ({
    id,

    title,

    description,

    isPublic,

    hasGedcom,

    archiveSource,

    documentCode,
  }) => {
    const patch = {
      id,

      title,

      description: description ?? "",

      archiveSource: archiveSource ?? "",

      documentCode: documentCode ?? "",

      isPublic: !!isPublic,

      updatedAt: new Date().toISOString(),
    };

    if (hasGedcom !== undefined) patch.hasGedcom = !!hasGedcom;

    setMyTrees((prev) => upsertTree(prev, patch));

    setPublicTrees((prev) => {
      const without = prev.filter((t) => String(t.id) !== String(id));

      if (!isPublic) return without;

      const existing = prev.find((t) => String(t.id) === String(id)) || {};

      return upsertTree(without, { ...existing, ...patch });
    });

    setSelectedTree((prev) => {
      if (!prev) return prev;

      if (String(prev.id) !== String(id)) return prev;

      return { ...prev, ...patch };
    });
  };

  const openTree = async (tree) => {
    setSelectedScope(tab);

    setSelectedTree(tree);

    peopleDirtyRef.current = false;

    setGedcomError("");

    setLoadingGedcom(true);

    try {
    if (!tree?.hasGedcom) {
      setPeople([]);

      peopleDirtyRef.current = false;

      setSaveSuccess(t("tree_loaded", "Tree loaded."));

      return;
    }

      if (String(tree.id).startsWith("mock-")) {
        // GENERATE REALISTIC ARABIC FAMILY MEMBERS

        const familyName = tree.title.split(" ").pop(); // e.g., "Al-Fulan"

        const mockPeople = [
          // Grandfather (Gen 0)

          {
            id: "m1",
            names: { en: `Ahmed ${familyName}`, ar: `أحمد ${familyName}` },
            gender: "Male",
            birthYear: "1920",
            details: "The patriarch.",
            color: "#f8f5ef",
            children: ["m3", "m4"],
            spouse: "m2",
          },

          {
            id: "m2",
            names: { en: `Fatima ${familyName}`, ar: `فاطمة ${familyName}` },
            gender: "Female",
            birthYear: "1925",
            details: "Matriarch.",
            color: "#f8f5ef",
            children: ["m3", "m4"],
            spouse: "m1",
          },

          // Children (Gen 1)

          {
            id: "m3",
            names: { en: `Omar ${familyName}`, ar: `عمر ${familyName}` },
            gender: "Male",
            birthYear: "1950",
            details: "Eldest son.",
            color: "#f8f5ef",
            father: "m1",
            mother: "m2",
            children: ["m5", "m6"],
            spouse: "s1",
          },

          {
            id: "m4",
            names: { en: `Layla ${familyName}`, ar: `ليلى ${familyName}` },
            gender: "Female",
            birthYear: "1955",
            details: "Daughter.",
            color: "#f8f5ef",
            father: "m1",
            mother: "m2",
            children: ["m7"],
            spouse: "s2",
          },

          // Spouses (Gen 1)

          {
            id: "s1",
            names: { en: "Amina Al-Jazairi", ar: "آمنة الجزائري" },
            gender: "Female",
            birthYear: "1952",
            details: "Wife of Omar.",
            color: "#f8f5ef",
            spouse: "m3",
            children: ["m5", "m6"],
          },

          {
            id: "s2",
            names: { en: "Youssef Al-Tunisi", ar: "يوسف التونسي" },
            gender: "Male",
            birthYear: "1950",
            details: "Husband of Layla.",
            color: "#f8f5ef",
            spouse: "m4",
            children: ["m7"],
          },

          // Grandchildren (Gen 2)

          {
            id: "m5",
            names: { en: `Khaled ${familyName}`, ar: `خالد ${familyName}` },
            gender: "Male",
            birthYear: "1980",
            details: "Grandson.",
            color: "#f8f5ef",
            father: "m3",
            mother: "s1",
          },

          {
            id: "m6",
            names: { en: `Zainab ${familyName}`, ar: `زينب ${familyName}` },
            gender: "Female",
            birthYear: "1985",
            details: "Granddaughter.",
            color: "#f8f5ef",
            father: "m3",
            mother: "s1",
          },

          {
            id: "m7",
            names: { en: `Hassan Al-Tunisi`, ar: `حسن التونسي` },
            gender: "Male",
            birthYear: "1982",
            details: "Grandson.",
            color: "#f8f5ef",
            father: "s2",
            mother: "m4",
          },
        ];

        setPeople(mockPeople);

        peopleDirtyRef.current = false;

        setSaveSuccess(t("tree_loaded", "Tree loaded."));

        setLoadingGedcom(false);

        return;
      }

      const endpoint =
        tab === "public"
          ? `/trees/${tree.id}/gedcom`
          : `/my/trees/${tree.id}/gedcom`;

      const res = await api.get(endpoint, { responseType: "text" });

      setPeople(parseGedcom(res.data));

      peopleDirtyRef.current = false;

      setSaveSuccess(t("tree_loaded", "Tree loaded."));
    } catch (err) {
      setPeople([]);

      setGedcomError(getApiErrorMessage(err, "Failed to load tree file"));

      peopleDirtyRef.current = false;
      setSaveError(getApiErrorMessage(err, "Failed to load tree file"));
    } finally {
      setLoadingGedcom(false);
    }
  };

  const shouldFallbackTreeWrite = (err) =>
    shouldFallbackRoute(err) || err?.response?.status === 500;

  const submitTree = async ({
    treeId,

    title,

    description,

    archiveSource,

    documentCode,

    isPublic,

    people = [],

    includeFile = true,
  }) => {
    const safeTitle = String(title || "").trim();

    if (!safeTitle) throw new Error("Title is required");

    const fd = new FormData();

    fd.append("title", safeTitle);

    fd.append("description", String(description || ""));

    const archiveValue = String(archiveSource || "").trim();
    if (archiveValue) fd.append("archiveSource", archiveValue);

    const documentValue = String(documentCode || "").trim();
    if (documentValue) fd.append("documentCode", documentValue);

    fd.append("isPublic", String(!!isPublic));

    if (includeFile) {
      const safePeople = Array.isArray(people) ? people : [];

      let gedcom = "";
      try {
        gedcom = buildGedcom(safePeople, locale, t);
      } catch (err) {
        throw new Error(
          err?.message || t("gedcom_build_failed", "Failed to build GEDCOM")
        );
      }

      const blob = new Blob([gedcom], { type: "text/plain" });
      if (blob.size > MAX_GEDCOM_BYTES) {
        throw new Error(t("file_too_large", "File is too large (max 50MB)."));
      }

      const fileName = `${safeTitle}.ged`;
      if (typeof File === "function") {
        const file = new File([blob], fileName, { type: "text/plain" });
        fd.append("file", file);
      } else {
        fd.append("file", blob, fileName);
      }
    }

    if (treeId) {
      await requestWithFallback(
        [
          () => api.put(`/my/trees/${treeId}`, fd),
          () => api.post(`/my/trees/${treeId}/save`, fd),
        ],
        shouldFallbackTreeWrite
      );
      return treeId;
    }

    const { data } = await requestWithFallback(
      [() => api.post("/my/trees", fd)],
      shouldFallbackTreeWrite
    );

    return data?.id;
  };

  const downloadTreeFile = async (tree, scope) => {
    if (!tree?.id) return;
    const endpoint =
      scope === "public"
        ? `/trees/${tree.id}/gedcom`
        : `/my/trees/${tree.id}/gedcom`;

    try {
      const res = await api.get(endpoint, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = String(tree.title || "tree").trim() || "tree";
      const fileName = `${safeTitle.replace(/[^\w-]+/g, "_")}.ged`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveError(
        getApiErrorMessage(err, t("download_failed", "Download failed"))
      );
    }
  };

  const runAutoSave = async () => {
    if (!canUpdateSelected) return;

    const pending = autoSavePeopleRef.current;

    if (!Array.isArray(pending)) return;

    if (autoSaveInFlightRef.current || saving) return;

    const tree = selectedTree;

    if (!tree) return;

    const nextTitle = String(treeForm.title || tree.title || "").trim();

    if (!nextTitle) return;

    const nextDescription =
      treeForm.description !== undefined && treeForm.description !== null
        ? String(treeForm.description)
        : String(tree.description || "");

    const nextIsPublic =
      treeForm.isPublic !== undefined && treeForm.isPublic !== null
        ? !!treeForm.isPublic
        : !!tree.isPublic;

    autoSaveInFlightRef.current = true;

    setAutoSaving(true);

    setSaveError("");

    try {
      const treeId = await submitTree({
        treeId: tree.id,

        title: nextTitle,

        description: nextDescription,

        archiveSource: treeForm.archiveSource || "",

        documentCode: treeForm.documentCode || "",

        isPublic: nextIsPublic,

        people: pending,

        includeFile: true,
      });

      if (treeId) {
        applyTreeUpdate({
          id: treeId,

          title: nextTitle,

          description: nextDescription,

          archiveSource: treeForm.archiveSource || "",

          documentCode: treeForm.documentCode || "",

          isPublic: nextIsPublic,

          hasGedcom: true,
        });

        setAutoSaveNotice(t("auto_saved", "Auto-saved."));

        peopleDirtyRef.current = false;

        autoSavePeopleRef.current = null;
      }
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Auto-save failed"));
    } finally {
      autoSaveInFlightRef.current = false;

      setAutoSaving(false);
    }
  };

  const scheduleAutoSave = (nextPeople) => {
    if (!canUpdateSelected) return;

    peopleDirtyRef.current = true;

    autoSavePeopleRef.current = nextPeople;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      void runAutoSave();
    }, 800);
  };

  const clearCanvas = () => {
    setSelectedTree(null);

    setSelectedScope(null);

    setPeople([]);

    setGedcomError("");

    peopleDirtyRef.current = false;
  };

  const saveCurrentAsTree = async () => {
    setSaveError("");

    setSaveSuccess("");

    const isUpdateMode = Boolean(canUpdateSelected && selectedTree?.id);

    const hasPeople = people.length > 0;

    const title = String(treeForm.title || "").trim();

    if (!title) {
      setSaveError(t("tree_title_required", "Tree title is required."));

      return;
    }

    if (!hasPeople && !isUpdateMode) {
      const confirmed = window.confirm(
        t("save_empty_tree_confirm", "Save this tree without any people yet?")
      );

      if (!confirmed) return;
    }

    const description = String(treeForm.description || "");

    const isPublic = !!treeForm.isPublic;

    setSaving(true);

    try {
      const includeFile = isUpdateMode ? peopleDirtyRef.current : hasPeople;

      const nextHasGedcom = includeFile
        ? true
        : isUpdateMode
        ? selectedTree?.hasGedcom
        : false;

      const treeId = await submitTree({
        treeId: canUpdateSelected ? selectedTree?.id : null,

        title,

        description,

        archiveSource: treeForm.archiveSource || "",

        documentCode: treeForm.documentCode || "",

        isPublic,

        people,

        includeFile,
      });

      if (treeId) {
        applyTreeUpdate({
      id: treeId,

      title,

      description,

      archiveSource: treeForm.archiveSource || "",

      documentCode: treeForm.documentCode || "",

      isPublic,

      hasGedcom: nextHasGedcom,
    });

        setTab("my");

        setSaveSuccess(
          t(
            isUpdateMode ? "tree_updated" : "tree_saved",

            isUpdateMode ? "Tree updated." : "Tree saved."
          )
        );

        if (!canUpdateSelected) {
          setSelectedTree({
            id: treeId,

            title,

            description,

            archiveSource: treeForm.archiveSource || "",

            documentCode: treeForm.documentCode || "",

            isPublic,

            hasGedcom: nextHasGedcom,
          });

          setSelectedScope("my");
        }

        peopleDirtyRef.current = false;
      }

      await refreshLists();
    } catch (err) {
      setSaveError(getApiErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteTree = async () => {
    if (!canUpdateSelected || !selectedTree) return;

    const shouldDelete = window.confirm(
      t(
        "confirm_delete_tree",

        "Delete this tree? This action cannot be undone."
      )
    );

    if (!shouldDelete) return;

    const deletedId = selectedTree.id;

    setDeletingTree(true);

    setSaveError("");

    setSaveSuccess("");

    try {
      await api.delete(`/my/trees/${selectedTree.id}`);

      setMyTrees((prev) =>
        prev.filter((t) => String(t.id) !== String(deletedId))
      );

      setPublicTrees((prev) =>
        prev.filter((t) => String(t.id) !== String(deletedId))
      );

      setSelectedTree(null);

      setSelectedScope(null);

      setPeople([]);

      peopleDirtyRef.current = false;

      await refreshLists();

      setTab("my");

      setSaveSuccess(t("tree_deleted", "Tree deleted."));
    } catch (err) {
      if (err?.response?.status === 404) {
        setMyTrees((prev) =>
          prev.filter((t) => String(t.id) !== String(deletedId))
        );

        setPublicTrees((prev) =>
          prev.filter((t) => String(t.id) !== String(deletedId))
        );

        setSelectedTree(null);
        setSelectedScope(null);
        setPeople([]);
        peopleDirtyRef.current = false;
        await refreshLists();
        setTab("my");
        setSaveSuccess(t("tree_deleted", "Tree deleted."));
        return;
      }
      setSaveError(
        getApiErrorMessage(err, t("delete_failed", "Delete failed"))
      );
    } finally {
      setDeletingTree(false);
    }
  };

  const saveToast = saveError || saveSuccess;

  const saveToastTone = saveError ? "error" : "success";

  return (
    <div className={`p-4 min-h-screen ${pageBg} ${text} heritage-page-root`}>
      <Toast message={saveToast} tone={saveToastTone} />

      <div
        className={`rounded-lg p-5 mb-6 border ${border}

        bg-gradient-to-r from-[#3e2723]/10 to-[#556b2f]/10 heritage-panel heritage-panel--accent`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-[#5d4037]" />

            <div>
              <h3 className="text-2xl font-bold">
                {t("trees_builder", "Family Tree Builder")}
              </h3>

              <p className="opacity-70">
                {t(
                  "trees_builder_desc",
                  "Public trees are visible to everyone; private trees are only for you."
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`px-4 py-2 rounded-md border ${border} hover:opacity-90 inline-flex items-center gap-2`}
              onClick={() => void refreshLists({ notify: true })}
              disabled={loadingTrees}
            >
              <RefreshCcw className="w-4 h-4" />

              {t("refresh", "Refresh")}
            </button>
          </div>
        </div>

        {treesError || gedcomError ? (
          <div
            className={`mt-4 rounded-lg border ${border} ${card} p-4 heritage-panel`}
          >
            {treesError ? (
              <div className="text-[#a0552a] font-semibold">{treesError}</div>
            ) : null}

            {gedcomError ? (
              <div className="text-[#a0552a] font-semibold">{gedcomError}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <div className="space-y-4">
          <div
            className={`rounded-lg border ${border} ${card} p-4 heritage-panel`}
          >
            <div className="font-bold mb-2">
              {selectedTree
                ? t("tree_details", "Tree Details")
                : t("new_tree", "New Tree")}
            </div>

            <div className="space-y-2">
              <input
                value={treeForm.title}
                onChange={(e) =>
                  setTreeForm((s) => ({ ...s, title: e.target.value }))
                }
                placeholder={t("tree_title", "Tree title")}
                className={`heritage-input w-full px-3 py-2 rounded-md border ${border} ${inputBg} ${inputText}`}
              />

              <textarea
                value={treeForm.description}
                onChange={(e) =>
                  setTreeForm((s) => ({ ...s, description: e.target.value }))
                }
                placeholder={t("description", "Description (optional)")}
                rows={3}
                className={`heritage-input w-full px-3 py-2 rounded-md border ${border} ${inputBg} ${inputText}`}
              />

              <input
                value={treeForm.archiveSource}
                onChange={(e) =>
                  setTreeForm((s) => ({ ...s, archiveSource: e.target.value }))
                }
                placeholder={t("archive_source", "Archive Source (optional)")}
                className={`heritage-input w-full px-3 py-2 rounded-md border ${border} ${inputBg} ${inputText}`}
              />

              <input
                value={treeForm.documentCode}
                onChange={(e) =>
                  setTreeForm((s) => ({ ...s, documentCode: e.target.value }))
                }
                placeholder={t("document_code", "Document Code (optional)")}
                className={`heritage-input w-full px-3 py-2 rounded-md border ${border} ${inputBg} ${inputText}`}
              />

              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={treeForm.isPublic}
                  onChange={(e) =>
                    setTreeForm((s) => ({ ...s, isPublic: e.target.checked }))
                  }
                  className={`h-4 w-4 rounded border ${border}`}
                />

                <span>
                  {treeForm.isPublic
                    ? t("public", "Public")
                    : t("private", "Private")}
                </span>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="heritage-btn inline-flex items-center gap-2 px-4 py-2 rounded-md disabled:opacity-60"
                onClick={() => void saveCurrentAsTree()}
                disabled={saving || loadingGedcom || deletingTree}
              >
                <Save className="w-4 h-4" />

                {saving
                  ? t("saving", "Saving...")
                  : canUpdateSelected
                  ? t("update_tree", "Update Tree")
                  : t("save_tree", "Save Tree")}
              </button>

              <button
                type="button"
                className={`heritage-btn heritage-btn--ghost px-4 py-2 rounded-md border ${border} inline-flex items-center gap-2`}
                onClick={clearCanvas}
                disabled={saving || loadingGedcom}
                title={t("clear_canvas", "Clear canvas")}
              >
                <Trash2 className="w-4 h-4" />

                {t("clear", "Clear")}
              </button>

              {canUpdateSelected && selectedTree ? (
                <button
                  type="button"
                  className={`heritage-btn heritage-btn--ghost px-4 py-2 rounded-md border ${border} text-sm font-semibold inline-flex items-center gap-2`}
                  onClick={() => void deleteTree()}
                  disabled={
                    deletingTree || saving || loadingGedcom || autoSaving
                  }
                >
                  <X className="w-4 h-4" />

                  {deletingTree
                    ? t("deleting", "Deleting...")
                    : t("delete_tree", "Delete Tree")}
                </button>
              ) : null}
            </div>

            {autoSaving ? (
              <div className="text-xs opacity-70 mt-2">
                {t("auto_saving", "Auto-saving...")}
              </div>
            ) : autoSaveNotice ? (
              <div className="text-xs opacity-70 mt-2">{autoSaveNotice}</div>
            ) : null}
          </div>

          <div
            className={`rounded-lg border ${border} ${card} p-4 heritage-panel`}
          >
            <div className="grid grid-cols-2 gap-2 mb-3 max-w-md">
              <button
                type="button"
                className={`heritage-btn heritage-btn--ghost px-3 py-2 rounded-md border text-sm font-semibold ${border} ${
                  tab === "my"
                    ? "bg-[#6c5249] text-white border-transparent"
                    : hoverRow
                }`}
                onClick={() => setTab("my")}
              >
                {t("my_trees", "My Trees")}
              </button>

              <button
                type="button"
                className={`heritage-btn heritage-btn--ghost px-3 py-2 rounded-md border text-sm font-semibold ${border} ${
                  tab === "public"
                    ? "bg-[#6c5249] text-white border-transparent"
                    : hoverRow
                }`}
                onClick={() => setTab("public")}
              >
                {t("public_trees", "Public Trees")}
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute rtl:right-3 rtl:left-auto ltr:left-3 top-1/2 -translate-y-1/2 opacity-60" />

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`heritage-input w-full rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 rounded-md border

                focus:outline-none focus:ring-2 focus:ring-[#6c5249]/25
                ${inputBg} ${inputText} ${border}`}
                placeholder={t("search_trees", "Search trees...")}
              />
            </div>

            {loadingTrees ? (
              <div className="py-8 text-center opacity-70">
                {t("loading", "Loading...")}
              </div>
            ) : filteredTrees.length === 0 ? (
              <div className="py-8 text-center opacity-70">
                {t("no_trees_found", "No trees found.")}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-auto pr-1">
                {filteredTrees.map((tree) => {
                  const active = selectedTree?.id === tree.id;
                  const canDownload =
                    Number.isFinite(Number(tree.id)) && tree.hasGedcom;

                  return (
                    <div
                      key={tree.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => void openTree(tree)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void openTree(tree);
                        }
                      }}
                      className={`${card} border ${border} rounded-2xl shadow-lg overflow-hidden transition focus:outline-none focus:ring-2 focus:ring-[#6c5249]/40 ${
                        active
                          ? "ring-2 ring-[#6c5249]/40 border-[#6c5249]/50"
                          : "hover:shadow-xl"
                      }`}
                    >
                      <div className="p-4 border-b border-white/5 bg-gradient-to-r from-[#5d4037]/10 to-transparent">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-[#5d4037] opacity-70">
                              {t("trees", "Family Trees")}
                            </p>
                            <h3 className="text-xl font-bold truncate">
                              {tree.title}
                            </h3>
                            <p className="text-sm opacity-70">
                              {tree.owner || t("unknown", "Unknown")}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${border}`}
                          >
                            {tree.isPublic
                              ? t("public", "Public")
                              : t("private", "Private")}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        <p className="text-sm opacity-80 line-clamp-3">
                          {tree.description ||
                            t("no_description", "No description.")}
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div
                            className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                          >
                            <Archive className="w-4 h-4 text-[#d4af37] mt-0.5" />
                            <div>
                              <p className="text-[10px] uppercase opacity-60">
                                {t("archive_source", "Archive Source")}
                              </p>
                              <p className="text-xs font-semibold break-words">
                                {tree.archiveSource ||
                                  t("not_provided", "Not provided")}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                          >
                            <FileText className="w-4 h-4 text-[#d4af37] mt-0.5" />
                            <div>
                              <p className="text-[10px] uppercase opacity-60">
                                {t("document_code", "Document Code")}
                              </p>
                              <p className="text-xs font-semibold font-mono break-words">
                                {tree.documentCode ||
                                  t("not_provided", "Not provided")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs opacity-70 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {tree.hasGedcom
                            ? t("has_file", "Has file")
                            : t("no_file", "No file")}
                          {loadingGedcom && active ? (
                            <span className="ml-auto">
                              {t("loading", "Loading...")}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void openTree(tree);
                            }}
                            className={`px-4 py-2 rounded-md border ${border} hover:opacity-90 inline-flex items-center gap-2`}
                          >
                            <Eye className="w-4 h-4" />
                            {t("view_tree", "View Tree")}
                          </button>
                        {canDownload ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void downloadTreeFile(tree, tab);
                              }}
                              className="px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              {t("download_gedcom", "Download GEDCOM")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className={`rounded-lg border ${border} ${card} p-4 w-full heritage-panel`}
        >
          <div className="mb-3">
            <div className="font-bold">
              {selectedTree ? selectedTree.title : t("canvas", "Canvas")}
            </div>

            <div className="text-sm opacity-70">
              {selectedTree
                ? selectedTree.description || ""
                : t("canvas_hint", "Import a file or add people to start.")}
            </div>
          </div>

          <ErrorBoundary
            fallback={({ error, reset }) => (
              <div className={`rounded-lg border ${border} ${metaPanel} p-4`}>
                <div className="font-semibold">
                  {t("tree_builder_error", "Tree builder failed to load.")}
                </div>
                <div className="text-sm opacity-70">
                  {error?.message ||
                    t("tree_builder_try_again", "Please try again.")}
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className={`mt-3 inline-flex items-center rounded-md border ${border} px-3 py-1 text-xs font-semibold uppercase tracking-wide`}
                >
                  {t("retry", "Retry")}
                </button>
              </div>
            )}
          >
            <TreesBuilder
              people={people}
              setPeople={setPeople}
              onAutoSave={scheduleAutoSave}
              readOnly={builderReadOnly}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
