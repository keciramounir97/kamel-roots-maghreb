import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Menu,
  Search,
  X,
  LogOut,
  User,
  Sun,
  Moon,
} from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useThemeStore } from "../store/theme";
import { useAuth } from "../admin/components/AuthContext";
import { api } from "../api/client";
import { useTranslation } from "../context/TranslationContext";
import LanguageMenu from "./LanguageMenu";

const searchSchema = z.object({
  query: z.string().min(1, "Search cannot be empty"),
});

export default function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ trees: [], people: [] });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const suggestTimerRef = useRef(null);
  const latestQueryRef = useRef("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({ resolver: zodResolver(searchSchema) });
  const searchField = register("query");

  const onSubmit = (data) => {
    setSuggestOpen(false);
    setMobileMenuOpen(false);
    navigate(`/library?q=${encodeURIComponent(data.query)}`);
  };

  const query = watch("query") || "";

  useEffect(() => {
    const q = String(query || "").trim();
    latestQueryRef.current = q;

    if (suggestTimerRef.current) {
      clearTimeout(suggestTimerRef.current);
    }

    if (q.length < 2) {
      setSuggestions({ trees: [], people: [] });
      setSuggestOpen(false);
      setSuggestLoading(false);
      setSuggestError("");
      return;
    }

    suggestTimerRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      setSuggestError("");
      try {
        const { data } = await api.get(
          `/search/suggest?q=${encodeURIComponent(q)}`
        );
        if (latestQueryRef.current !== q) return;
        setSuggestions({
          trees: Array.isArray(data?.trees) ? data.trees : [],
          people: Array.isArray(data?.people) ? data.people : [],
        });
        setSuggestOpen(true);
      } catch (err) {
        if (latestQueryRef.current !== q) return;
        setSuggestError(
          err.response?.data?.message || "Failed to load suggestions"
        );
        setSuggestions({ trees: [], people: [] });
      } finally {
        if (latestQueryRef.current === q) {
          setSuggestLoading(false);
        }
      }
    }, 300);

    return () => {
      if (suggestTimerRef.current) {
        clearTimeout(suggestTimerRef.current);
      }
    };
  }, [query]);

  const handleSuggestFocus = () => {
    if (String(query || "").trim().length >= 2) {
      setSuggestOpen(true);
    }
  };

  const handleSuggestBlur = () => {
    window.setTimeout(() => setSuggestOpen(false), 150);
  };

  const handlePickSuggestion = (value) => {
    if (!value) return;
    setValue("query", value, { shouldValidate: true });
    setSuggestOpen(false);
    navigate(`/library?q=${encodeURIComponent(value)}`);
  };

  const navLinks = [
    { to: "/", label: t("home", "Home") },
    { to: "/library", label: t("library", "Library") },
    { to: "/periods", label: t("periods", "Periods") },
    { to: "/archives", label: t("archives", "Archives") },
    { to: "/sources", label: t("sources", "Sources") },
    {
      to: "/access-reliability",
      label: t("access_reliability", "Access & Reliability"),
    },
  ];

  return (
    <header className="heritage-header">
      <div className="container">
        <div className="header-content">
          {/* Logo */}
          <Link to="/" className="logo" data-aos="fade-right">
            <div className="logo-icon">
              <BookOpen size={32} />
            </div>
            <div className="logo-text">
              roots
              <span>maghreb</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="header-nav hidden lg:flex" aria-label="Primary">
            <ul className="nav-links">
              {navLinks.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `header-link${isActive ? " active" : ""}`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
              {user && (
                <li>
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `header-link${isActive ? " active" : ""}`
                    }
                  >
                    {user?.role === 1
                      ? t("admin", "Admin")
                      : t("dashboard", "Dashboard")}
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>

          {/* Desktop Actions */}
          <div className="header-actions hidden lg:flex">
            <form className="header-search" onSubmit={handleSubmit(onSubmit)}>
              <Search className="search-icon" />
              <input
                {...searchField}
                type="search"
                placeholder={t("search", "Search...")}
                onFocus={handleSuggestFocus}
                onBlur={handleSuggestBlur}
                aria-label={t("search", "Search")}
              />
              {suggestOpen && (
                <div className="search-suggestions">
                  {suggestLoading ? (
                    <p>{t("loading", "Loading...")}</p>
                  ) : suggestError ? (
                    <p className="suggest-error">{suggestError}</p>
                  ) : suggestions.trees.length || suggestions.people.length ? (
                    <>
                      {suggestions.trees.map((item) => (
                        <button
                          key={`tree-${item.id}`}
                          type="button"
                          onMouseDown={() => handlePickSuggestion(item.title)}
                        >
                          <strong>{item.title}</strong>
                          <span>{t("trees", "Family Trees")}</span>
                        </button>
                      ))}
                      {suggestions.people.map((item) => (
                        <button
                          key={`person-${item.id}`}
                          type="button"
                          onMouseDown={() =>
                            handlePickSuggestion(item.name || "")
                          }
                        >
                          <strong>{item.name || "Unknown"}</strong>
                          <span>
                            {item.tree_title
                              ? `Tree: ${item.tree_title}`
                              : "Person"}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <p>{t("no_results", "No suggestions")}</p>
                  )}
                </div>
              )}
            </form>

            <button
              type="button"
              onClick={toggleTheme}
              className="heritage-btn-icon"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <LanguageMenu buttonClassName="roots-lang-btn" />

            {user ? (
              <button
                type="button"
                onClick={logout}
                className="heritage-logout flex items-center gap-2"
              >
                <LogOut size={18} />
                {t("logout", "Logout")}
              </button>
            ) : (
              <Link to="/login" className="heritage-btn">
                <User size={18} />
                {t("login", "Login")}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="mobile-menu-btn lg:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={t("menu", "Menu")}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`mobile-menu lg:hidden ${mobileMenuOpen ? "active" : ""}`}
        >
          <div className="mobile-menu-content">
            {/* Mobile Search */}
            <form className="mobile-search" onSubmit={handleSubmit(onSubmit)}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
                <input
                  {...searchField}
                  type="search"
                  placeholder={t("search", "Search...")}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#d4af37]/30 bg-white dark:bg-[#2c1810] focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                />
              </div>
            </form>

            {/* Mobile Nav Links */}
            <nav className="mobile-nav-links">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `mobile-nav-link${isActive ? " active" : ""}`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
              {user && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `mobile-nav-link${isActive ? " active" : ""}`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {user?.role === 1
                    ? t("admin", "Admin")
                    : t("dashboard", "Dashboard")}
                </NavLink>
              )}
            </nav>

            {/* Mobile Actions */}
            <div className="mobile-actions">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="mobile-action-btn"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                <span>
                  {theme === "dark"
                    ? t("light_mode", "Light Mode")
                    : t("dark_mode", "Dark Mode")}
                </span>
              </button>

              <LanguageMenu buttonClassName="mobile-action-btn w-full justify-start" />

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="mobile-action-btn text-red-600 dark:text-red-400"
                >
                  <LogOut size={20} />
                  <span>{t("logout", "Logout")}</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="mobile-action-btn bg-gradient-to-r from-[#5d4037] to-[#d4af37] text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={20} />
                  <span>{t("login", "Login")}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`mobile-nav-overlay${mobileMenuOpen ? " active" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />
    </header>
  );
}
