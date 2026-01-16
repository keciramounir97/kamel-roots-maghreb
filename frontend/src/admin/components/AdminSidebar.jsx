/* eslint-disable no-unused-vars */
import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useThemeStore } from "../../store/theme";
import { useTranslation } from "../../context/TranslationContext";
import LanguageMenu from "../../components/LanguageMenu";
import { useAuth } from "./AuthContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Network,
  Image,
  Settings,
  Activity,
  X,
} from "lucide-react";

const links = [
  { to: "/admin", end: true, labelKey: "dashboard", Icon: LayoutDashboard },
  { to: "/admin/users", labelKey: "users", Icon: Users },
  { to: "/admin/books", labelKey: "books", Icon: BookOpen },
  { to: "/admin/trees", labelKey: "trees", Icon: Network },
  { to: "/admin/gallery", labelKey: "gallery", Icon: Image },
  { to: "/admin/settings", labelKey: "settings", Icon: Settings },
  { to: "/admin/activity", labelKey: "activity", Icon: Activity },
];

export default function AdminSidebar({ open, onClose }) {
  const { theme } = useThemeStore();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const hoverItem = isDark ? "hover:bg-white/10" : "hover:bg-[#5d4037]/8";
  const activeItem = isDark
    ? "bg-[#5d4037]/20 border border-[#5d4037]/30"
    : "bg-[#5d4037]/10 border border-[#5d4037]/30";

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto bg-black/40"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 ltr:left-0 rtl:right-0 h-full w-72 z-40 transition-transform duration-300
        ${open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"}
        admin-sidebar text-white ltr:border-r-4 rtl:border-l-4 border-[#d4af37] shadow-2xl`}
      >
        <div
          className={`h-16 flex items-center justify-between px-4 border-b ${border}`}
        >
          <h2 className="text-xl tracking-wide font-bold">
            {t("admin_panel", "ROOTS MAGHREB ADMIN")}
          </h2>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-md flex items-center justify-center ${hoverItem}`}
            aria-label="close-sidebar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-6 flex flex-col h-[calc(100%-4rem)]">
          <nav className="admin-sidebar-nav flex flex-col gap-2">
            {links
              .filter((l) => l.labelKey !== "users" || user?.role === 1)
              .map(({ to, end, labelKey, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-md flex items-center gap-3 transition
                  ${
                    isActive
                      ? activeItem
                      : `${hoverItem} border border-transparent`
                  }`
                  }
                >
                  <Icon className="w-5 h-5 text-[#d4af37]" />
                  <span className="font-medium">{t(labelKey)}</span>
                </NavLink>
              ))}
          </nav>

          <div
            className={`mt-6 p-4 rounded-lg border ${border} ${
              isDark ? "bg-white/5" : "bg-white"
            }`}
          >
            <div className="text-sm opacity-80 mb-3">
              {t("preferences", "Preferences")}
            </div>

            <div className="flex items-center justify-between gap-3">
              <LanguageMenu
                align="left"
                buttonClassName={`border rounded-md px-3 py-2 inline-flex items-center gap-2 ${
                  isDark
                    ? "border-[#f8f5ef]/60 text-[#f8f5ef] hover:bg-white/10"
                    : "border-[#e8dfca] text-[#3e2723] hover:bg-[#5d4037]/8"
                }`}
              />
              <ThemeToggle
                className={`border rounded-md px-3 py-2 ${
                  isDark
                    ? "border-[#f8f5ef]/60 text-[#f8f5ef] hover:bg-white/10"
                    : "border-[#e8dfca] text-[#3e2723] hover:bg-[#5d4037]/8"
                }`}
              />
            </div>
          </div>

          <div
            className={`mt-6 rounded-lg p-4 border ${
              isDark
                ? "bg-gradient-to-r from-[#5d4037]/30 to-[#d4af37]/20 border-[#2c1810]"
                : "bg-[#5d4037]/10 border-[#5d4037]/20"
            }`}
          >
            <div className="text-sm opacity-90">{t("admin_tip")}</div>
          </div>

          <button
            onClick={onClose}
            className="mt-auto w-full px-4 py-3 rounded-md bg-[#556b2f] text-white hover:bg-[#556b2f] shadow"
            type="button"
          >
            {t("close", "Close")}
          </button>
        </div>
      </aside>
    </>
  );
}
