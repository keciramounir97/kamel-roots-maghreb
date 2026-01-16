import { useEffect } from "react";
import { useThemeStore } from "../store/theme";
import AOS from "aos";
import "aos/dist/aos.css";
import {
  ShieldCheck,
  Lock,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";
import RootsPageShell from "../components/RootsPageShell";

export default function AccessReliability() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();

  useEffect(() => {
    AOS.init({ duration: 900, once: true });
  }, []);

  const cardBg = theme === "dark" ? "bg-[#1c1110]" : "bg-white";
  const borderColor = theme === "dark" ? "border-[#2c1810]" : "border-[#d8c7b0]";

  const accessGuides = [
    {
      icon: Lock,
      title: t("access_requirements_title", "Access Requirements"),
      description: t(
        "access_requirements_desc",
        "Some archives require appointment letters, national IDs, or family proof. Always confirm before visiting."
      ),
    },
    {
      icon: FileSearch,
      title: t("access_reference_title", "Reference Tracking"),
      description: t(
        "access_reference_desc",
        "Record archive box codes, shelf numbers, and page references to validate each citation."
      ),
    },
    {
      icon: ShieldCheck,
      title: t("access_protection_title", "Data Protection"),
      description: t(
        "access_protection_desc",
        "Respect privacy laws for modern civil records and avoid publishing sensitive personal data."
      ),
    },
  ];

  const reliabilityChecks = [
    {
      icon: CheckCircle2,
      title: t("reliability_cross_title", "Cross-check sources"),
      description: t(
        "reliability_cross_desc",
        "Validate the same lineage across multiple registers and oral testimonies."
      ),
    },
    {
      icon: AlertTriangle,
      title: t("reliability_gaps_title", "Identify gaps"),
      description: t(
        "reliability_gaps_desc",
        "Flag missing years, name variations, and inconsistent patronymics."
      ),
    },
    {
      icon: Scale,
      title: t("reliability_balance_title", "Balance narratives"),
      description: t(
        "reliability_balance_desc",
        "Combine written documentation with oral histories to avoid biased records."
      ),
    },
  ];

  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.4em] text-[#d4af37]">
            {t("access_reliability", "Access & Reliability")}
          </p>
          <h1 className="text-5xl font-bold">
            {t("access_title", "Access & Reliability of Sources")}
          </h1>
          <p className="max-w-4xl mx-auto text-lg opacity-90">
            {t(
              "access_intro",
              "Understand archive access rules and validate the reliability of every genealogy source."
            )}
          </p>
        </div>
      }
    >
      <section className="roots-section">
        <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-8">
          {t("access_guidelines", "Access Guidelines")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {accessGuides.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="fade-up"
            >
              <item.icon className="w-10 h-10 text-[#d4af37] mb-4" />
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="roots-section roots-section-alt">
        <h2 className="text-3xl font-bold border-l-8 border-[#d4af37] pl-4 mb-8">
          {t("reliability_checks", "Reliability Checks")}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {reliabilityChecks.map((item) => (
            <div
              key={item.title}
              className={`${cardBg} p-8 rounded-2xl shadow-xl border ${borderColor}`}
              data-aos="zoom-in"
            >
              <item.icon className="w-10 h-10 text-[#5d4037] mb-4" />
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="opacity-90">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </RootsPageShell>
  );
}
