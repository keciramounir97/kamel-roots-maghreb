import { useEffect } from "react";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  Scroll,
  Crown,
  Shield,
  BookOpen,
  Map,
  Landmark,
  Archive,
  FileText,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function Periods() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor = theme === "dark" ? "border-[#2c1810]" : "border-[#d8c7b0]";

  const periods = [
    {
      title: t("periods_ottoman_title", "Ottoman Period (1516-1830)"),
      icon: Crown,
      accent: "#d4af37",
      description: t(
        "periods_ottoman_desc",
        "Patronymic lineages, Qadi archives, waqf documents, and tribal authority defined family structures."
      ),
      bullets: [
        t("periods_ottoman_b1", "Patronymic naming: Ahmed ben Mohamed ben Ali"),
        t(
          "periods_ottoman_b2",
          "Qadi court registers for marriage & inheritance"
        ),
        t(
          "periods_ottoman_b3",
          "Habous & religious property documentation"
        ),
        t("periods_ottoman_b4", "Tribal councils and zawiya genealogies"),
      ],
    },
    {
      title: t("periods_transition_title", "Transition (1830-1882)"),
      icon: Shield,
      accent: "#5d4037",
      description: t(
        "periods_transition_desc",
        "French military governance introduced civil status experiments alongside traditional systems."
      ),
      bullets: [
        t("periods_transition_b1", "Arab Bureau colonial oversight"),
        t("periods_transition_b2", "Early census and registration attempts"),
        t(
          "periods_transition_b3",
          "Ethnographic reports on tribal structure"
        ),
        t("periods_transition_b4", "Military records for controlled regions"),
      ],
    },
    {
      title: t("periods_colonial_title", "Colonial Era (1882-1962)"),
      icon: BookOpen,
      accent: "#556b2f",
      description: t(
        "periods_colonial_desc",
        "Fixed surnames and modern civil architecture created systematic records preserved at ANOM."
      ),
      bullets: [
        t("periods_colonial_b1", "Surnames fixation law (1882)"),
        t(
          "periods_colonial_b2",
          "Municipal birth/marriage/death registries"
        ),
        t("periods_colonial_b3", "ANOM-digitized colonial files"),
        t("periods_colonial_b4", "Land surveys and civil cadastre"),
      ],
    },
    {
      title: t(
        "periods_independence_title",
        "Independence & Beyond (1962-Present)"
      ),
      icon: Landmark,
      accent: "#5d4037",
      description: t(
        "periods_independence_desc",
        "Municipal APC offices maintain up-to-date civil status with national identity and migration logs."
      ),
      bullets: [
        t("periods_independence_b1", "National ID registration files"),
        t("periods_independence_b2", "APC birth/marriage/death records"),
        t("periods_independence_b3", "Regional migration studies"),
        t("periods_independence_b4", "Diaspora documentation and reunification"),
      ],
    },
  ];

  const timeline = [
    {
      period: t("periods_timeline_ottoman", "1516-1830 - Ottoman Rule"),
      detail: t(
        "periods_timeline_ottoman_desc",
        "Patronymic traditions, Qadi rulings, waqf endowments."
      ),
    },
    {
      period: t("periods_timeline_transition", "1830-1882 - Transition"),
      detail: t(
        "periods_timeline_transition_desc",
        "Military rule, first census data, Balkan-style reforms."
      ),
    },
    {
      period: t("periods_timeline_colonial", "1882-1962 - Colonial Era"),
      detail: t(
        "periods_timeline_colonial_desc",
        "Permanent surnames, civil registers, ANOM archives."
      ),
    },
    {
      period: t("periods_timeline_independence", "1962-Present - Independence"),
      detail: t(
        "periods_timeline_independence_desc",
        "APC civil records, migration tracking, digital archives."
      ),
    },
  ];

  const recordHighlights = [
    {
      icon: Scroll,
      title: t("periods_highlight_ottoman_title", "Ottoman Records"),
      detail: t(
        "periods_highlight_ottoman_desc",
        "Qadi rulings, waqf deeds, and tribal convenings are often preserved in regional archives."
      ),
    },
    {
      icon: Archive,
      title: t("periods_highlight_colonial_title", "Colonial Registers"),
      detail: t(
        "periods_highlight_colonial_desc",
        "Civil status files and cadastral records anchor surname transitions and family locations."
      ),
    },
    {
      icon: FileText,
      title: t("periods_highlight_modern_title", "Modern Civil Status"),
      detail: t(
        "periods_highlight_modern_desc",
        "APC offices maintain certified birth, marriage, and death extracts used for verification."
      ),
    },
    {
      icon: Map,
      title: t("periods_highlight_migration_title", "Migration Maps"),
      detail: t(
        "periods_highlight_migration_desc",
        "Administrative reports and cartography trace movement between oases, coasts, and hinterlands."
      ),
    },
  ];

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-[#d4af37]">
            {t("periods_hero_label", "Historical Periods")}
          </p>
          <h1 className="text-5xl font-bold">
            {t("periods_hero_title", "Maghreb Genealogy Through Time")}
          </h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            {t(
              "periods_hero_intro",
              "Chart the shifts from Ottoman patronymics through colonial surname reforms to modern civil archives."
            )}
          </p>
        </div>
      }
    >
      <section className="roots-section">
        <div className="grid lg:grid-cols-2 gap-8">
          {periods.map((period) => (
            <div
              key={period.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="fade-up"
            >
              <div className="flex items-center gap-4 mb-4">
                <period.icon className="w-10 h-10" style={{ color: period.accent }} />
                <h2 className="text-3xl font-bold">{period.title}</h2>
              </div>
              <p className="opacity-90 mb-4">{period.description}</p>
              <ul className="list-disc pl-6 space-y-3 opacity-90">
                {period.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="roots-section roots-section-alt">
        <h2 className="text-3xl font-bold text-center mb-8">
          {t("periods_timeline_title", "Timeline Overview")}
        </h2>
        <div className="relative border-l-4 border-[#d4af37] ml-6 space-y-8">
          {timeline.map((item, index) => (
            <div key={item.period} className="pl-8" data-aos="fade-right" data-aos-delay={index * 150}>
              <h3 className="text-xl font-bold">{item.period}</h3>
              <p className="opacity-80 mt-1">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="roots-section">
        <h2 className="text-3xl font-bold text-center mb-8">
          {t("periods_research_focus_title", "Research Focus by Period")}
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {recordHighlights.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-6 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="zoom-in"
            >
              <div className="flex items-center gap-4 mb-3">
                <item.icon className="w-9 h-9 text-[#d4af37]" />
                <h3 className="text-2xl font-bold">{item.title}</h3>
              </div>
              <p className="opacity-90">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </RootsPageShell>
  );
}
