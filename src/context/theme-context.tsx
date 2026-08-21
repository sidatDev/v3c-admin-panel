"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

export interface ThemeConfig {
  primaryColor: string;          // hex — buttons, links, active states
  sidebarColor: string;          // hex — navigation sidebar background
  sidebarActiveColor?: string;   // hex — highlighted/active nav item background
  sidebarActiveTextColor?: string; // hex — highlighted/active nav item text color
  accentColor: string;           // hex — active nav items, badges, highlights
  textColor?: string;            // hex — body headings, primary text throughout the app
  textHoverColor?: string;       // hex — text and link color on hover
  borderRadius: string;          // e.g. '0.625rem' — rounding for cards and buttons
}

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#4f46e5",
  sidebarColor: "#FFFFFF",
  sidebarActiveColor: "#4f46e5",
  sidebarActiveTextColor: "#FFFFFF",
  accentColor: "#f59e0b",
  textColor: "#0f172a",
  textHoverColor: "#4f46e5",
  borderRadius: "0.625rem",
};

const STORAGE_KEY = "v3c_theme";

type ThemeContextType = {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => Promise<void>;
  resetTheme: () => Promise<void>;
  isSaving: boolean;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

function hexToRgbTriplet(hex: string): string {
  try {
    const clean = hex.replace("#", "").trim();
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return `${r} ${g} ${b}`;
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return `${r} ${g} ${b}`;
    }
  } catch {
    // fallback
  }
  return "26 26 46";
}

function applyTheme(t: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const rgbPrimary = hexToRgbTriplet(t.primaryColor);
  const textColor = t.textColor || "#0f172a";
  const textHoverColor = t.textHoverColor || t.primaryColor || "#4f46e5";
  const sidebarActiveColor = t.sidebarActiveColor || t.primaryColor || "#4f46e5";
  const sidebarActiveTextColor = t.sidebarActiveTextColor || "#FFFFFF";

  // Inject override CSS variables into :root at runtime
  root.style.setProperty("--primary-rgb-override", rgbPrimary);
  root.style.setProperty("--primary-override", t.primaryColor);
  root.style.setProperty("--accent-override", t.accentColor);
  root.style.setProperty("--sidebar-override", t.sidebarColor);
  root.style.setProperty("--sidebar-active-override", sidebarActiveColor);
  root.style.setProperty("--sidebar-active-text-override", sidebarActiveTextColor);
  root.style.setProperty("--foreground-override", textColor);
  root.style.setProperty("--text-hover-override", textHoverColor);
  root.style.setProperty("--radius-override", t.borderRadius);

  // Legacy/specific variables for direct inline style or Tailwind @theme use
  root.style.setProperty("--primary-hex", t.primaryColor);
  root.style.setProperty("--accent-hex", t.accentColor);
  root.style.setProperty("--sidebar-hex", t.sidebarColor);
  root.style.setProperty("--sidebar-active-hex", sidebarActiveColor);
  root.style.setProperty("--sidebar-active-text-hex", sidebarActiveTextColor);
  root.style.setProperty("--text-hex", textColor);
  root.style.setProperty("--text-hover-hex", textHoverColor);
  root.style.setProperty("--foreground", textColor);
  root.style.setProperty("--radius", t.borderRadius);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT_THEME);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 1. Initial hydration: Load from localStorage first (for zero-flash render), then fetch from Backend DB
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as ThemeConfig;
          setThemeState(parsed);
          applyTheme(parsed);
        } else {
          applyTheme(DEFAULT_THEME);
        }
      } catch {
        applyTheme(DEFAULT_THEME);
      }
    }

    // Fetch persisted theme from Backend Database
    async function loadThemeFromDB() {
      try {
        const res = await api.get<{ status: string; data: ThemeConfig }>('/domain/theme');
        if (res?.data && res.data.primaryColor) {
          setThemeState(res.data);
          applyTheme(res.data);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
          }
        }
      } catch {
        // Silently use localStorage / default fallback if API is not authenticated or fails
      }
    }

    loadThemeFromDB();
  }, []);

  const setTheme = useCallback(async (newTheme: ThemeConfig) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTheme));
    }

    // Persist to Backend Database
    try {
      setIsSaving(true);
      await api.put('/domain/theme', newTheme);
    } catch (err) {
      console.warn('[ThemeContext] Failed to persist theme to database:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const resetTheme = useCallback(async () => {
    setThemeState(DEFAULT_THEME);
    applyTheme(DEFAULT_THEME);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Persist default theme to Backend Database
    try {
      setIsSaving(true);
      await api.put('/domain/theme', DEFAULT_THEME);
    } catch (err) {
      console.warn('[ThemeContext] Failed to persist reset theme to database:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resetTheme, isSaving }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
