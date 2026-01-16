import { useEffect } from "react";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Scroll,
  Landmark,
  Building,
  Map,
  BookOpen,
  FileText,
  Archive,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function Archives() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor = theme === "dark" ? "border-[#2c1810]" : "border-[#d8c7b0]";

  const archiveItems = [
    {
      icon: Scroll,
      title: t("archives_ottoman_title", "Ottoman Archives"),
      accent: "#d4af37",
      description: t(
        "archives_ottoman_desc",
        "Registers from the Beylik, Qadi courts, and administrative diwans preserve pre-colonial lineage records."
      ),
      bullets: [
        t(
          "archives_ottoman_b1",
          "Qadi court registers (marriage, inheritance, guardianship)"
        ),
        t("archives_ottoman_b2", "Habous & waqf property ledgers"),
        t("archives_ottoman_b3", "Beylik taxation and census notes"),
      ],
    },
    {
      icon: Landmark,
      title: t("archives_colonial_title", "Colonial Archives (ANOM)"),
      accent: "#5d4037",
      description: t(
        "archives_colonial_desc",
        "Colonial civil status records provide structured birth, marriage, and death documents."
      ),
      bullets: [
        t(
          "archives_colonial_b1",
          "Surnames fixation records (1882 onward)"
        ),
        t("archives_colonial_b2", "Colonial censuses & conscription rolls"),
        t("archives_colonial_b3", "Land surveys and settlement maps"),
      ],
    },
    {
      icon: Building,
      title: t("archives_apc_title", "Post-Independence APC Records"),
      accent: "#556b2f",
      description: t(
        "archives_apc_desc",
        "Municipal civil status offices hold modern files that bridge families into the present."
      ),
      bullets: [
        t("archives_apc_b1", "Birth/marriage/death registers"),
        t("archives_apc_b2", "Family booklets & ID archives"),
        t("archives_apc_b3", "Municipal migration documentation"),
      ],
    },
    {
      icon: Map,
      title: t("archives_maps_title", "Maps & Territorial Archives"),
      accent: "#d4af37",
      description: t(
        "archives_maps_desc",
        "Historical cartography traces family territories, tribal borders, and migration routes."
      ),
      bullets: [
        t("archives_maps_b1", "Senatus-consulte tribal maps (1863)"),
        t("archives_maps_b2", "Ottoman land surveys"),
        t("archives_maps_b3", "Colonial cadastral charts"),
      ],
    },
    {
      icon: BookOpen,
      title: t("archives_manuscripts_title", "Manuscripts & Nasab Texts"),
      accent: "#5d4037",
      description: t(
        "archives_manuscripts_desc",
        "Genealogical manuscripts, zawiya registries, and tribal chronicles provide narrative context."
      ),
      bullets: [
        t("archives_manuscripts_b1", "Tribal nasab manuscripts"),
        t("archives_manuscripts_b2", "Zawiya registers and lineage notes"),
        t("archives_manuscripts_b3", "Regional chronicle compilations"),
      ],
    },
    {
      icon: FileText,
      title: t("archives_private_title", "Private Collections"),
      accent: "#556b2f",
      description: t(
        "archives_private_desc",
        "Family-held deeds, letters, and oral histories often fill missing branches in public records."
      ),
      bullets: [
        t("archives_private_b1", "Property deeds and waqf deeds"),
        t("archives_private_b2", "Family correspondences"),
        t("archives_private_b3", "Oral testimonies and photos"),
      ],
    },
  ];

  const accessSteps = [
    {
      icon: Archive,
      title: t("archives_access_step1_title", "Plan your archive visit"),
      description: t(
        "archives_access_step1_desc",
        "Confirm opening hours, required IDs, and file request procedures before you travel."
      ),
    },
    {
      icon: BookOpen,
      title: t("archives_access_step2_title", "Use catalog references"),
      description: t(
        "archives_access_step2_desc",
        "Record shelf codes, archive boxes, and series numbers to retrieve documents efficiently."
      ),
    },
    {
      icon: ShieldCheck,
      title: t("archives_access_step3_title", "Document provenance"),
      description: t(
        "archives_access_step3_desc",
        "Capture archive citations and metadata to validate sources later."
      ),
    },
  ];

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-[#d4af37]">
            {t("archives", "Archives")}
          </p>
          <h1 className="text-5xl font-bold">
            {t("archives_title", "Archives & Civil Status Repositories")}
          </h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            {t(
              "archives_intro",
              "Navigate Ottoman court registers, colonial archives, and municipal civil status offices that preserve Maghreb genealogy."
            )}
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
        <h2 className="text-3xl font-bold mb-8">
          {t("archives_access", "How to Access Archives")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {accessSteps.map((step) => (
            <div
              key={step.title}
              className={`${cardBg} p-6 rounded-xl border ${borderColor} shadow-lg`}
              data-aos="zoom-in"
            >
              <step.icon className="w-10 h-10 mb-4 text-[#d4af37]" />
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="opacity-90">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </RootsPageShell>
  );
}
