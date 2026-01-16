import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useThemeStore } from "../../store/theme";
import { useTranslation } from "../../context/TranslationContext";

const LABELS = {
  admin: "Admin",
  users: "Users",
  books: "Books",
  trees: "Family Trees",
  settings: "Settings",
  activity: "Activity",
};

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const parts = pathname.split("/").filter(Boolean);

  const segments = parts.map((p, i) => ({
    raw: p,
    label: t(p) || LABELS[p] || p,
    to: "/" + parts.slice(0, i + 1).join("/"),
  }));

  const baseText = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const accent = "text-[#5d4037]";
  const muted = isDark ? "text-[#f8f5ef]/50" : "text-[#3e2723]/50";

  return (
    <nav className={`text-sm mb-4 ${baseText}`}>
      <ol className="flex items-center gap-2 flex-wrap">
        {/* Home */}
        <li>
          <Link
            to="/"
            className={`inline-flex items-center gap-2 ${accent} hover:underline`}
          >
            <Home className="w-4 h-4" />
            <span>{t("home", "Home")}</span>
          </Link>
        </li>

        {/* Segments */}
        {segments.map((s, i) => (
          <li key={s.to} className="flex items-center gap-2">
            <ChevronRight className={`w-4 h-4 ${muted}`} />

            {i === segments.length - 1 ? (
              <span className="font-semibold">
                {String(s.label).replaceAll("-", " ")}
              </span>
            ) : (
              <Link
                to={s.to}
                className={`${accent} hover:underline capitalize`}
              >
                {String(s.label).replaceAll("-", " ")}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

