import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Activity,
  ShieldAlert,
  BookOpen,
  Users,
} from "lucide-react";
import { useThemeStore } from "../../store/theme";
import { api } from "../../api/client";
import { useTranslation } from "../../context/TranslationContext";
import { useAuth } from "../components/AuthContext";

export default function ActivityLog() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const isAdmin = user?.role === 1;

  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageBg = isDark ? "bg-[#3e2723]" : "bg-[#f5f1e8]";
  const text = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const card = isDark ? "bg-[#3e2723]" : "bg-white";
  const subtle = isDark ? "bg-white/5" : "bg-black/[0.02]";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const inputBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const inputText = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";

  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      (async () => {
        try {
          setLoading(true);
          setError("");
          const { data } = await api.get(isAdmin ? "/admin/activity" : "/activity", {
            params: {
              q,
              type,
              limit: 200,
            },
          });
          if (!active) return;
          setRows(Array.isArray(data) ? data : []);
        } catch (err) {
          if (!active) return;
          setRows([]);
          setError(err.response?.data?.message || "Failed to load activity");
        } finally {
          if (!active) return;
          setLoading(false);
        }
      })();
    }, 250);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [q, type, isAdmin]);

  const iconFor = useMemo(
    () => (t) => {
      if (t === "security") return <ShieldAlert className="w-4 h-4" />;
      if (t === "users") return <Users className="w-4 h-4" />;
      if (t === "books") return <BookOpen className="w-4 h-4" />;
      return <Activity className="w-4 h-4" />;
    },
    []
  );

  const chipClass = (t) => {
    if (t === "security") {
      return isDark ? "bg-[#556b2f]/20 text-[#f8f5ef]" : "bg-[#556b2f]/15 text-[#3e2723]";
    }
    if (t === "users") return "bg-[#5d4037]/15 text-[#5d4037]";
    if (t === "books") {
      return isDark ? "bg-[#d4af37]/20 text-[#f8f5ef]" : "bg-[#d4af37]/15 text-[#3e2723]";
    }
    return isDark
      ? "bg-white/10 text-[#f8f5ef]"
      : "bg-black/[0.05] text-[#3e2723]";
  };

  return (
    <div className={`p-4 min-h-screen ${pageBg} ${text} heritage-page-root`}>
      <div
        className={`rounded-lg p-5 mb-6 border ${border}
        bg-gradient-to-r from-[#5d4037]/15 to-[#3e2723]/10 heritage-panel heritage-panel--accent`}
      >
        <h3 className="text-2xl font-bold">{t("activity", "Activity Log")}</h3>
        <p className="opacity-70">
          {t("activity_desc", "Track what happens across your platform.")}
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={`heritage-input w-full pl-9 pr-3 py-2 rounded-md border
              focus:outline-none focus:ring-2 focus:ring-[#5d4037]/25
              ${inputBg} ${inputText} ${border}`}
              placeholder={t("search_activity", "Search activity...")}
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`heritage-input w-full pl-9 pr-3 py-2 rounded-md border
              focus:outline-none focus:ring-2 focus:ring-[#5d4037]/25
              ${inputBg} ${inputText} ${border}`}
            >
              <option value="all">{t("all_types", "All types")}</option>
              <option value="security">{t("security", "Security")}</option>
              <option value="users">{t("users", "Users")}</option>
              <option value="books">{t("books", "Books")}</option>
              <option value="trees">{t("trees", "Family Trees")}</option>
            </select>
          </div>

          <div className="flex items-center justify-end">
            <span className="text-sm opacity-70">
              {t("events_count", `${rows.length} event(s)`)}
            </span>
          </div>
        </div>
      </div>

      <div className={`rounded-lg shadow-sm border ${border} ${card} heritage-panel`}>
        <div className="overflow-x-auto">
          <table className="heritage-table w-full text-sm">
            <thead className={subtle}>
              <tr className={`text-left border-b ${border}`}>
                <th className="py-3 px-4">{t("type", "Type")}</th>
                <th className="py-3 px-4">{t("description", "Description")}</th>
                <th className="py-3 px-4">{t("user", "User")}</th>
                <th className="py-3 px-4">{t("date", "Date")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center opacity-60">
                    {t("loading", "Loading...")}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center">
                    <div className="text-[#a0552a] font-semibold">{error}</div>
                    {isAdmin ? (
                      <div className="text-sm opacity-70 mt-2">
                        {t("admin_required", "This page requires an admin account.")}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center opacity-60">
                    {t("no_activity_found", "No activity found.")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b ${border} ${
                      isDark ? "hover:bg-white/5" : "hover:bg-black/[0.02]"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold ${chipClass(
                          row.type
                        )}`}
                      >
                        {iconFor(row.type)}
                        {row.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">{row.description}</td>
                    <td className="py-3 px-4 font-medium">{row.user}</td>
                    <td className="py-3 px-4">
                      {new Date(row.date).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

