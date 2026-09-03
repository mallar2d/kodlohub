"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { ThemeId, ThemeConfig, THEMES, DEFAULT_THEME_ID, getThemeConfig } from "@/lib/themes";

interface ThemeContextType {
  theme: ThemeId;
  currentTheme: ThemeConfig;
  setTheme: (id: ThemeId) => void;
  cycleTheme: () => void;
  themes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with DEFAULT_THEME_ID to guarantee matching SSR & client initial render
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const applyTheme = useCallback((newTheme: ThemeId, playAudio = false) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("kodlohub_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      window.dispatchEvent(new CustomEvent("kodlohub_theme_changed", { detail: newTheme }));

      if (playAudio) {
        const config = getThemeConfig(newTheme);
        if (config.sound && typeof Audio !== "undefined") {
          try {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            const audio = new Audio(config.sound);
            audio.volume = 0.25;
            audioRef.current = audio;
            audio.play().catch(() => {});
          } catch {}
        }
      }
    } catch {}
  }, []);

  const setTheme = useCallback(
    (newTheme: ThemeId) => {
      applyTheme(newTheme, true);
    },
    [applyTheme]
  );

  const cycleTheme = useCallback(() => {
    const currentIndex = THEMES.findIndex((t) => t.id === theme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    applyTheme(THEMES[nextIndex].id, true);
  }, [theme, applyTheme]);

  useEffect(() => {
    // Initial sync from localStorage or DOM attribute
    try {
      const domTheme = document.documentElement.getAttribute("data-theme") as ThemeId;
      const savedTheme = localStorage.getItem("kodlohub_theme") as ThemeId;
      const active = (domTheme && THEMES.some((t) => t.id === domTheme))
        ? domTheme
        : (savedTheme && THEMES.some((t) => t.id === savedTheme))
        ? savedTheme
        : DEFAULT_THEME_ID;

      setThemeState(active);
      document.documentElement.setAttribute("data-theme", active);
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "kodlohub_theme" && e.newValue) {
        const nextTheme = e.newValue as ThemeId;
        if (THEMES.some((t) => t.id === nextTheme)) {
          setThemeState(nextTheme);
          document.documentElement.setAttribute("data-theme", nextTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const currentTheme = getThemeConfig(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentTheme,
        setTheme,
        cycleTheme,
        themes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
