import { useThemeStore } from "../../store/theme";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === "dark";

  const bg = isDark ? "bg-[#3e2723]" : "bg-white";
  const text = isDark ? "text-[#f8f5ef]" : "text-[#3e2723]";
  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";
  const hover = isDark ? "hover:bg-white/10" : "hover:bg-[#5d4037]/8";

  return (
    <button
      onClick={toggleTheme}
      className={`px-3 py-2 rounded-md flex items-center gap-2 border 
      transition-all hover:opacity-95 active:scale-[0.97]
      ${bg} ${text} ${border} ${hover} ${className}`}
      aria-label="toggle-theme"
      type="button"
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[#d4af37]" />
      ) : (
        <Moon className="w-4 h-4 text-[#5d4037]" />
      )}

      <span className="text-sm font-medium">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}

