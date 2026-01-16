/* eslint-disable no-unused-vars */
/* eslint-disable no-unsafe-finally */
import { useEffect, useMemo, useState } from "react";
import { fetchStats, fetchRecentActivity } from "../utils/api";
import { formatDate } from "../utils/helpers";
import { Users, BookOpen, Network, UserRound, Activity } from "lucide-react";
import { useThemeStore } from "../../store/theme";
import { useTranslation } from "../../context/TranslationContext";
import { useAuth } from "../components/AuthContext";
import { api } from "../../api/client";

/* -------------------- STAT CARD -------------------- */
function StatCard({ title, value, color, Icon, isDark }) {
  const cardBg = isDark ? "bg-[#3e2723]" : "bg-white";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const hover = isDark ? "hover:bg-white/5" : "hover:bg-[#5d4037]/5";

  return (
    <div
      className={`rounded-lg shadow-sm p-5 border transition ${cardBg} ${border} ${hover}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm opacity-70">{title}</div>
          <div
            className="text-3xl font-extrabold mt-1"
            style={{ color }}
          >
            {value}
          </div>
        </div>

        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ background: `${color}1A` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* -------------------- DASHBOARD -------------------- */
export default function Dashboard() {
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const isAdmin = user?.role === 1;

  const pageBg = isDark ? "bg-[#3e2723]" : "bg-[#f5f1e8]";
  const text = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const card = isDark ? "bg-[#3e2723]" : "bg-white";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const subtle = isDark ? "bg-white/5" : "bg-black/[0.02]";
  const hoverRow = isDark ? "hover:bg-white/5" : "hover:bg-black/[0.02]";

  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    trees: 0,
    people: 0,
    myTrees: 0,
    publicTrees: 0,
    publicBooks: 0,
    events: 0,
  });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        if (isAdmin) {
          const [s, a] = await Promise.all([
            fetchStats(),
            fetchRecentActivity(),
          ]);

          if (!mounted) return;

          setStats((prev) => ({
            ...prev,
            ...(s || { users: 0, books: 0, trees: 0, people: 0 }),
          }));
          setActivity(Array.isArray(a) ? a : []);
        } else {
          const [
            { data: myTrees },
            { data: publicTrees },
            { data: publicBooks },
            { data: myActivity },
          ] = await Promise.all([
            api.get("/my/trees"),
            api.get("/trees"),
            api.get("/books"),
            api.get("/activity", { params: { limit: 50 } }),
          ]);

          if (!mounted) return;

          const myTreesCount = Array.isArray(myTrees) ? myTrees.length : 0;
          const publicTreesCount = Array.isArray(publicTrees) ? publicTrees.length : 0;
          const publicBooksCount = Array.isArray(publicBooks) ? publicBooks.length : 0;
          const eventsCount = Array.isArray(myActivity) ? myActivity.length : 0;

          setStats((prev) => ({
            ...prev,
            myTrees: myTreesCount,
            publicTrees: publicTreesCount,
            publicBooks: publicBooksCount,
            events: eventsCount,
          }));
          setActivity(Array.isArray(myActivity) ? myActivity : []);
        }
      } catch {
        if (!mounted) return;
        setError("Failed to load dashboard data.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const cards = useMemo(
    () =>
      isAdmin
        ? [
            { title: t("total_users", "Total Users"), value: stats.users, color: "#5d4037", Icon: Users },
            { title: t("total_books", "Total Books"), value: stats.books, color: "#d4af37", Icon: BookOpen },
            { title: t("family_trees", "Family Trees"), value: stats.trees, color: "#556b2f", Icon: Network },
            { title: t("total_people", "Total People"), value: stats.people, color: "#556b2f", Icon: UserRound },
          ]
        : [
            { title: t("my_trees", "My Trees"), value: stats.myTrees, color: "#5d4037", Icon: Network },
            { title: t("public_trees", "Public Trees"), value: stats.publicTrees, color: "#556b2f", Icon: Network },
            { title: t("public_books", "Public Books"), value: stats.publicBooks, color: "#d4af37", Icon: BookOpen },
            { title: t("my_activity", "My Activity"), value: stats.events, color: "#556b2f", Icon: Activity },
          ],
    [stats, t, isAdmin]
  );

  return (
    <div className={`p-4 min-h-screen ${pageBg} ${text} heritage-page-root`}>
      {/* HEADER STRIP */}
      <div
        className={`rounded-lg p-5 mb-6 border ${border}
        bg-gradient-to-r from-[#5d4037]/15 via-[#d4af37]/12 to-[#556b2f]/10 heritage-panel heritage-panel--accent`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-md flex items-center justify-center border ${border} ${card}`}
          >
            <Activity className="w-5 h-5 text-[#5d4037]" />
          </div>
          <div>
            <div className="text-xl font-bold">
              {isAdmin
                ? t("admin_overview", "Admin Overview")
                : t("my_dashboard", "My Dashboard")}
            </div>
            <div className="text-sm opacity-70">
              {isAdmin
                ? t("stats_latest_actions", "Stats & latest actions across the platform")
                : t("my_dashboard_subtitle", "Your content & recent activity")}
            </div>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 heritage-panel heritage-panel--grid">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} isDark={isDark} />
        ))}
      </div>

      {/* RECENT ACTIVITY */}
      <div className={`rounded-lg shadow-sm p-5 border ${border} ${card} heritage-panel`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">{t("recent_activity", "Recent Activity")}</h3>
          <button
            className={`px-3 py-2 rounded-md border ${border} hover:opacity-90`}
            onClick={() => window.location.reload()}
            type="button"
          >
            {t("refresh", "Refresh")}
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center opacity-70">{t("loading", "Loading...")}</div>
        ) : error ? (
          <div className="py-10 text-center">
            <div className="text-[#a0552a] font-semibold">{error}</div>
            <div className="opacity-70 text-sm mt-1">
              Check your API endpoints and try again.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="heritage-table w-full text-sm">
              <thead className={subtle}>
                <tr className={`text-start border-b ${border}`}>
                  <th className="py-3 px-2 text-start">{t("type", "Type")}</th>
                  <th className="py-3 px-2 text-start">{t("description", "Description")}</th>
                  <th className="py-3 px-2 text-start">{t("user", "User")}</th>
                  <th className="py-3 px-2 text-start">{t("date", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center opacity-60">
                      {t("no_activity_yet", "No activity yet.")}
                    </td>
                  </tr>
                ) : (
                  activity.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b ${border} ${hoverRow}`}
                    >
                      <td className="py-3 px-2 font-medium">{row.type}</td>
                      <td className="py-3 px-2">{row.description}</td>
                      <td className="py-3 px-2">{row.user}</td>
                      <td className="py-3 px-2">{formatDate(row.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

