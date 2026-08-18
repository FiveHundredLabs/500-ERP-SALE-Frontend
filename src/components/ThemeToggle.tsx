import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center
        ${
          isDark
            ? "text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30"
            : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-sm"
        }
        ${className}
      `}
      title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
      aria-label={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
    >
      {isDark ? (
        <Sun size={19} className="transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon size={19} className="transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};

export default ThemeToggle;
