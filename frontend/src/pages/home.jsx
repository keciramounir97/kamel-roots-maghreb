import { NavLink } from "react-router-dom";
import { useThemeStore } from "../store/theme";
import {
  Archive,
  BookOpen,
  Compass,
  Download,
  Eye,
  Feather,
  FileText,
  Scroll,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import { useState, useEffect } from "react";
import { api } from "../api/client";
import TreesBuilder, { parseGedcom } from "../admin/components/TreesBuilder";
import ErrorBoundary from "../components/ErrorBoundary";
import MaghrebTribesMap from "../components/MaghrebTribesMap";

export default function Home() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  const [viewTree, setViewTree] = useState(null);
  const [viewPeople, setViewPeople] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [featuredTrees, setFeaturedTrees] = useState([]);
  const cardBg = theme === "dark" ? "bg-[#151a21]" : "bg-white";
  const borderColor =
    theme === "dark" ? "border-[#24304A]" : "border-[#d8c7b0]";
  const metaPanel =
    theme === "dark"
      ? "bg-white/5 border-white/10"
      : "bg-[#5d4037]/5 border-[#d8c7b0]/60";
  const apiRoot = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  const downloadTreeUrl = (id) => `${apiRoot}/api/trees/${id}/gedcom`;

  useEffect(() => {
    // Load Featured Trees
    (async () => {
      try {
        const isMock = localStorage.getItem("mockupDataActive") === "true";
        if (isMock) {
          const mockTrees = Array.from({ length: 3 }).map((_, i) => ({
            id: `mock-tree-${i}`,
            title: `Family Tree of Clan ${i + 1}`,
            description: `Featured public tree.`,
            owner_name: "kameladmin",
            isPublic: true,
            hasGedcom: i % 2 === 0,
            archiveSource: "National Archive",
            documentCode: `ALG-${2000 + i}`,
            createdAt: new Date().toISOString(),
          }));
          setFeaturedTrees(mockTrees);
          return;
        }
        const { data } = await api.get("/trees");
        if (Array.isArray(data)) {
          setFeaturedTrees(data.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load home trees", err);
      }
    })();
  }, []);

  const handleViewTree = async (tree) => {
    setViewTree(tree);
    setViewPeople([]);
    setViewLoading(true);

    try {
      if (String(tree.id).startsWith("mock-")) {
        const familyName = tree.title.split(" ").pop() || "Mock";
        const mockPeople = [
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
        setViewPeople(mockPeople);
        setViewLoading(false);
        return;
      }
      if (!tree.hasGedcom) {
        setViewLoading(false);
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

  return (
    <div className="heritage-page-root">
      {/* ================== HERO SECTION ================== */}
      <section className="heritage-hero">
        <div className="absolute inset-0 z-1 opacity-100 pointer-events-auto">
          <MaghrebTribesMap />
        </div>

        <div
          className="relative z-20 text-center space-y-8"
          style={{ pointerEvents: "none" }}
        >
          <h1 className="pointer-events-auto">
            {t("home_hero_title", "Discover Your Maghreb Heritage")}
          </h1>

          <p className="pointer-events-auto">
            Journey through centuries of lineage, culture, identity and North
            African civilization. Preserve the stories that shaped your family -
            from Ottoman registers to modern civil archives.
          </p>

          <NavLink
            to="/library"
            className="hero-cta pointer-events-auto text-black hover:text-dark dark:text-white"
          >
            {t("start_exploring", "Start Exploring")}
          </NavLink>
        </div>
      </section>

      {/* ================== FAMILY TREE SECTION ================== */}
      <section className="roots-section roots-section-alt mb-16">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center">
            <h2 className="roots-heading">
              {t("family_tree_builder", "Family Tree Builder")}
            </h2>
            <p className="max-w-3xl mx-auto text-lg opacity-90">
              Visualize your ancestry with a detailed interactive tree. Add
              generations, connect relatives, store historical documents, dates,
              photos and oral stories. Our builder supports Amazigh, Ottoman,
              Arabic, Colonial & modern naming formats.
            </p>
          </div>

          {/* Featured Trees Grid */}
          {featuredTrees.length > 0 && (
            <div className="grid md:grid-cols-3 gap-8">
              {featuredTrees.map((tree) => {
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
                          <p className="text-sm opacity-70 flex items-center gap-1">
                            <UserCircle2 className="w-3 h-3" />
                            {tree.owner || tree.owner_name || "Admin"}
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
                          "Discover this public family lineage."}
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

          {/* Feature grid */}
          <div className="roots-grid grid-cols-1 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Build Multi-Generational Trees",
                desc: "Connect parents, grandparents, historical ancestors & extended families.",
              },
              {
                icon: Scroll,
                title: "Attach Historical Documents",
                desc: "Upload birth records, marriage papers, ANOM archives, manuscripts & more.",
              },
              {
                icon: Compass,
                title: "Trace Migration Paths",
                desc: "Discover how your lineage moved across regions: Kabylia, Sahara, Tunisia, Morocco...",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="roots-card text-center"
                data-aos="zoom-up"
              >
                <item.icon className="w-12 h-12 mx-auto mb-4 text-[#5d4037]" />
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="opacity-90">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <NavLink to="/library" className="roots-cta">
              {t("see_more", "See more")}
            </NavLink>
          </div>
        </div>
      </section>

      {/* ================== ANCESTRAL STORIES ================== */}
      <section className="roots-section mb-16">
        <div className="max-w-6xl mx-auto space-y-10 text-center">
          <div>
            <h2 className="roots-heading">
              {t("ancestral_stories", "Ancestral Stories")}
            </h2>
            <p className="max-w-3xl mx-auto text-lg opacity-90">
              Every Maghreb family carries oral histories, legendary figures,
              migrations and struggles. Preserve your family's unique story
              through structured narrative timelines, memories, recorded
              interviews, and ancestral photo restoration.
            </p>
          </div>

          <div className="roots-grid grid-cols-1 md:grid-cols-3">
            {[
              {
                icon: Feather,
                title: "Record Oral Histories",
                desc: "Interview elders and preserve memories, sayings, poetry & Berber traditions.",
              },
              {
                icon: BookOpen,
                title: "Document Family Traditions",
                desc: "Tell the story behind your family's customs, crafts, cuisine, and celebrations.",
              },
              {
                icon: Users,
                title: "Reconstruct Lost Branches",
                desc: "Use Ottoman archives, French colonial records, and tribal memory to rebuild lost links.",
              },
            ].map((item, i) => (
              <div key={i} className="roots-card" data-aos="zoom-in">
                <item.icon className="w-12 h-12 mx-auto mb-4 text-[#d4af37]" />
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="opacity-90">{item.desc}</p>
              </div>
            ))}
          </div>

          <NavLink to="/library" className="roots-cta">
            {t("see_more", "See more")}
          </NavLink>
        </div>
      </section>

      {/* ================== LIBRARY ================== */}
      <section className="roots-section roots-section-alt mb-16">
        <div
          className="max-w-6xl mx-auto space-y-10 text-center"
          data-aos="fade-up"
        >
          <div>
            <h2 className="roots-heading">
              {t("library_title", "North African Genealogy Library")}
            </h2>
            <p className="max-w-3xl mx-auto text-lg opacity-90">
              Access a curated library of historical books, manuscripts,
              genealogical rolls, French colonial civil records, Ottoman diwans,
              tribal documents, and regional archives from Algeria, Morocco,
              Tunisia, Mauritania, and Libya.
            </p>
          </div>

          <div className="roots-grid grid-cols-1 md:grid-cols-3">
            {[
              "Manuscripts & Family Records",
              "Colonial Birth/Marriage/Death Registers",
              "Tribal Genealogy Books (Nasab)",
              "Ottoman & Qadi Registers",
              "Berber Oral Heritage Collections",
              "North African Migration Maps",
            ].map((item, i) => (
              <div
                key={i}
                className="roots-card flex items-center justify-center p-6"
                data-aos="fade-up"
              >
                <p className="font-bold text-lg">{item}</p>
              </div>
            ))}
          </div>

          <NavLink to="/library" className="roots-cta">
            {t("see_more", "See more")}
          </NavLink>
        </div>
      </section>

      {/* ================== ARCHIVES AND SOURCES ================== */}
      <section className="roots-section mb-16">
        <div
          className="max-w-6xl mx-auto space-y-10 text-center"
          data-aos="fade-up"
        >
          <div>
            <h2 className="roots-heading">
              {t("archives_and_sources", "Archives and Sources")}
            </h2>
            <p className="max-w-3xl mx-auto text-lg opacity-90">
              Discover the key historical sources used by genealogists: ANOM,
              Ottoman archives, Qadi justice books, Habous registers, municipal
              civil status and early census attempts.
            </p>
          </div>

          <div className="roots-grid grid-cols-1 md:grid-cols-3">
            {[
              "Ottoman Court Records (Mahkama)",
              "Qadi Marriage & Inheritance Documents",
              "Habous Property Registries",
              "ANOM French Colonial Archives",
              "1863 Senatus-Consulte Tribal Maps",
              "APC Municipal Civil Records",
            ].map((item, i) => (
              <div
                key={i}
                className="roots-card flex items-center justify-center p-6"
                data-aos="flip-up"
              >
                <p className="font-semibold">{item}</p>
              </div>
            ))}
          </div>

          <NavLink to="/archives" className="roots-cta">
            {t("see_more", "See more")}
          </NavLink>
        </div>
      </section>

      {/* TREE VIEWER MODAL */}
      {viewTree && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`bg-white dark:bg-[#2c1810] w-full max-w-[90vw] h-[90vh] rounded-lg shadow-2xl border border-[#e8dfca] flex flex-col overflow-hidden relative`}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#d4af37]/30 flex items-center justify-between bg-[#f8f5ef] dark:bg-[#3e2723]">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-[#5d4037] dark:text-[#d4af37]">
                  <Users className="w-5 h-5" />
                  {viewTree.title}
                </h2>
                <p className="text-xs opacity-60">Viewing Mode - Read Only</p>
              </div>
              <button
                onClick={() => setViewTree(null)}
                className="p-2 rounded-full hover:bg-black/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Canvas Content */}
            <div className="flex-1 relative bg-[#f5f1e8] dark:bg-[#1a0a05] overflow-hidden">
              {viewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5d4037]"></div>
                </div>
              ) : (
                <ErrorBoundary
                  fallback={({ error, reset }) => (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="rounded-lg border border-[#e8dfca] bg-white/90 px-6 py-5 text-sm text-[#5d4037] shadow-xl">
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
                          className="mt-3 inline-flex items-center rounded-md border border-[#e8dfca] px-3 py-1 text-xs font-semibold uppercase tracking-wide"
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
                    readOnly={true}
                  />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================== COMMUNITY SECTION ================== */}
      <section className="roots-section roots-section-alt">
        <div
          className="max-w-6xl mx-auto space-y-10 text-center"
          data-aos="zoom-in"
        >
          <h2 className="roots-heading">
            {t("join_our_community", "Join Our Community")}
          </h2>

          <p className="max-w-3xl mx-auto text-lg opacity-90">
            Share your findings, ask for translation help, and connect with
            distant cousins.
          </p>

          <NavLink to="/signup" className="roots-cta">
            {t("join_now", "Join Now")}
          </NavLink>
        </div>
      </section>
    </div>
  );
}
