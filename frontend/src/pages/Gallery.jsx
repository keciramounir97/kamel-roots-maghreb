import { useEffect, useState } from "react";
import { useThemeStore } from "../store/theme";
import { useTranslation } from "../context/TranslationContext";
import { api } from "../api/client";
import {
  Image as ImageIcon,
  Search,
  X,
  MapPin,
  Calendar,
  Camera,
  Archive,
  FileText,
  Download,
} from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";
import RootsPageShell from "../components/RootsPageShell";

export default function Gallery() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const [gallery, setGallery] = useState([]);
  const [filteredGallery, setFilteredGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
    loadGallery();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = gallery.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query) ||
          item.archiveSource?.toLowerCase().includes(query) ||
          item.documentCode?.toLowerCase().includes(query) ||
          item.year?.toLowerCase().includes(query) ||
          item.photographer?.toLowerCase().includes(query)
      );
      setFilteredGallery(filtered);
    } else {
      setFilteredGallery(gallery);
    }
  }, [searchQuery, gallery]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/gallery");
      setGallery(data.gallery || []);
      setFilteredGallery(data.gallery || []);
    } catch (error) {
      console.error("Failed to load gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  const cardBg = isDark ? "bg-[#2c1810]" : "bg-white";
  const border = isDark ? "border-[#d4af37]/20" : "border-[#5d4037]/20";
  const inputBg = isDark ? "bg-[#3e2723]" : "bg-[#fff9f0]";
  const textColor = isDark ? "text-[#f5f1e8]" : "text-[#2c1810]";
  const selectedImageUrl =
    selectedImage?.imagePath
      ? `${import.meta.env.VITE_API_URL || "http://localhost:3000"}${
          selectedImage.imagePath
        }`
      : "";

  return (
    <RootsPageShell
      hero={
        <div className="space-y-5">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow font-serif">
            {t("photo_gallery", "Photo Gallery")}
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl opacity-90">
            {t(
              "gallery_intro",
              "Explore our collection of historical photos, family memories, and cultural heritage"
            )}
          </p>
        </div>
      }
    >
      <section className="roots-section" data-aos="fade-up">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textColor} opacity-40`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                "search_photos",
                "Search photos, locations, years..."
              )}
              className={`w-full pl-12 pr-4 py-4 rounded-full border ${border} ${inputBg} ${textColor} focus:outline-none focus:ring-2 focus:ring-[#d4af37] transition shadow-md`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${textColor} opacity-50 hover:opacity-100 transition`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#d4af37] border-t-transparent"></div>
            <p className={`${textColor} mt-4 opacity-70`}>
              {t("loading_gallery", "Loading gallery...")}
            </p>
          </div>
        ) : filteredGallery.length === 0 ? (
          <div
            className={`${cardBg} border ${border} rounded-xl shadow-lg p-16 text-center`}
            data-aos="fade-up"
          >
            <ImageIcon
              className={`w-20 h-20 mx-auto ${textColor} opacity-20 mb-6`}
            />
            <h3 className={`text-2xl font-bold ${textColor} mb-2`}>
              {searchQuery
                ? t("no_results_found", "No results found")
                : t("no_photos_available", "No photos available yet")}
            </h3>
            <p className={`${textColor} opacity-50`}>
              {searchQuery
                ? t("try_different_search", "Try a different search term")
                : t("check_back_later", "Check back later for new content")}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <p className={`${textColor} opacity-70 text-lg`}>
                {t("showing_photos", "Showing")}{" "}
                <span className="font-bold text-[#d4af37]">
                  {filteredGallery.length}
                </span>{" "}
                {filteredGallery.length === 1
                  ? t("photo", "photo")
                  : t("photos", "photos")}
              </p>
            </div>

            {/* Masonry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGallery.map((item, index) => (
                <div
                  key={item.id}
                  className={`${cardBg} border ${border} rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-2 group`}
                  data-aos="zoom-in"
                  data-aos-delay={Math.min(index * 30, 300)}
                  onClick={() => setSelectedImage(item)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#5d4037]/10 to-[#d4af37]/10">
                    <img
                      src={`${
                        import.meta.env.VITE_API_URL || "http://localhost:3000"
                      }${item.imagePath}`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <span className="px-4 py-2 rounded-full border border-white/70 text-white text-xs uppercase tracking-[0.3em]">
                        {t("view", "View")}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3
                      className={`font-bold ${textColor} text-base line-clamp-2 group-hover:text-[#d4af37] transition`}
                    >
                      {item.title}
                    </h3>

                    {item.description && (
                      <p
                        className={`${textColor} opacity-60 text-sm line-clamp-2`}
                      >
                        {item.description}
                      </p>
                    )}

                    {/* Archive Metadata Preview */}
                    {(item.location ||
                      item.year ||
                      item.archiveSource ||
                      item.documentCode) && (
                      <div
                        className={`pt-2 text-xs ${textColor} opacity-70 space-y-2`}
                      >
                        {(item.location || item.year) && (
                          <div className="flex flex-wrap gap-2">
                            {item.location && (
                              <span className="flex items-center gap-1 bg-[#d4af37]/10 px-2 py-1 rounded">
                                <MapPin className="w-3 h-3" />
                                {item.location}
                              </span>
                            )}
                            {item.year && (
                              <span className="flex items-center gap-1 bg-[#d4af37]/10 px-2 py-1 rounded">
                                <Calendar className="w-3 h-3" />
                                {item.year}
                              </span>
                            )}
                          </div>
                        )}

                        {(item.archiveSource || item.documentCode) && (
                          <div className="space-y-1 text-[11px]">
                            {item.archiveSource && (
                              <div className="flex items-center gap-2">
                                <Archive className="w-3 h-3" />
                                <span className="uppercase tracking-wide opacity-60">
                                  {t("archive_source", "Archive Source")}
                                </span>
                                <span className="font-medium truncate">
                                  {item.archiveSource}
                                </span>
                              </div>
                            )}
                            {item.documentCode && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                <span className="uppercase tracking-wide opacity-60">
                                  {t("document_code", "Document Code")}
                                </span>
                                <span className="font-mono font-medium truncate">
                                  {item.documentCode}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-[#d4af37] transition z-10 bg-black/50 hover:bg-black/70 rounded-full p-3 flex items-center gap-2"
            aria-label={t("close_image", "Quittez l'image")}
          >
            <X className="w-6 h-6" />
            <span className="text-xs uppercase tracking-[0.2em]">
              {t("close_image", "Quittez l'image")}
            </span>
          </button>

          <div
            className="w-[70vw] max-w-[70vw] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mb-6 flex items-center justify-center">
              <div className="w-[70vw] h-[70vh] max-w-[70vw] max-h-[70vh] flex items-center justify-center">
                {selectedImageUrl ? (
                  <img
                    src={selectedImageUrl}
                    alt={selectedImage.title}
                    className="w-full h-full object-contain rounded-xl shadow-2xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white/60">
                    <ImageIcon className="w-14 h-14" />
                  </div>
                )}
              </div>
            </div>

            <div
              className={`${cardBg} p-6 rounded-xl border ${border} shadow-2xl`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2
                  className={`text-3xl font-bold ${
                    isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                  } font-serif`}
                >
                  {selectedImage.title}
                </h2>
                {selectedImageUrl ? (
                  <a
                    href={selectedImageUrl}
                    download
                    className="px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t("download", "Download")}
                  </a>
                ) : null}
              </div>

              {selectedImage.description && (
                <p
                  className={`${textColor} opacity-80 leading-relaxed mb-4 text-lg`}
                >
                  {selectedImage.description}
                </p>
              )}

              {/* Full Archive Metadata */}
              {(selectedImage.archiveSource ||
                selectedImage.documentCode ||
                selectedImage.location ||
                selectedImage.year ||
                selectedImage.photographer) && (
                <div className={`border-t ${border} pt-4 space-y-3`}>
                  <h3
                    className={`text-sm font-bold ${textColor} uppercase tracking-wide opacity-60 flex items-center gap-2`}
                  >
                    <Archive className="w-4 h-4" />
                    {t("archive_information", "Archive Information")}
                  </h3>

                  <div className="grid md:grid-cols-2 gap-3">
                    {selectedImage.archiveSource && (
                      <div className="flex items-start gap-3">
                        <Archive
                          className={`w-5 h-5 ${
                            isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                          } flex-shrink-0 mt-0.5`}
                        />
                        <div>
                          <p
                            className={`text-xs ${textColor} opacity-50 uppercase`}
                          >
                            {t("archive_source", "Archive Source")}
                          </p>
                          <p className={`${textColor} font-medium`}>
                            {selectedImage.archiveSource}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedImage.documentCode && (
                      <div className="flex items-start gap-3">
                        <FileText
                          className={`w-5 h-5 ${
                            isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                          } flex-shrink-0 mt-0.5`}
                        />
                        <div>
                          <p
                            className={`text-xs ${textColor} opacity-50 uppercase`}
                          >
                            {t("document_code", "Document Code")}
                          </p>
                          <p className={`${textColor} font-medium font-mono`}>
                            {selectedImage.documentCode}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedImage.location && (
                      <div className="flex items-start gap-3">
                        <MapPin
                          className={`w-5 h-5 ${
                            isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                          } flex-shrink-0 mt-0.5`}
                        />
                        <div>
                          <p
                            className={`text-xs ${textColor} opacity-50 uppercase`}
                          >
                            {t("location", "Location")}
                          </p>
                          <p className={`${textColor} font-medium`}>
                            {selectedImage.location}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedImage.year && (
                      <div className="flex items-start gap-3">
                        <Calendar
                          className={`w-5 h-5 ${
                            isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                          } flex-shrink-0 mt-0.5`}
                        />
                        <div>
                          <p
                            className={`text-xs ${textColor} opacity-50 uppercase`}
                          >
                            {t("year", "Year")}
                          </p>
                          <p className={`${textColor} font-medium`}>
                            {selectedImage.year}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedImage.photographer && (
                      <div className="flex items-start gap-3 md:col-span-2">
                        <Camera
                          className={`w-5 h-5 ${
                            isDark ? "text-[#d4af37]" : "text-[#5d4037]"
                          } flex-shrink-0 mt-0.5`}
                        />
                        <div>
                          <p
                            className={`text-xs ${textColor} opacity-50 uppercase`}
                          >
                            {t("photographer", "Photographer")}
                          </p>
                          <p className={`${textColor} font-medium`}>
                            {selectedImage.photographer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Uploader and Date */}
              <div
                className={`flex items-center justify-between mt-4 pt-4 border-t ${border}`}
              >
                {selectedImage.uploader && (
                  <p className={`${textColor} opacity-50 text-sm`}>
                    {t("uploaded_by", "Uploaded by")}:{" "}
                    <span className="font-medium">
                      {selectedImage.uploader.fullName ||
                        t("anonymous", "Anonymous")}
                    </span>
                  </p>
                )}
                <p className={`${textColor} opacity-40 text-xs`}>
                  {new Date(selectedImage.createdAt).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </RootsPageShell>
  );
}
