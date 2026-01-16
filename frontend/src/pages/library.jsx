import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Archive,
  BookOpen,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  Filter,
  FileText,
  Image as ImageIcon,
  MapPin,
  Search,
  Trees,
  Users,
  X,
} from "lucide-react";
import { api } from "../api/client";
import { getApiErrorMessage, getApiRoot } from "../api/helpers";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";
import TreesBuilder, { parseGedcom } from "../admin/components/TreesBuilder";
import ErrorBoundary from "../components/ErrorBoundary";

const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(n) / Math.log(1024)),
    units.length - 1
  );
  const v = n / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const sortByDateDesc = (items) =>
  [...items].sort((a, b) => {
    const da = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

export default function Library() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const location = useLocation();

  const [books, setBooks] = useState([]);
  const [trees, setTrees] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booksError, setBooksError] = useState("");
  const [treesError, setTreesError] = useState("");
  const [galleryError, setGalleryError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [bookCategory, setBookCategory] = useState("all");
  const [treeFilter, setTreeFilter] = useState("all");
  const [imageLocation, setImageLocation] = useState("all");
  const [imageYear, setImageYear] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewTree, setViewTree] = useState(null);
  const [viewPeople, setViewPeople] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);

  const apiRoot = useMemo(() => getApiRoot(), []);

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get("q");
    setQuery(qParam || "");
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setBooksError("");
        setTreesError("");
        setGalleryError("");

        const isMock =
          import.meta.env.DEV &&
          localStorage.getItem("mockupDataActive") === "true";
        const [booksRes, treesRes, galleryRes] = await Promise.allSettled([
          api.get("/books"),
          api.get("/trees"),
          api.get("/gallery"),
        ]);

        if (!mounted) return;

        let nextBooks = [];
        if (booksRes.status === "fulfilled") {
          const d = booksRes.value?.data;
          if (d?.success && Array.isArray(d.data)) nextBooks = d.data;
          else if (Array.isArray(d)) nextBooks = d;
        }

        let nextTrees =
          treesRes.status === "fulfilled" && Array.isArray(treesRes.value?.data)
            ? treesRes.value.data
            : [];
        let nextGallery = [];
        if (galleryRes.status === "fulfilled") {
          const galleryData = galleryRes.value?.data;
          if (galleryData?.success && Array.isArray(galleryData.data)) {
            nextGallery = galleryData.data;
          } else if (Array.isArray(galleryData?.gallery)) {
            nextGallery = galleryData.gallery;
          } else if (Array.isArray(galleryData)) {
            nextGallery = galleryData;
          }
        }

        const booksErrorMessage =
          !isMock && booksRes.status === "rejected"
            ? getApiErrorMessage(booksRes.reason, "Failed to load books")
            : "";
        const treesErrorMessage =
          !isMock && treesRes.status === "rejected"
            ? getApiErrorMessage(treesRes.reason, "Failed to load trees")
            : "";
        const galleryErrorMessage =
          !isMock && galleryRes.status === "rejected"
            ? getApiErrorMessage(galleryRes.reason, "Failed to load gallery")
            : "";

        if (isMock) {
          const mockBooks = [
            {
              id: "mb1",
              title: "Muqaddimah (The Introduction)",
              author: "Ibn Khaldun",
              category: "History / Sociology",
              isPublic: true,
              downloads: 1240,
              createdAt: new Date().toISOString(),
            },
            {
              id: "mb2",
              title: "Kitab al-Ansab (The Book of Genealogies)",
              author: "Al-Sam'ani",
              category: "Genealogy",
              isPublic: true,
              downloads: 850,
              createdAt: new Date().toISOString(),
            },
          ];

          const mockTrees = [
            {
              id: "mt1",
              title: "Lineage of the Zayanes",
              description: "A public tree covering tribal alliances and clans.",
              owner: "Admin",
              isPublic: true,
              hasGedcom: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: "mt2",
              title: "Sahraoui Families",
              description: "Nomadic kinship networks and migration routes.",
              owner: "Admin",
              isPublic: true,
              hasGedcom: false,
              createdAt: new Date().toISOString(),
            },
          ];

          const mockGallery = [
            {
              id: "mg1",
              title: "Kasbah Archives",
              description: "Aerial record of old Kasbah neighborhoods.",
              imagePath: "",
              location: "Algiers",
              year: "1930",
              createdAt: new Date().toISOString(),
            },
            {
              id: "mg2",
              title: "Desert Caravan",
              description: "Archival photo of a Saharan caravan.",
              imagePath: "",
              location: "Tamanrasset",
              year: "1912",
              createdAt: new Date().toISOString(),
            },
          ];

          nextBooks = [...nextBooks, ...mockBooks];
          nextTrees = [...nextTrees, ...mockTrees];
          nextGallery = [...nextGallery, ...mockGallery];
        }

        setBooks(nextBooks);
        setTrees(nextTrees);
        setGallery(nextGallery);
        setBooksError(booksErrorMessage);
        setTreesError(treesErrorMessage);
        setGalleryError(galleryErrorMessage);

        const errors = [booksRes, treesRes, galleryRes].filter(
          (res) => res.status === "rejected"
        );
        if (errors.length === 3 && !isMock) {
          setError(
            getApiErrorMessage(errors[0].reason, "Failed to load library data")
          );
        }
      } catch (err) {
        if (!mounted) return;
        setError(getApiErrorMessage(err, "Failed to load library data"));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    for (const b of books) {
      const c = String(b.category || "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const locations = useMemo(() => {
    const set = new Set();
    for (const item of gallery) {
      const loc = String(item.location || "").trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [gallery]);

  const years = useMemo(() => {
    const set = new Set();
    for (const item of gallery) {
      const year = String(item.year || "").trim();
      if (year) set.add(year);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [gallery]);

  const queryLower = query.trim().toLowerCase();
  const showBooks = typeFilter === "all" || typeFilter === "books";
  const showTrees = typeFilter === "all" || typeFilter === "trees";
  const showImages = typeFilter === "all" || typeFilter === "images";

  const filteredBooks = useMemo(() => {
    const next = books.filter((b) => {
      const cat = String(b.category || "");
      if (bookCategory !== "all" && cat !== bookCategory) return false;
      if (!queryLower) return true;
      const hay = [b.title, b.author, b.description, b.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(queryLower);
    });
    return sortByDateDesc(next);
  }, [books, bookCategory, queryLower]);

  const filteredTrees = useMemo(() => {
    const next = trees.filter((t) => {
      if (treeFilter === "with-gedcom" && !t.hasGedcom) return false;
      if (!queryLower) return true;
      const hay = [
        t.title,
        t.description,
        t.owner,
        t.archiveSource,
        t.documentCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(queryLower);
    });
    return sortByDateDesc(next);
  }, [trees, treeFilter, queryLower]);

  const filteredGallery = useMemo(() => {
    const next = gallery.filter((item) => {
      if (imageLocation !== "all" && item.location !== imageLocation)
        return false;
      if (imageYear !== "all" && String(item.year) !== String(imageYear))
        return false;
      if (!queryLower) return true;
      const hay = [
        item.title,
        item.description,
        item.location,
        item.archiveSource,
        item.documentCode,
        item.year,
        item.photographer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(queryLower);
    });
    return sortByDateDesc(next);
  }, [gallery, imageLocation, imageYear, queryLower]);

  const latestBook = sortByDateDesc(books)[0];
  const latestTree = sortByDateDesc(trees)[0];
  const latestImage = sortByDateDesc(gallery)[0];

  const fileUrl = (p) => {
    const raw = String(p || "");
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/")) return `${apiRoot}${raw}`;
    return `${apiRoot}/${raw}`;
  };

  const downloadBookUrl = (id) => `${apiRoot}/api/books/${id}/download`;
  const downloadTreeUrl = (id) => `${apiRoot}/api/trees/${id}/gedcom`;
  const isMockTree = (tree) => !Number.isFinite(Number(tree?.id));

  const handleViewTree = async (tree) => {
    if (!tree) return;
    setViewTree(tree);
    setViewPeople([]);
    setViewLoading(true);

    try {
      if (isMockTree(tree)) {
        const familyName =
          String(tree.title || "Mock").split(" ").pop() || "Mock";
        setViewPeople([
          {
            id: "m1",
            names: { en: `Ahmed ${familyName}` },
            gender: "Male",
            birthYear: "1920",
            details: "Patriarch.",
            color: "#f8f5ef",
            children: ["m2"],
          },
          {
            id: "m2",
            names: { en: `Fatima ${familyName}` },
            gender: "Female",
            birthYear: "1925",
            details: "Matriarch.",
            color: "#f8f5ef",
            spouse: "m1",
          },
        ]);
        return;
      }

      if (!tree.hasGedcom) {
        return;
      }

      const { data } = await api.get(`/trees/${tree.id}/gedcom`, {
        responseType: "text",
      });
      setViewPeople(parseGedcom(data));
    } catch (err) {
      console.error("Failed to view tree", err);
      setViewPeople([]);
    } finally {
      setViewLoading(false);
    }
  };

  const cardBg = theme === "dark" ? "bg-[#151a21]" : "bg-white";
  const borderColor =
    theme === "dark" ? "border-[#24304A]" : "border-[#d8c7b0]";
  const sectionAlt = theme === "dark" ? "bg-[#171c25]" : "bg-[#E7EEFF]";
  const metaPanel =
    theme === "dark"
      ? "bg-white/5 border-white/10"
      : "bg-[#5d4037]/5 border-[#d8c7b0]/60";
  const selectedImageUrl = selectedImage?.imagePath
    ? fileUrl(selectedImage.imagePath)
    : "";

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-[#d4af37]">
            {t("library", "Library")}
          </p>
          <h1 className="text-5xl font-bold">
            {t("library_title", "North African Genealogy Library")}
          </h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            {t(
              "library_intro",
              "Books, family trees, and archival photography in one curated library."
            )}
          </p>
        </div>
      }
    >
      <section className="roots-section roots-section-alt" data-aos="fade-up">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4">
            {t("library_search", "Search the library")}
          </h2>
          <div
            className={`grid gap-4 md:grid-cols-[2fr_1fr_1fr] items-center p-6 rounded-xl border ${borderColor}`}
          >
            <div className="relative">
              <Search className="absolute left-3 top-3 text-[#5d4037] opacity-80 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search_library", "Search books, trees, images...")}
                className={`w-full pl-10 py-3 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-[#5d4037]" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`w-full px-4 py-3 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              >
                <option value="all">{t("all_content", "All content")}</option>
                <option value="books">{t("books", "Books")}</option>
                <option value="trees">{t("trees", "Family Trees")}</option>
                <option value="images">{t("images", "Images")}</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-[#5d4037]" />
              <select
                value={bookCategory}
                onChange={(e) => setBookCategory(e.target.value)}
                className={`w-full px-4 py-3 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              >
                <option value="all">
                  {t("all_categories", "All Categories")}
                </option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Trees className="w-5 h-5 text-[#5d4037]" />
              <select
                value={treeFilter}
                onChange={(e) => setTreeFilter(e.target.value)}
                className={`w-full px-4 py-2 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              >
                <option value="all">{t("all_trees", "All Trees")}</option>
                <option value="with-gedcom">
                  {t("with_gedcom", "With GEDCOM file")}
                </option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-[#5d4037]" />
              <select
                value={imageLocation}
                onChange={(e) => setImageLocation(e.target.value)}
                className={`w-full px-4 py-2 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              >
                <option value="all">{t("all_locations", "All Locations")}</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#5d4037]" />
              <select
                value={imageYear}
                onChange={(e) => setImageYear(e.target.value)}
                className={`w-full px-4 py-2 rounded-md bg-transparent border ${borderColor} outline-none ${
                  theme === "dark" ? "text-white" : "text-[#2c1810]"
                }`}
              >
                <option value="all">{t("all_years", "All Years")}</option>
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="roots-section" data-aos="fade-up">
        <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-6">
          {t("latest_updates", "Latest uploads")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className={`${cardBg} p-6 rounded-2xl shadow-lg border ${borderColor}`}>
            <BookOpen className="w-8 h-8 text-[#d4af37] mb-4" />
            <p className="text-sm uppercase tracking-[0.2em] text-[#5d4037] mb-2">
              {t("latest_book", "Latest book")}
            </p>
            {latestBook ? (
              <>
                <h3 className="text-xl font-bold">{latestBook.title}</h3>
                <p className="text-sm opacity-80 mt-1">
                  {latestBook.author || t("unknown", "Unknown")}
                </p>
                <p className="text-sm opacity-80 mt-3">
                  {latestBook.description || t("no_description", "No description.")}
                </p>
              </>
            ) : (
              <p className="opacity-70">{t("no_books_found", "No books found.")}</p>
            )}
          </div>
          <div className={`${cardBg} p-6 rounded-2xl shadow-lg border ${borderColor}`}>
            <Trees className="w-8 h-8 text-[#d4af37] mb-4" />
            <p className="text-sm uppercase tracking-[0.2em] text-[#5d4037] mb-2">
              {t("latest_tree", "Latest tree")}
            </p>
            {latestTree ? (
              <>
                <h3 className="text-xl font-bold">{latestTree.title}</h3>
                <p className="text-sm opacity-80 mt-1">
                  {latestTree.owner || t("unknown", "Unknown")}
                </p>
                <p className="text-sm opacity-80 mt-3">
                  {latestTree.description || t("no_description", "No description.")}
                </p>
              </>
            ) : (
              <p className="opacity-70">{t("no_trees_found", "No trees found.")}</p>
            )}
          </div>
          <div className={`${cardBg} p-6 rounded-2xl shadow-lg border ${borderColor}`}>
            <ImageIcon className="w-8 h-8 text-[#d4af37] mb-4" />
            <p className="text-sm uppercase tracking-[0.2em] text-[#5d4037] mb-2">
              {t("latest_image", "Latest image")}
            </p>
            {latestImage ? (
              <>
                <h3 className="text-xl font-bold">{latestImage.title}</h3>
                <p className="text-sm opacity-80 mt-1">
                  {latestImage.location || t("unknown", "Unknown")}
                </p>
                <p className="text-sm opacity-80 mt-3">
                  {latestImage.description || t("no_description", "No description.")}
                </p>
              </>
            ) : (
              <p className="opacity-70">
                {t("no_photos_available", "No photos available yet")}
              </p>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="roots-section">
          <div className="text-center opacity-70">
            {t("loading", "Loading...")}
          </div>
        </section>
      ) : error ? (
        <section className="roots-section">
          <div className="text-center text-red-500 font-semibold">{error}</div>
        </section>
      ) : null}

      {showBooks && !loading && !error && (
        <section className="roots-section roots-section-alt" data-aos="fade-up">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-6">
            {t("books", "Books")} ({filteredBooks.length})
          </h2>
          {booksError ? (
            <div className="mb-4 text-sm text-red-500 font-semibold">
              {booksError}
            </div>
          ) : null}
          {filteredBooks.length === 0 ? (
            <div
              className={`${cardBg} p-8 rounded-xl shadow-xl border ${borderColor} text-center opacity-70`}
            >
              {booksError
                ? t("books_unavailable", "Books are temporarily unavailable.")
                : t("no_books_found", "No books found.")}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredBooks.map((book) => {
                const coverSrc = book.coverUrl ? fileUrl(book.coverUrl) : "";
                return (
                  <div
                    key={book.id}
                    className={`${cardBg} border ${borderColor} rounded-2xl overflow-hidden shadow-xl group transition hover:-translate-y-1`}
                    data-aos="zoom-in"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#5d4037]/15 to-[#d4af37]/10">
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#5d4037] opacity-60">
                          <BookOpen className="w-14 h-14" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />
                      <div className="absolute left-4 bottom-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                          {t("books", "Books")}
                        </p>
                        <h3 className="text-lg font-bold text-white line-clamp-2">
                          {book.title}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {book.author || t("unknown", "Unknown")}
                          </p>
                          <p className="text-xs opacity-70 truncate">
                            {book.category ||
                              t("uncategorized", "Uncategorized")}
                          </p>
                        </div>
                        <BookOpen className="w-5 h-5 text-[#d4af37]" />
                      </div>

                      <p className="text-sm opacity-80 line-clamp-3">
                        {book.description ||
                          t("no_description", "No description.")}
                      </p>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {book.fileSize ? (
                          <span
                            className={`${metaPanel} border rounded-full px-3 py-1`}
                          >
                            {t("file_label", "File")}:{" "}
                            {formatBytes(book.fileSize)}
                          </span>
                        ) : null}
                        {typeof book.downloads === "number" ? (
                          <span
                            className={`${metaPanel} border rounded-full px-3 py-1`}
                          >
                            {t("downloads_label", "Downloads")}:{" "}
                            {book.downloads}
                          </span>
                        ) : null}
                      </div>

                      <div className="pt-2 flex flex-wrap gap-2">
                        {Number.isFinite(Number(book.id)) ? (
                          <a
                            href={downloadBookUrl(book.id)}
                            className="px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="w-4 h-4" />
                            {t("download", "Download")}
                          </a>
                        ) : null}
                        {book.fileUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                fileUrl(book.fileUrl),
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            className={`px-4 py-2 rounded-md border ${borderColor} hover:opacity-90 inline-flex items-center gap-2`}
                          >
                            <ExternalLink className="w-4 h-4" />
                            {t("open", "Open")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {showTrees && !loading && !error && (
        <section className="roots-section" data-aos="fade-up">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-6">
            {t("trees", "Family Trees")} ({filteredTrees.length})
          </h2>
          {treesError ? (
            <div className="mb-4 text-sm text-red-500 font-semibold">
              {treesError}
            </div>
          ) : null}
          {filteredTrees.length === 0 ? (
            <div
              className={`${cardBg} p-8 rounded-xl shadow-xl border ${borderColor} text-center opacity-70`}
            >
              {treesError
                ? t("trees_unavailable", "Trees are temporarily unavailable.")
                : t("no_trees_found", "No trees found.")}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {filteredTrees.map((tree) => {
                const canDownload =
                  Number.isFinite(Number(tree.id)) && tree.hasGedcom;
                return (
                  <div
                    key={tree.id}
                    className={`${cardBg} border ${borderColor} rounded-2xl shadow-xl overflow-hidden`}
                    data-aos="fade-up"
                  >
                    <div className="p-5 border-b border-white/5 bg-gradient-to-r from-[#5d4037]/10 to-transparent">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-[#5d4037] opacity-70">
                            {t("trees", "Family Trees")}
                          </p>
                          <h3 className="text-2xl font-bold truncate">
                            {tree.title}
                          </h3>
                          <p className="text-sm opacity-70">
                            {tree.owner || t("unknown", "Unknown")}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${borderColor}`}
                        >
                          {tree.isPublic
                            ? t("public", "Public")
                            : t("private", "Private")}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <p className="text-sm opacity-80">
                        {tree.description ||
                          t("no_description", "No description.")}
                      </p>

                      <div className="grid sm:grid-cols-2 gap-3">
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
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewTree(tree)}
                          className={`px-4 py-2 rounded-md border ${borderColor} hover:opacity-90 inline-flex items-center gap-2`}
                        >
                          <Eye className="w-4 h-4" />
                          {t("view_tree", "View Tree")}
                        </button>
                        {canDownload ? (
                          <a
                            href={downloadTreeUrl(tree.id)}
                            className="px-4 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="w-4 h-4" />
                            {t("download_gedcom", "Download GEDCOM")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {showImages && !loading && !error && (
        <section className="roots-section roots-section-alt" data-aos="fade-up">
          <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-6">
            {t("images", "Images")} ({filteredGallery.length})
          </h2>
          {galleryError ? (
            <div className="mb-4 text-sm text-red-500 font-semibold">
              {galleryError}
            </div>
          ) : null}
          {filteredGallery.length === 0 ? (
            <div
              className={`${cardBg} p-8 rounded-xl shadow-xl border ${borderColor} text-center opacity-70`}
            >
              {galleryError
                ? t(
                    "images_unavailable",
                    "Images are temporarily unavailable."
                  )
                : t("no_photos_available", "No photos available yet")}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGallery.map((item) => {
                const imageSrc = item.imagePath ? fileUrl(item.imagePath) : "";
                return (
                  <div
                    key={item.id}
                    className={`${cardBg} border ${borderColor} rounded-2xl overflow-hidden shadow-xl group`}
                    data-aos="zoom-in"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#5d4037]/10 to-[#d4af37]/10">
                      {imageSrc ? (
                        <>
                          <img
                            src={imageSrc}
                            alt={item.title || "Gallery"}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedImage(item)}
                            className="absolute inset-0 bg-black/0 hover:bg-black/40 transition flex items-center justify-center cursor-zoom-in"
                          >
                            <span className="px-4 py-2 rounded-full border border-white/70 text-white text-xs uppercase tracking-[0.3em]">
                              {t("view", "View")}
                            </span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#5d4037] opacity-40">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-3">
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      {item.description ? (
                        <p className="text-sm opacity-80 line-clamp-3">
                          {item.description}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 text-xs opacity-70">
                        {item.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </span>
                        ) : null}
                        {item.year ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.year}
                          </span>
                        ) : null}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div
                          className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                        >
                          <Archive className="w-4 h-4 text-[#d4af37] mt-0.5" />
                          <div>
                            <p className="text-[10px] uppercase opacity-60">
                              {t("archive_source", "Archive Source")}
                            </p>
                            <p className="text-xs font-semibold break-words">
                              {item.archiveSource ||
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
                              {item.documentCode ||
                                t("not_provided", "Not provided")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="roots-section roots-section-alt">
        <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4">
          {t("explore_by_category", "Explore by Category")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-6">
          {[
            {
              icon: BookOpen,
              title: t("library_category_manuscripts", "Manuscripts"),
              color: "#5d4037",
            },
            {
              icon: Trees,
              title: t("trees", "Family Trees"),
              color: "#556b2f",
            },
            {
              icon: ImageIcon,
              title: t("library_category_photos", "Photo Archives"),
              color: "#d4af37",
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`${sectionAlt} p-8 rounded-xl shadow-lg text-center border ${borderColor}`}
              data-aos="zoom-in"
            >
              <item.icon className="w-12 h-12 mx-auto mb-4" style={{ color: item.color }} />
              <h3 className="text-xl font-bold">{item.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 text-white hover:text-[#d4af37] transition z-10 bg-black/40 hover:bg-black/60 rounded-full p-3"
            aria-label={t("close", "Close")}
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mb-6">
              {selectedImageUrl ? (
                <img
                  src={selectedImageUrl}
                  alt={selectedImage.title || "Gallery"}
                  className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                />
              ) : (
                <div className="w-full h-[50vh] flex items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-white/60">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
            </div>

            <div
              className={`${cardBg} p-6 rounded-2xl border ${borderColor} shadow-2xl`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">
                  {selectedImage.title || t("image", "Image")}
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

              {selectedImage.description ? (
                <p className="text-sm opacity-80 mt-3">
                  {selectedImage.description}
                </p>
              ) : null}

              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <div
                  className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                >
                  <Archive className="w-4 h-4 text-[#d4af37] mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase opacity-60">
                      {t("archive_source", "Archive Source")}
                    </p>
                    <p className="text-xs font-semibold break-words">
                      {selectedImage.archiveSource ||
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
                      {selectedImage.documentCode ||
                        t("not_provided", "Not provided")}
                    </p>
                  </div>
                </div>
                <div
                  className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                >
                  <MapPin className="w-4 h-4 text-[#d4af37] mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase opacity-60">
                      {t("location", "Location")}
                    </p>
                    <p className="text-xs font-semibold break-words">
                      {selectedImage.location ||
                        t("not_provided", "Not provided")}
                    </p>
                  </div>
                </div>
                <div
                  className={`${metaPanel} border rounded-xl p-3 flex items-start gap-2`}
                >
                  <Calendar className="w-4 h-4 text-[#d4af37] mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase opacity-60">
                      {t("year", "Year")}
                    </p>
                    <p className="text-xs font-semibold break-words">
                      {selectedImage.year || t("not_provided", "Not provided")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewTree && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setViewTree(null);
            setViewPeople([]);
          }}
        >
          <div
            className={`${cardBg} w-full max-w-[92vw] h-[calc(90vh-6rem)] mt-16 rounded-2xl border ${borderColor} shadow-2xl flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trees className="w-5 h-5 text-[#d4af37]" />
                  {viewTree.title}
                </h2>
                <p className="text-xs opacity-60">
                  {t("viewing_mode", "Viewing Mode - Read Only")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {Number.isFinite(Number(viewTree.id)) && viewTree.hasGedcom ? (
                  <a
                    href={downloadTreeUrl(viewTree.id)}
                    className="px-3 py-2 rounded-md text-white font-medium bg-gradient-to-r from-[#5d4037] to-[#d4af37] hover:opacity-90 transition inline-flex items-center gap-2 text-sm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="w-4 h-4" />
                    {t("download_gedcom", "Download GEDCOM")}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setViewTree(null);
                    setViewPeople([]);
                  }}
                  className="p-2 rounded-full hover:bg-black/10 transition"
                  aria-label={t("close", "Close")}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative bg-black/5 overflow-hidden">
              {viewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37]"></div>
                </div>
              ) : viewTree.hasGedcom || viewPeople.length ? (
                <ErrorBoundary
                  fallback={({ error, reset }) => (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="rounded-lg border border-[#d8c7b0] bg-white/90 px-6 py-5 text-sm text-[#5d4037] shadow-xl">
                        <div className="font-semibold">
                          {t("tree_builder_error", "Tree builder failed to load.")}
                        </div>
                        <div className="opacity-70">
                          {error?.message ||
                            t("tree_builder_try_again", "Please try again.")}
                        </div>
                        <button
                          type="button"
                          onClick={reset}
                          className="mt-3 inline-flex items-center rounded-md border border-[#d8c7b0] px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                        >
                          {t("retry", "Retry")}
                        </button>
                      </div>
                    </div>
                  )}
                >
                  <TreesBuilder
                    people={viewPeople}
                    setPeople={setViewPeople}
                    readOnly
                  />
                </ErrorBoundary>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm opacity-70">
                  {t("no_gedcom_available", "No GEDCOM file available yet.")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </RootsPageShell>
  );
}

