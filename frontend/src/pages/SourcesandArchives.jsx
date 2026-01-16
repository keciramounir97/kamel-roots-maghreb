import { useEffect } from "react";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import { Scroll, Landmark, Building, Map, BookOpen, FileText, Library } from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function SourcesandArchives() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const sectionAlt = theme === "dark" ? "bg-[#171c25]" : "bg-[#f8f5ef]";
  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor = theme === "dark" ? "border-[#2c1810]" : "border-[#d8c7b0]";

  const archiveItems = [
    {
      icon: Scroll,
      title: "Ottoman Archives",
      accent: "#d4af37",
      description:
        "Legal, administrative, and military documents from the Ottoman Beylik, predating modern civil registers.",
      bullets: [
        "Qadi court registers (marriages, inheritances, land)",
        "Habous & Waqf property records",
        "Beylik administration files",
      ],
    },
    {
      icon: Landmark,
      title: "Qadi Registers",
      accent: "#5d4037",
      description:
        "Detailed rulings documenting family disputes, guardianships, and interpersonal contracts spanning generations.",
      bullets: [
        "Marriage & divorce contracts",
        "Inheritance settlements",
        "Property lands & succession rulings",
      ],
    },
    {
      icon: Building,
      title: "Habous / Waqf Archives",
      accent: "#556b2f",
      description:
        "Religious endowment files offering familial notes, succession chains, and donor relations.",
      bullets: [
        "Property deeds & land grants",
        "Family endowment lists",
        "Guardian nominations & lineage roles",
      ],
    },
    {
      icon: BookOpen,
      title: "Colonial Archives (ANOM)",
      accent: "#d4af37",
      description:
        "French colonial administrations documented surnames and civil status across North Africa.",
      bullets: [
        "Birth, marriage & death certificates",
        "Census & military conscription rolls",
        "Colonial maps and territorial records",
      ],
    },
    {
      icon: FileText,
      title: "Post-Independence APC Records",
      accent: "#5d4037",
      description:
        "Municipal civil status registers contain modern lineage entries and migration notes.",
      bullets: [
        "Modern birth/marriage/death files",
        "National ID & family booklets",
        "Regional migration maps",
      ],
    },
    {
      icon: Map,
      title: "Maps & Territorial Archives",
      accent: "#556b2f",
      description:
        "Historical maps, surveys, and cadastral surveys trace family territories and migrations.",
      bullets: [
        "1863 tribal senatus-consulte maps",
        "Ottoman & colonial land surveys",
        "Modern commune boundary transitions",
      ],
    },
  ];

  const guideItems = [
    {
      icon: Library,
      title: "National Archives",
      description: "Located in Tunis, Rabat, and Algiers with millions of administrative registers.",
    },
    {
      icon: Building,
      title: "Municipal APC Offices",
      description: "Primary source for civil status since independence: birth, marriage, death files.",
    },
    {
      icon: BookOpen,
      title: "Digital Collections",
      description: "ANOM, Gallica, Google Books, and regional digitization platforms host searchable documents.",
    },
  ];

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-[#d4af37]">Sources & Archives</p>
          <h1 className="text-5xl font-bold">Archives & Documentary Sources</h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            Navigate the essential repositories used by Maghreb genealogists—Ottoman diwans, colonial registers, waqf files, and modern APC archives.
          </p>
        </div>
      }
    >
      <section className="roots-section space-y-10">
        <div className="grid lg:grid-cols-2 gap-8">
          {archiveItems.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="fade-up"
            >
              <div className="flex items-center gap-4 mb-4">
                <item.icon className="w-10 h-10" style={{ color: item.accent }} />
                <h2 className="text-3xl font-bold">{item.title}</h2>
              </div>
              <p className="opacity-90 mb-4">{item.description}</p>
              <ul className="list-disc pl-6 space-y-2 opacity-90">
                {item.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="roots-section roots-section-alt">
        <h2 className="text-3xl font-bold mb-8">How to Access These Archives</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {guideItems.map((guide) => (
            <div
              key={guide.title}
              className={`${cardBg} p-6 rounded-xl border ${borderColor} shadow-lg`}
              data-aos="zoom-in"
            >
              <guide.icon className="w-10 h-10 mb-4 text-[#d4af37]" />
              <h3 className="text-xl font-bold mb-2">{guide.title}</h3>
              <p className="opacity-90">{guide.description}</p>
            </div>
          ))}
        </div>
      </section>
    </RootsPageShell>
  );
}
