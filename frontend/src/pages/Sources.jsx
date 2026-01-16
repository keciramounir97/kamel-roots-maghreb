import { useEffect } from "react";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  BookOpen,
  Library,
  Mic,
  FileText,
  Scroll,
  Globe,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function Sources() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor = theme === "dark" ? "border-[#2c1810]" : "border-[#d8c7b0]";

  const primarySources = [
    {
      icon: Scroll,
      title: t("sources_manuscripts_title", "Manuscripts & Nasab"),
      description: t(
        "sources_manuscripts_desc",
        "Genealogical manuscripts and zawiya registries capture lineage chains and tribal narratives."
      ),
    },
    {
      icon: FileText,
      title: t("sources_civil_title", "Civil Status Records"),
      description: t(
        "sources_civil_desc",
        "Birth, marriage, and death certificates anchor relationships with verified dates."
      ),
    },
    {
      icon: Mic,
      title: t("sources_oral_title", "Oral Histories"),
      description: t(
        "sources_oral_desc",
        "Recorded testimonies from elders provide context for migrations, alliances, and patronymics."
      ),
    },
    {
      icon: Library,
      title: t("sources_private_title", "Private Family Archives"),
      description: t(
        "sources_private_desc",
        "Letters, property deeds, and family notebooks often contain missing branches."
      ),
    },
  ];

  const secondarySources = [
    {
      icon: BookOpen,
      title: t("sources_academic_title", "Academic Studies"),
      description: t(
        "sources_academic_desc",
        "Anthropology and history publications contextualize tribal movements and social structures."
      ),
    },
    {
      icon: Globe,
      title: t("sources_digital_title", "Digital Collections"),
      description: t(
        "sources_digital_desc",
        "ANOM, Gallica, and regional digitization portals provide searchable scans."
      ),
    },
  ];

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-[#d4af37]">
            {t("sources", "Sources")}
          </p>
          <h1 className="text-5xl font-bold">
            {t("sources_title", "Primary Sources for Maghreb Genealogy")}
          </h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            {t(
              "sources_intro",
              "Combine documentary evidence with oral narratives to reconstruct family histories."
            )}
          </p>
        </div>
      }
    >
      <section className="roots-section">
        <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-8">
          {t("primary_sources", "Primary Sources")}
        </h2>
        <div className="grid lg:grid-cols-2 gap-8">
          {primarySources.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="fade-up"
            >
              <div className="flex items-center gap-4 mb-3">
                <item.icon className="w-10 h-10 text-[#d4af37]" />
                <h3 className="text-2xl font-bold">{item.title}</h3>
              </div>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="roots-section roots-section-alt">
        <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-8">
          {t("secondary_sources", "Secondary Sources")}
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {secondarySources.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="zoom-in"
            >
              <div className="flex items-center gap-4 mb-3">
                <item.icon className="w-10 h-10 text-[#5d4037]" />
                <h3 className="text-2xl font-bold">{item.title}</h3>
              </div>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </RootsPageShell>
  );
}
