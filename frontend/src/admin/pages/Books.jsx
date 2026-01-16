import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Download,
  Trash2,
  X,
  Upload,
} from "lucide-react";
import { useThemeStore } from "../../store/theme";
import { api } from "../../api/client";
import {
  getApiErrorMessage,
  getApiRoot,
  requestWithFallback,
  shouldFallbackRoute,
} from "../../api/helpers";
import { formatDate } from "../utils/helpers";
import { useTranslation } from "../../context/TranslationContext";
import { useAuth } from "../components/AuthContext";
import Toast from "../../components/Toast";

export default function Books() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const isAdmin = user?.role === 1;

  const pageBg = isDark ? "bg-[#3e2723]" : "bg-[#f5f1e8]";
  const text = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const card = isDark ? "bg-[#3e2723]" : "bg-white";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const subtle = isDark ? "bg-white/5" : "bg-[#f8f5ef]";
  const hoverRow = isDark ? "hover:bg-white/5" : "hover:bg-[#f8f5ef]";
  const inputBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const inputText = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const accentText = isDark ? "text-[#d4af37]" : "text-[#5d4037]";
  const softPanel = isDark ? "bg-white/5" : "bg-[#fdf6ea]";

  const maxBookBytes = 50 * 1024 * 1024;
  const maxCoverBytes = 50 * 1024 * 1024;
  const allowedBookExts = new Set([
    "pdf",
    "doc",
    "docx",
    "txt",
    "epub",
    "mobi",
  ]);
  const allowedImageExts = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

  const getExtension = (name) => {
    const parts = String(name || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  };

  const validateBookFile = (file) => {
    if (!file) return t("file_required", "File is required");
    if (file.size > maxBookBytes) {
      return t("file_too_large", "File is too large (max 50MB).");
    }
    const ext = getExtension(file.name);
    if (ext && !allowedBookExts.has(ext)) {
      return t(
        "invalid_book_type",
        "Unsupported file type. Use PDF, DOC, DOCX, TXT, EPUB, or MOBI."
      );
    }
    return "";
  };

  const validateCoverFile = (file) => {
    if (!file) return t("cover_required", "Cover image is required");
    if (file.size > maxCoverBytes) {
      return t("file_too_large", "File is too large (max 50MB).");
    }
    const ext = getExtension(file.name);
    const isImageType = file.type ? file.type.startsWith("image/") : false;
    if (!isImageType && ext && !allowedImageExts.has(ext)) {
      return t("invalid_image_type", "Only image files are allowed.");
    }
    return "";
  };

  const [tab, setTab] = useState("public"); // public | my (non-admin)
  const [q, setQ] = useState("");
  const [adminBooks, setAdminBooks] = useState([]);
  const [myBooks, setMyBooks] = useState([]);
  const [publicBooks, setPublicBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    author: "",
    category: "",
    description: "",
    isPublic: true,
    file: null,
    cover: null,
  });
  const [coverPreview, setCoverPreview] = useState("");
  const [toast, setToast] = useState({ message: "", tone: "success" });

  const notify = useCallback((message, tone = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => {
      setToast({ message: "", tone: "success" });
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.message]);

  const loadBooks = useCallback(async ({ notify: notifyToast = false } = {}) => {
    setLoading(true);
    setError("");
    try {
        const isMock =
          import.meta.env.DEV &&
          localStorage.getItem("mockupDataActive") === "true";
        if (isMock) {
            // REALISTIC ARABIC/ENGLISH/FRENCH HISTORY BOOKS
            const mockBooks = [
                { id: "mb1", title: "Muqaddimah (The Introduction)", author: "Ibn Khaldun", category: "History / Sociology", isPublic: true, downloads: 1240, uploadedBy: "admin", createdAt: new Date().toISOString() },
                { id: "mb2", title: "Kitab al-Ansab (The Book of Genealogies)", author: "Al-Sam'ani", category: "Genealogy", isPublic: true, downloads: 850, uploadedBy: "admin", createdAt: new Date().toISOString() },
                { id: "mb3", title: "Histoire de l'Afrique du Nord", author: "Charles-André Julien", category: "History", isPublic: false, downloads: 320, uploadedBy: "kameladmin", createdAt: new Date().toISOString() },
                { id: "mb4", title: "Jamharat Ansab al-Arab", author: "Ibn Hazm", category: "Genealogy", isPublic: true, downloads: 2100, uploadedBy: "admin", createdAt: new Date().toISOString() },
                { id: "mb5", title: "The Berbers", author: "Michael Brett & Elizabeth Fentress", category: "Anthropology", isPublic: false, downloads: 150, uploadedBy: "kameladmin", createdAt: new Date().toISOString() },
                { id: "mb6", title: "Description de l'Afrique septentrionale", author: "Al-Bakri", category: "Geography / History", isPublic: true, downloads: 670, uploadedBy: "admin", createdAt: new Date().toISOString() },
                { id: "mb7", title: "Genealogy of the Prophet", author: "Unknown", category: "Religious History", isPublic: true, downloads: 5000, uploadedBy: "admin", createdAt: new Date().toISOString() },
                { id: "mb8", title: "L'Algérie ancienne et moderne", author: "Léon Galibert", category: "History", isPublic: false, downloads: 90, uploadedBy: "kameladmin", createdAt: new Date().toISOString() },
                { id: "mb9", title: "Tarikh al-Rusul wa al-Muluk", author: "Al-Tabari", category: "History", isPublic: true, downloads: 1800, uploadedBy: "admin", createdAt: new Date().toISOString() },
                { id: "mb10", title: "Modern History of the Arab World", author: "Cleveland", category: "Modern History", isPublic: false, downloads: 400, uploadedBy: "kameladmin", createdAt: new Date().toISOString() },
            ];
            
            setAdminBooks(mockBooks);
            setMyBooks(mockBooks);
            setPublicBooks(mockBooks.filter(b => b.isPublic));
            if (notifyToast) {
              notify(t("books_loaded", "Books loaded."));
            }
            return;
        }

      const shouldFallbackAdminRead = (err) =>
        shouldFallbackRoute(err) ||
        err?.response?.status === 401 ||
        err?.response?.status === 403 ||
        err?.response?.status === 500;

      if (isAdmin) {
        const res = await requestWithFallback(
          [() => api.get("/admin/books"), () => api.get("/my/books")],
          shouldFallbackAdminRead
        );
        const data = res.data?.success && Array.isArray(res.data?.data) ? res.data.data : res.data;
        setAdminBooks(Array.isArray(data) ? data : []);
      } else {
        const [resMine, resPub] = await Promise.all([
          api.get("/my/books"),
          api.get("/books"),
        ]);
        const mine = resMine.data?.success && Array.isArray(resMine.data?.data) ? resMine.data.data : resMine.data;
        const pub = resPub.data?.success && Array.isArray(resPub.data?.data) ? resPub.data.data : resPub.data;
        setMyBooks(Array.isArray(mine) ? mine : []);
        setPublicBooks(Array.isArray(pub) ? pub : []);
      }
      if (notifyToast) {
        notify(t("books_loaded", "Books loaded."));
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load books");
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, notify, t]);

  useEffect(() => {
    void loadBooks({ notify: true });
  }, [loadBooks]);

  useEffect(() => {
    if (!form.cover) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(form.cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.cover]);

  const books = isAdmin ? adminBooks : tab === "my" ? myBooks : publicBooks;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return books;
    return books.filter((b) => {
      const title = String(b.title || "").toLowerCase();
      const author = String(b.author || "").toLowerCase();
      const category = String(b.category || "").toLowerCase();
      return (
        title.includes(query) || author.includes(query) || category.includes(query)
      );
    });
  }, [books, q]);

  const apiRoot = useMemo(() => getApiRoot(), []);

  const resolveAssetUrl = (value) => {
    const raw = String(value || "");
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/")) return `${apiRoot}${raw}`;
    return `${apiRoot}/${raw}`;
  };

  const coverInitial = (value) =>
    String(value || "").trim().charAt(0).toUpperCase() || "B";

  const openAdd = () => {
    setError("");
    setForm({
      title: "",
      author: "",
      category: "",
      description: "",
      isPublic: isAdmin ? true : false,
      file: null,
      cover: null,
    });
    setShowAdd(true);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const shouldFallbackWrite = (err) =>
        shouldFallbackRoute(err) ||
        err?.response?.status === 401 ||
        err?.response?.status === 403 ||
        err?.response?.status === 500;

      if (!form.title.trim()) {
        const message = t("title_required", "Title is required");
        setError(message);
        notify(message, "error");
        return;
      }
      if (!form.file) {
        const message = t("file_required", "File is required");
        setError(message);
        notify(message, "error");
        return;
      }
      if (!form.cover) {
        const message = t("cover_required", "Cover image is required");
        setError(message);
        notify(message, "error");
        return;
      }

      const fileError = validateBookFile(form.file);
      if (fileError) {
        setError(fileError);
        notify(fileError, "error");
        return;
      }

      const coverError = validateCoverFile(form.cover);
      if (coverError) {
        setError(coverError);
        notify(coverError, "error");
        return;
      }

      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.author.trim()) fd.append("author", form.author.trim());
      if (form.category.trim()) fd.append("category", form.category.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());
      fd.append("isPublic", String(form.isPublic));
      fd.append("file", form.file);
      fd.append("cover", form.cover);

      if (isAdmin) {
        await requestWithFallback(
          [
            () =>
              api.post("/admin/books", fd),
            () =>
              api.post("/my/books", fd),
          ],
          shouldFallbackWrite
        );
      } else {
        await api.post("/my/books", fd);
      }

      setShowAdd(false);
      await loadBooks();
      notify(t("book_uploaded", "Book uploaded."));
      if (!isAdmin) setTab("my");
    } catch (err) {
      const message = getApiErrorMessage(err, "Upload failed");
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openProtected = async (book) => {
    if (!book?.id) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.get(`/my/books/${book.id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      
      // Refresh list to update download count
      void loadBooks();
    } catch (err) {
      const message = getApiErrorMessage(err, "Open failed");
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const downloadProtected = async (book) => {
    if (!book?.id) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.get(`/my/books/${book.id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${String(book.title || "book").trim() || "book"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      
      // Refresh list to update download count
      void loadBooks();
    } catch (err) {
      const message = getApiErrorMessage(err, "Download failed");
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openFile = (book) => {
    const fileUrl = book?.fileUrl;
    if (fileUrl) {
      const url = resolveAssetUrl(fileUrl);
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    void openProtected(book);
  };

  const downloadUrl = (id) => `${apiRoot}/api/books/${id}/download`;

  const deleteBook = async (book) => {
    const ok = window.confirm(
      t("confirm_delete_book", `Delete "${book?.title || "book"}"?`)
    );
    if (!ok) return;

    setSaving(true);
    setError("");
    try {
      const shouldFallbackWrite = (err) =>
        shouldFallbackRoute(err) ||
        err?.response?.status === 401 ||
        err?.response?.status === 403 ||
        err?.response?.status === 500;

      if (isAdmin) {
        await requestWithFallback(
          [
            () => api.delete(`/admin/books/${book.id}`),
            () => api.delete(`/my/books/${book.id}`),
          ],
          shouldFallbackWrite
        );
      } else {
        await api.delete(`/my/books/${book.id}`);
      }
      if (isAdmin) {
        setAdminBooks((prev) => prev.filter((b) => b.id !== book.id));
      } else {
        setMyBooks((prev) => prev.filter((b) => b.id !== book.id));
      }
      void loadBooks();
      notify(t("book_deleted", "Book deleted."));
    } catch (err) {
      if (err?.response?.status === 404) {
        if (isAdmin) {
          setAdminBooks((prev) => prev.filter((b) => b.id !== book.id));
        } else {
          setMyBooks((prev) => prev.filter((b) => b.id !== book.id));
        }
        void loadBooks();
        notify(t("book_deleted", "Book deleted."));
        return;
      }
      const message = getApiErrorMessage(err, "Delete failed");
      setError(message);
      notify(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`p-4 min-h-screen ${pageBg} ${text} heritage-page-root`}>
      <Toast message={toast.message} tone={toast.tone} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-[#5d4037]" />
          <h3 className="text-2xl font-bold">{t("books", "Books")}</h3>
        </div>

        <button
          className="heritage-btn flex items-center gap-2 px-4 py-2 rounded-md shadow
          hover:opacity-95 active:scale-[0.97] disabled:opacity-60"
          type="button"
          onClick={openAdd}
          disabled={saving}
        >
          <Plus className="w-4 h-4" />
          {isAdmin ? t("add_book", "Add Book") : t("upload_book", "Upload Book")}
        </button>
      </div>

      <div className={`rounded-lg p-5 mb-6 border ${border} ${subtle} heritage-panel heritage-panel--accent`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-3">
            <p className="opacity-80">
              {isAdmin
                ? t("books_admin_desc", "Upload and manage your genealogy library.")
                : t(
                    "books_user_desc",
                    "Browse public books or upload private books for your account."
                  )}
            </p>

            {!isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`px-3 py-2 rounded-md border text-sm font-semibold ${border} ${
                    tab === "public"
                      ? "bg-[#5d4037] text-white border-transparent"
                      : hoverRow
                  }`}
                  onClick={() => setTab("public")}
                  disabled={loading}
                >
                  {t("public_books", "Public Books")}
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 rounded-md border text-sm font-semibold ${border} ${
                    tab === "my"
                      ? "bg-[#5d4037] text-white border-transparent"
                      : hoverRow
                  }`}
                  onClick={() => setTab("my")}
                  disabled={loading}
                >
                  {t("my_books", "My Books")}
                </button>
              </div>
            ) : null}
          </div>
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
            className={`heritage-input w-full pl-9 pr-3 py-2 rounded-md border
            focus:outline-none focus:ring-2 focus:ring-[#5d4037]/25
              ${inputBg} ${inputText} ${border}`}
              placeholder={t("search_books", "Search books...")}
            />
          </div>
        </div>
      </div>

      <div className={`rounded-lg border ${border} ${card} overflow-hidden heritage-panel`}>
        {loading ? (
          <div className="p-10 text-center opacity-60">{t("loading", "Loading...")}</div>
        ) : error ? (
          <div className="p-10 text-center">
            <div className="text-[#556b2f] font-semibold">{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center opacity-70">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>{t("no_books_found", "No books found.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="heritage-table w-full text-sm">
              <thead className={subtle}>
                <tr className={`text-start border-b ${border}`}>
                  <th className="py-3 px-4 text-start">{t("title", "Title")}</th>
                  <th className="py-3 px-4 text-start">{t("author", "Author")}</th>
                  <th className="py-3 px-4 text-start">{t("category", "Category")}</th>
                  <th className="py-3 px-4 text-start">{t("public", "Public")}</th>
                  <th className="py-3 px-4 text-start">{t("downloads", "Downloads")}</th>
                  {isAdmin ? (
                    <th className="py-3 px-4 text-start">{t("uploaded_by", "Uploaded By")}</th>
                  ) : null}
                  <th className="py-3 px-4 text-start">{t("date", "Date")}</th>
                  <th className="py-3 px-4 text-end">{t("actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  (() => {
                    const isPublic =
                      typeof b.isPublic === "boolean" ? b.isPublic : tab === "public";
                    const canProtectedAccess = isAdmin || tab === "my";
                    const coverSrc = resolveAssetUrl(b.coverUrl);
                    const initial = coverInitial(b.title);
                    return (
                  <tr key={b.id} className={`border-b ${border} ${hoverRow}`}>
                    <td className="py-3 px-4 text-start">
                      <div className="flex items-center gap-3">
                        {coverSrc ? (
                          <img
                            src={coverSrc}
                            alt={b.title || "Book cover"}
                            className={`h-12 w-9 object-cover rounded-md ${border}`}
                            loading="lazy"
                          />
                        ) : (
                          <div className={`h-12 w-9 rounded-md ${border} bg-gradient-to-br from-[#5d4037]/10 to-[#d4af37]/15 text-[#5d4037] text-xs font-bold flex items-center justify-center`}>
                            {initial}
                          </div>
                        )}
                        <span className="font-semibold">{b.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-start">{b.author || "-"}</td>
                    <td className="py-3 px-4 text-start">{b.category || "-"}</td>
                      <td className="py-3 px-4 text-start">
                        <span
                          className={`heritage-pill ${isPublic ? "heritage-pill--public" : "heritage-pill--private"}`}
                        >
                          {isPublic ? t("yes", "Yes") : t("no", "No")}
                        </span>
                      </td>
                    <td className="py-3 px-4 text-start">{Number(b.downloads) || 0}</td>
                    {isAdmin ? (
                      <td className="py-3 px-4 text-start">{b.uploadedBy || "-"}</td>
                    ) : null}
                    <td className="py-3 px-4 text-start">{formatDate(b.createdAt)}</td>
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        {b.fileUrl || canProtectedAccess ? (
                          <button
                            type="button"
                            className={`px-3 py-2 rounded-md border ${border} hover:opacity-90`}
                            onClick={() => openFile(b)}
                            title="Open file"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        ) : null}
                        {isPublic ? (
                          <a
                            className={`px-3 py-2 rounded-md border ${border} hover:opacity-90 inline-flex`}
                            href={downloadUrl(b.id)}
                            target="_blank"
                            rel="noreferrer"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        ) : canProtectedAccess ? (
                          <button
                            type="button"
                            className={`px-3 py-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                            onClick={() => void downloadProtected(b)}
                            disabled={saving}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        ) : null}

                        {isAdmin || tab === "my" ? (
                          <button
                            type="button"
                            className="px-3 py-2 rounded-md bg-[#a0552a] text-white hover:bg-[#a0552a] disabled:opacity-60"
                            onClick={() => deleteBook(b)}
                            disabled={saving}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => (saving ? null : setShowAdd(false))}
          />
          <div
            className={`relative w-full max-w-4xl rounded-2xl border ${border} ${card} p-5 shadow-2xl heritage-panel max-h-[85vh] overflow-y-auto`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs uppercase tracking-[0.35em] ${accentText} opacity-80`}>
                  {t("upload_book", "Upload Book")}
                </p>
                <h4 className="text-2xl font-bold mt-1">
                  {t("upload_book", "Upload Book")}
                </h4>
                <p className="text-sm opacity-70 max-w-2xl">
                  {t("upload_book_desc", "Add a PDF or document to the library.")}
                </p>
              </div>
              <button
                type="button"
                className={`p-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                onClick={() => setShowAdd(false)}
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              className="mt-4 grid gap-5 lg:grid-cols-[260px_1fr]"
              onSubmit={submitAdd}
            >
              <div className="space-y-4">
                <div className={`rounded-xl border ${border} ${softPanel} p-4`}>
                  <div className={`text-[11px] uppercase tracking-[0.3em] ${accentText}`}>
                    {t("cover_image", "Cover Image")}
                  </div>
                  <div className="mt-3 grid grid-cols-[96px_1fr] gap-3 items-center">
                    <div className={`h-28 w-20 rounded-md border ${border} overflow-hidden bg-gradient-to-br from-[#5d4037]/10 to-[#d4af37]/15 flex items-center justify-center`}>
                      {coverPreview ? (
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-[#5d4037]">
                          {t("add_cover", "Add cover")}
                        </span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          cover: e.target.files?.[0] || null,
                        }))
                      }
                      className={`heritage-input w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                      disabled={saving}
                    />
                  </div>
                </div>

                <label className="block">
                  <span className={`text-[11px] uppercase tracking-[0.3em] ${accentText}`}>
                    {t("file", "File")}
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.epub,.mobi"
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          file: e.target.files?.[0] || null,
                        }))
                      }
                      className={`heritage-input w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                      disabled={saving}
                    />
                    <div className={`p-2 rounded-md border ${border}`}>
                      <Upload className="w-4 h-4 opacity-70" />
                    </div>
                  </div>
                </label>

                <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <span className="text-sm font-medium">
                    {t("public_visible", "Public (visible on website)")}
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, isPublic: e.target.checked }))
                    }
                    className="w-5 h-5"
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold">{t("title", "Title")}</span>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, title: e.target.value }))
                    }
                    required
                    className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                    placeholder="Book title"
                    disabled={saving}
                  />
                </label>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-semibold">{t("author", "Author")}</span>
                    <input
                      value={form.author}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, author: e.target.value }))
                      }
                      className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                      placeholder="Author"
                      disabled={saving}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold">{t("category", "Category")}</span>
                    <input
                      value={form.category}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, category: e.target.value }))
                      }
                      className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                      placeholder="Category"
                      disabled={saving}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold">{t("description", "Description")}</span>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, description: e.target.value }))
                    }
                    className={`heritage-input mt-2 w-full px-3 py-2 rounded-md border ${inputBg} ${inputText} ${border}`}
                    placeholder="Short description"
                    rows={2}
                    disabled={saving}
                  />
                </label>
              </div>

              {error ? (
                <div className="text-sm text-red-500 font-semibold lg:col-span-2">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-1 lg:col-span-2">
                <button
                  type="button"
                  className={`heritage-btn heritage-btn--ghost px-4 py-2 rounded-md border ${border} hover:opacity-90 disabled:opacity-60`}
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                >
                  {t("cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  className="heritage-btn inline-flex items-center gap-2 px-4 py-2 rounded-md disabled:opacity-60"
                  disabled={saving}
                >
                  <Upload className="w-4 h-4" />
                  {saving ? t("uploading", "Uploading...") : t("upload", "Upload")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
