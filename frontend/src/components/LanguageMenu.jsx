import { useEffect, useMemo, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useThemeStore } from "../store/theme";
import { useTranslation } from "../context/TranslationContext";
import { localeLabel } from "../utils/translations";

const languageName = (locale) => {
  switch (locale) {
    case "fr":
      return "Francais";
    case "ar":
      return "Arabic";
    case "es":
      return "Espanol";
    case "en":
    default:
      return "English";
  }
};

export default function LanguageMenu({
  className = "",
  buttonClassName = "",
  align = "right",
}) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const { locale, locales, setLocale, t } = useTranslation();

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const menuClass = useMemo(() => {
    const bg = isDark ? "bg-[#3e2723]" : "bg-[#f8f5ef]";
    const text = isDark ? "text-[#e8dfca]" : "text-[#2c1810]";
    const border = isDark ? "border-[#3e2723]" : "border-[#e8dfca]";
    const shadow = "shadow-[0_16px_40px_rgba(0,0,0,0.25)]";
    const pos = align === "left" ? "left-0" : "right-0";
    return `absolute ${pos} mt-2 w-48 rounded-md border ${border} ${bg} ${text} ${shadow} overflow-hidden z-[999]`;
  }, [align, isDark]);

  const itemClass = useMemo(() => {
    const hover = isDark ? "hover:bg-white/10" : "hover:bg-[#d4af37]/12";
    return `w-full flex items-center justify-between px-3 py-2 text-sm ${hover}`;
  }, [isDark]);

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-label={t("language", "Language")}
        className={buttonClassName}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-2">
          <Globe className="w-5 h-5" />
          <span className="text-[11px] font-semibold">{localeLabel(locale)}</span>
        </span>
      </button>

      {open ? (
        <div className={menuClass} role="menu" aria-label="language-menu">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              className={`${itemClass} ${l === locale ? "opacity-100" : "opacity-90"}`}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
            >
              <span>{languageName(l)}</span>
              {l === locale ? (
                <span className="text-[11px] font-semibold text-[#d4af37]">â—</span>
              ) : (
                <span className="text-xs opacity-60">{localeLabel(l)}</span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}



