import { useCallback, useEffect, useMemo, useState } from "react";
import { useThemeStore } from "../../store/theme";
import { useTranslation } from "../../context/TranslationContext";
import { api } from "../../api/client";
import {
  getApiErrorMessage,
  getApiRoot,
  requestWithFallback,
  shouldFallbackRoute,
} from "../../api/helpers";
import {
  Upload,
  Trash2,
  Edit,
  X,
  Save,
  Image as ImageIcon,
  Archive,
  FileText,
  MapPin,
  Calendar,
  Camera,
} from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";
import Toast from "../../components/Toast";

export default function AdminGallery() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const isDark = theme === "dark";
  const apiRoot = useMemo(() => getApiRoot(), []);

  const maxImageBytes = 10 * 1024 * 1024;
  const allowedImageExts = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    isPublic: true,
    archiveSource: "",
    documentCode: "",
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [toast, setToast] = useState({ message: "", tone: "success" });

  const getExtension = (name) => {
    const parts = String(name || "").toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  };

  const validateImageFile = (file, { required = false } = {}) => {
    if (!file) {
      return required ? t("image_required", "Please select an image") : "";
    }
    if (file.size > maxImageBytes) {
      return t("file_too_large", "File is too large (max 10MB).");
    }
    const ext = getExtension(file.name);
    const isImageType = file.type ? file.type.startsWith("image/") : false;
    if (!isImageType && ext && !allowedImageExts.has(ext)) {
      return t("invalid_image_type", "Only image files are allowed.");
    }
    return "";
  };

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

  const resolveImageUrl = (value) => {
    const raw = String(value || "");
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/")) return `${apiRoot}${raw}`;
    return `${apiRoot}/${raw}`;
  };

  const loadGallery = useCallback(async ({ notify: notifyToast = false } = {}) => {
    try {
      setLoading(true);
      const shouldFallbackAdminRead = (err) =>
        shouldFallbackRoute(err) ||
        err?.response?.status === 401 ||
        err?.response?.status === 403 ||
        err?.response?.status === 500;
      const { data } = await requestWithFallback(
        [
          () => api.get("/admin/gallery"),
          () => api.get("/my/gallery"),
          () => api.get("/gallery"),
        ],
        shouldFallbackAdminRead
      );
      const list =
        (data?.success && Array.isArray(data.data) ? data.data : null) ||
        (Array.isArray(data?.gallery) && data.gallery) ||
        (Array.isArray(data) && data) ||
        [];
      setGallery(list);
      if (notifyToast) {
        notify(t("gallery_loaded", "Images loaded."));
      }
    } catch (error) {
      console.error("Failed to load gallery:", error);
      setGallery([]);
      notify(getApiErrorMessage(error, "Failed to load gallery"), "error");
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    loadGallery({ notify: true });
  }, [loadGallery]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      isPublic: true,
      archiveSource: "",
      documentCode: "",
    });
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl("");
    setEditingId(null);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageError = validateImageFile(file);
    if (imageError) {
      notify(imageError, "error");
      e.target.value = "";
      return;
    }

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      isPublic: item.isPublic,
      archiveSource: item.archiveSource || "",
      documentCode: item.documentCode || "",
    });
    setSelectedImage(null);
    setPreviewUrl(resolveImageUrl(item.imagePath));
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      notify(t("fill_required_fields", "Please fill all required fields"), "error");
      return;
    }

    const formData = new FormData();
    const imageError = validateImageFile(selectedImage);
    if (imageError) {
      notify(imageError, "error");
      return;
    }
    if (selectedImage) formData.append("image", selectedImage);
    formData.append("title", form.title.trim());
    if (form.description.trim())
      formData.append("description", form.description.trim());
    formData.append("isPublic", String(form.isPublic));
    if (form.archiveSource.trim())
      formData.append("archiveSource", form.archiveSource.trim());
    if (form.documentCode.trim())
      formData.append("documentCode", form.documentCode.trim());

    const shouldFallbackWrite = (err) =>
      shouldFallbackRoute(err) ||
      err?.response?.status === 401 ||
      err?.response?.status === 403 ||
      err?.response?.status === 500;

    try {
      setUploading(true);

      if (editingId) {
        // Update existing item
        await requestWithFallback(
          [
            () => api.put(`/admin/gallery/${editingId}`, formData),
            () => api.post(`/admin/gallery/${editingId}/save`, formData),
            () => api.put(`/my/gallery/${editingId}`, formData),
            () => api.post(`/my/gallery/${editingId}/save`, formData),
          ],
          shouldFallbackWrite
        );
        notify(t("gallery_updated", "Image updated."));
      } else {
        // Create new item
        if (!selectedImage) {
          notify(t("image_required", "Please select an image"), "error");
          return;
        }
        await requestWithFallback(
          [() => api.post("/admin/gallery", formData), () => api.post("/my/gallery", formData)],
          shouldFallbackWrite
        );
        notify(t("gallery_created", "Image uploaded."));
      }

      resetForm();
      loadGallery();
    } catch (error) {
      console.error("Operation failed:", error);
      notify(
        getApiErrorMessage(
          error,
          t("operation_failed", "Operation failed")
        ),
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        t("confirm_delete", "Are you sure you want to delete this item?")
      )
    ) {
      return;
    }

    try {
      const shouldFallbackWrite = (err) =>
        shouldFallbackRoute(err) ||
        err?.response?.status === 401 ||
        err?.response?.status === 403 ||
        err?.response?.status === 500;
      await requestWithFallback(
        [
          () => api.delete(`/admin/gallery/${id}`),
          () => api.delete(`/my/gallery/${id}`),
        ],
        shouldFallbackWrite
      );
      loadGallery();
      notify(t("gallery_deleted", "Image deleted."));
    } catch (error) {
      console.error("Delete failed:", error);
      notify(getApiErrorMessage(error, t("delete_failed", "Failed to delete")), "error");
    }
  };

  const cardBg = isDark ? "bg-[#2c1810]" : "bg-white";
  const border = isDark ? "border-[#d4af37]/20" : "border-[#5d4037]/20";
  const inputBg = isDark ? "bg-[#3e2723]" : "bg-[#fff9f0]";
  const textColor = isDark ? "text-[#f5f1e8]" : "text-[#2c1810]";
  const viewImageUrl = viewItem?.imagePath
    ? resolveImageUrl(viewItem.imagePath)
    : "";

  return (
    <div
      className={`min-h-screen p-6 ${isDark ? "bg-[#1a0a05]" : "bg-[#f5f1e8]"}`}
    >
      <Toast message={toast.message} tone={toast.tone} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8" data-aos="fade-down">
          <h1
            className={`text-4xl font-bold font-serif ${
              isDark ? "text-[#d4af37]" : "text-[#5d4037]"
            } mb-2`}
          >
            {t("gallery_management", "Gallery Management")}
          </h1>
          <p className={`${textColor} opacity-70`}>
            {t(
              "gallery_desc",
              "Upload and manage photos with archive metadata"
            )}
          </p>
        </div>

        {/* Upload/Edit Form */}
        <div
          className={`${cardBg} border ${border} rounded-xl p-6 mb-8 shadow-lg`}
          data-aos="fade-up"
        >
          <div className="flex items-center justify-between mb-6">
            <h2
              className={`text-2xl font-bold font-serif ${
                isDark ? "text-[#d4af37]" : "text-[#5d4037]"
              } flex items-center gap-2`}
            >
              {editingId ? (
                <>
                  <Edit className="w-6 h-6" />
                  {t("edit_photo", "Edit Photo")}
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  {t("upload_new_photo", "Upload New Photo")}
                </>
              )}
            </h2>
            {editingId && (
              <button
                onClick={resetForm}
                className={`${textColor} opacity-70 hover:opacity-100 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 transition`}
              >
                <X className="w-5 h-5" />
                {t("cancel", "Cancel")}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Preview */}
            <div>
              <label
                className={`block text-sm font-semibold ${textColor} mb-2`}
              >
                {t("select_image", "Select Image")}{" "}
                {!editingId && <span className="text-red-500">*</span>}
              </label>
              <div
                className={`border-2 border-dashed ${border} rounded-lg p-6 text-center cursor-pointer transition hover:border-[#d4af37] hover:bg-[#d4af37]/5`}
                onClick={() => document.getElementById("imageInput").click()}
              >
                {previewUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto object-contain rounded-lg shadow-md"
                    />
                    <p className={`${textColor} text-sm`}>
                      {selectedImage?.name ||
                        t("current_image", "Current Image")}
                    </p>
                  </div>
                ) : (
                  <div className="py-12">
                    <ImageIcon
                      className={`w-16 h-16 mx-auto ${textColor} opacity-20 mb-4`}
                    />
                    <p className={`${textColor} opacity-50 text-lg`}>
                      {t("click_to_upload", "Click to upload image")}
                    </p>
                    <p className={`${textColor} opacity-30 text-sm mt-2`}>
                      JPG, PNG, GIF, WEBP (max 10MB)
                    </p>
                  </div>
                )}
              </div>
              <input
                id="imageInput"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-semibold ${textColor} mb-2`}
                >
                  {t("title", "Title")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border ${border} ${inputBg} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition`}
                  placeholder={t("enter_title", "Enter photo title...")}
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) =>
                    setForm({ ...form, isPublic: e.target.checked })
                  }
                  className="w-5 h-5"
                  id="isPublic"
                />
                <label
                  htmlFor="isPublic"
                  className={`${textColor} cursor-pointer font-medium`}
                >
                  {t("make_public", "Make public (visible to all users)")}
                </label>
              </div>
            </div>

            <div>
              <label
                className={`block text-sm font-semibold ${textColor} mb-2`}
              >
                {t("description", "Description")}
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg border ${border} ${inputBg} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition`}
                placeholder={t("enter_description", "Enter description...")}
                rows={3}
              />
            </div>

            {/* Archive Metadata */}
            <div
              className={`p-6 rounded-lg border-2 border-dashed ${border} space-y-4`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Archive
                  className={`w-5 h-5 ${
                    isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                  }`}
                />
                <h3
                  className={`text-lg font-bold ${
                    isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                  }`}
                >
                  {t("archive_metadata", "Archive Metadata")} (
                  {t("optional", "Optional")})
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-xs font-semibold ${textColor} opacity-80 mb-2 flex items-center gap-2`}
                  >
                    <Archive className="w-4 h-4" />
                    {t("archive_source", "Archive Source")}
                  </label>
                  <input
                    type="text"
                    value={form.archiveSource}
                    onChange={(e) =>
                      setForm({ ...form, archiveSource: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm`}
                    placeholder="e.g. National Archives of Algeria"
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-semibold ${textColor} opacity-80 mb-2 flex items-center gap-2`}
                  >
                    <FileText className="w-4 h-4" />
                    {t("document_code", "Document Code")}
                  </label>
                  <input
                    type="text"
                    value={form.documentCode}
                    onChange={(e) =>
                      setForm({ ...form, documentCode: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm`}
                    placeholder="e.g. ALG-1920-042"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-gradient-to-r from-[#5d4037] to-[#d4af37] text-white py-4 rounded-lg font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {editingId ? (
                <>
                  <Save className="w-6 h-6" />
                  {uploading
                    ? t("saving", "Saving...")
                    : t("save_changes", "Save Changes")}
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  {uploading
                    ? t("uploading", "Uploading...")
                    : t("upload", "Upload Photo")}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Gallery Grid */}
        <div className="mb-4" data-aos="fade-up">
          <h2
            className={`text-2xl font-bold font-serif ${
              isDark ? "text-[#d4af37]" : "text-[#5d4037]"
            }`}
          >
            {t("uploaded_photos", "Uploaded Photos")} ({gallery.length})
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#d4af37] border-t-transparent"></div>
          </div>
        ) : gallery.length === 0 ? (
          <div
            className={`${cardBg} border ${border} rounded-lg p-16 text-center`}
          >
            <ImageIcon
              className={`w-20 h-20 mx-auto ${textColor} opacity-20 mb-6`}
            />
            <p className={`${textColor} text-xl opacity-50`}>
              {t("no_photos_yet", "No photos uploaded yet")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((item, index) => (
              <div
                key={item.id}
                className={`${cardBg} border ${border} rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all group`}
                data-aos="fade-up"
                data-aos-delay={index * 30}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#5d4037]/10 to-[#d4af37]/10">
                    <img
                      src={resolveImageUrl(item.imagePath)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                    onError={(e) => {
                      console.error("Image load error:", item.imagePath);
                      e.target.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23999' font-size='18'%3EImage not found%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setViewItem(item)}
                    className="absolute inset-0 bg-black/0 hover:bg-black/40 transition flex items-center justify-center cursor-zoom-in"
                  >
                    <span className="px-4 py-2 rounded-full border border-white/70 text-white text-xs uppercase tracking-[0.3em]">
                      {t("view", "View")}
                    </span>
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className={`font-bold ${textColor} text-lg line-clamp-1`}>
                    {item.title}
                  </h3>

                  {item.description && (
                    <p
                      className={`${textColor} opacity-70 text-sm line-clamp-2`}
                    >
                      {item.description}
                    </p>
                  )}

                  {/* Archive Metadata Display */}
                  {(item.archiveSource ||
                    item.documentCode ||
                    item.location ||
                    item.year ||
                    item.photographer) && (
                    <div
                      className={`text-xs space-y-1.5 pt-2 border-t ${border}`}
                    >
                      {item.archiveSource && (
                        <div className="flex items-start gap-2">
                          <Archive className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
                          <span className="opacity-80">
                            {item.archiveSource}
                          </span>
                        </div>
                      )}
                      {item.documentCode && (
                        <div className="flex items-center gap-2">
                          <span className="opacity-60">
                            #{item.documentCode}
                          </span>
                        </div>
                      )}
                      {item.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 opacity-60" />
                          <span className="opacity-80">{item.location}</span>
                        </div>
                      )}
                      {item.year && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          <span className="opacity-80">{item.year}</span>
                        </div>
                      )}
                      {item.photographer && (
                        <div className="flex items-center gap-2">
                          <Camera className="w-3.5 h-3.5 opacity-60" />
                          <span className="opacity-80">
                            {item.photographer}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className={`${textColor} opacity-40 text-xs`}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition flex items-center gap-1"
                        title={t("edit", "Edit")}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition flex items-center gap-1"
                        title={t("delete", "Delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewItem && (
          <div
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setViewItem(null)}
          >
            <button
              type="button"
              onClick={() => setViewItem(null)}
              className="absolute top-6 right-6 text-white hover:text-[#d4af37] transition z-10 bg-black/40 hover:bg-black/60 rounded-full p-3 flex items-center gap-2"
              aria-label={t("close_image", "Quittez l'image")}
            >
              <X className="w-5 h-5" />
              <span className="text-xs uppercase tracking-[0.2em]">
                {t("close_image", "Quittez l'image")}
              </span>
            </button>
            <div
              className={`${cardBg} border ${border} rounded-2xl shadow-2xl p-4`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[70vw] h-[70vh] max-w-[70vw] max-h-[70vh] flex items-center justify-center">
                {viewImageUrl ? (
                  <img
                    src={viewImageUrl}
                    alt={viewItem.title || "Gallery"}
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5d4037] opacity-60">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
