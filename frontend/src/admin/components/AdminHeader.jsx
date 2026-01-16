import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, Search, UserCircle2 } from "lucide-react";
import { useThemeStore } from "../../store/theme";
import { api } from "../../api/client";
import { useTranslation } from "../../context/TranslationContext";
import LanguageMenu from "../../components/LanguageMenu";

export default function AdminHeader({ onToggleSidebar }) {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState({ trees: [], people: [] });
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const suggestTimerRef = useRef(null);
  const latestQueryRef = useRef("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSuggestOpen(false);
    navigate(`/library?q=${encodeURIComponent(search)}`);
  };

  const isDark = theme === "dark";

  const text = isDark ? "text-[#f8f5ef]" : "text-[#2c1810]";
  const cardBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const inputBg = isDark ? "bg-[#3e2723]" : "bg-[#f8f5ef]";
  const inputText = isDark ? "text-[#e8dfca]" : "text-[#2c1810]";
  const iconColor = isDark ? "text-[#e8dfca]/70" : "text-[#8d6e63]";
  const accent = isDark ? "text-[#a0552a]" : "text-[#5d4037]";
  const hoverItem = isDark ? "hover:bg-white/10" : "hover:bg-[#5d4037]/8";

  useEffect(() => {
    const q = String(search || "").trim();
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
  }, [search]);

  const handleSuggestFocus = () => {
    if (String(search || "").trim().length >= 2) {
      setSuggestOpen(true);
    }
  };

  const handleSuggestBlur = () => {
    window.setTimeout(() => setSuggestOpen(false), 150);
  };

  const handlePickSuggestion = (value) => {
    if (!value) return;
    setSearch(value);
    setSuggestOpen(false);
    navigate(`/library?q=${encodeURIComponent(value)}`);
  };

  return (
    <header className="admin-header-strip sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="w-11 h-11 rounded-md flex items-center justify-center 
            bg-[#f5f1e8] text-[#5d4037] shadow hover:opacity-95 active:scale-[0.97]"
            aria-label="toggle-sidebar"
            type="button"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="roots-logo text-white">
            roots
            <span>maghreb</span>
          </Link>
        </div>

        <form
          onSubmit={handleSearch}
          className="hidden md:block flex-1 max-w-2xl relative"
        >
          <Search
            className={`w-4 h-4 absolute rtl:right-3 rtl:left-auto ltr:left-3 top-1/2 -translate-y-1/2 ${iconColor}`}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={handleSuggestFocus}
            onBlur={handleSuggestBlur}
            className={`w-full rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 rounded-full border 
            focus:outline-none focus:ring-2 focus:ring-[#5d4037]/25
            ${inputBg} ${inputText} ${border}`}
            placeholder={t("search", "Search...")}
            aria-label="admin-search"
          />
          {suggestOpen ? (
            <div
              className={`absolute left-0 right-0 mt-2 rounded-lg border ${border} ${cardBg} shadow-xl overflow-hidden z-50`}
            >
              {suggestLoading ? (
                <div className="px-4 py-3 text-sm opacity-70">
                  {t("loading", "Loading...")}
                </div>
              ) : suggestError ? (
                <div className="px-4 py-3 text-sm text-red-500">
                  {suggestError}
                </div>
              ) : suggestions.trees.length || suggestions.people.length ? (
                <div className="max-h-64 overflow-auto">
                  {suggestions.trees.map((item) => (
                    <button
                      key={`tree-${item.id}`}
                      type="button"
                      onMouseDown={() => handlePickSuggestion(item.title)}
                      className={`w-full text-left px-4 py-2 ${hoverItem} ${text}`}
                    >
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs opacity-60">
                        {t("trees", "Family Trees")}
                      </div>
                    </button>
                  ))}
                  {suggestions.people.map((item) => (
                    <button
                      key={`person-${item.id}`}
                      type="button"
                      onMouseDown={() => handlePickSuggestion(item.name || "")}
                      className={`w-full text-left px-4 py-2 ${hoverItem} ${text}`}
                    >
                      <div className="text-sm font-semibold">
                        {item.name || "Unknown"}
                      </div>
                      <div className="text-xs opacity-60">
                        {item.tree_title
                          ? `Tree: ${item.tree_title}`
                          : "Person"}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm opacity-70">
                  {t("no_results", "No suggestions")}
                </div>
              )}
            </div>
          ) : null}
        </form>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-md 
            text-[#5d4037] bg-white/70 shadow"
          >
            {t("back_to_main", "Back to Main Site")}
          </Link>

          <LanguageMenu
            buttonClassName={`h-12 w-12 rounded-md border flex items-center justify-center transition-all ${
              isDark
                ? "bg-white/5 hover:bg-white/10 border-white/10"
                : "bg-[#f5f1e8] hover:bg-[#5d4037]/10 border-[#e8dfca]"
            }`}
          />

          <button
            className={`w-11 h-11 rounded-md border flex items-center justify-center
            ${hoverItem} ${border}`}
            aria-label="notifications"
            type="button"
          >
            <Bell className={`w-5 h-5 ${iconColor}`} />
          </button>

          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-md border ${border} ${inputBg}`}
          >
            <UserCircle2 className={`w-5 h-5 ${accent}`} />
            <span className={`font-medium ${accent}`}>
              {t("admin", "Admin")}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-header-accent" />
    </header>
  );
}
