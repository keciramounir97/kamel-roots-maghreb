import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isRtlLocale,
  tForLocale,
} from "../utils/translations";

const STORAGE_KEY = "locale";

const TranslationContext = createContext(null);

export function TranslationProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LOCALES.includes(saved) ? saved : DEFAULT_LOCALE;
  });

  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const value = useMemo(
    () => ({
      locale,
      dir,
      locales: SUPPORTED_LOCALES,
      setLocale,
      t: (key, fallback) => tForLocale(locale, key, fallback),
    }),
    [locale, dir]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return ctx;
}

