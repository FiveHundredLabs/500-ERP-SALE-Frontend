import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("erp_theme");
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  useEffect(() => {
    localStorage.setItem("erp_theme", theme);
    const root = document.documentElement;
    const body = document.body;

    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
      body.classList.remove("dark-theme");
      body.classList.add("light-theme");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      body.classList.remove("light-theme");
      body.classList.add("dark-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;
