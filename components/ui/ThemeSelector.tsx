"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ThemeId } from "@/lib/themes";

interface ThemeSelectorProps {
  compact?: boolean;
  variant?: "default" | "icon" | "compact";
  direction?: "down" | "up";
  align?: "left" | "right";
}

export default function ThemeSelector({
  compact = false,
  variant,
  direction = "down",
  align = "right",
}: ThemeSelectorProps) {
  const { theme, currentTheme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setIsOpen(false);
  };

  const isIconVariant = variant === "icon";
  const isCompactVariant = variant === "compact" || compact;

  const dropdownMenu = (
    <div
      role="menu"
      aria-label="Вибір теми оформлення"
      className={`${
        isCompactVariant
          ? "mt-2 w-full"
          : `absolute z-50 w-56 sm:w-60 max-w-[calc(100vw-1.5rem)] ${
              align === "left" ? "left-0" : "right-0"
            } ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"}`
      } bg-canvas-night-soft/95 backdrop-blur-xl border border-hairline-dark rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-slide-up`}
    >
      {/* Dropdown Header */}
      <div className="px-3.5 py-1.5 border-b border-hairline-dark">
        <span className="micro-cap text-ink-mute text-[10px] font-mono tracking-wider">
          ТЕМИ ОФОРМЛЕННЯ
        </span>
      </div>

      {/* Themes List */}
      <div className="py-1 px-1 space-y-0.5 max-h-[320px] overflow-y-auto">
        {themes.map((t) => {
          const isActive = t.id === theme;
          return (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(t.id)}
              className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group ${
                isActive
                  ? "bg-white/[0.1] text-on-primary font-bold shadow-sm"
                  : "text-on-primary-mute hover:text-on-primary hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-3.5 h-2.5 rounded-[2px] border border-hairline-dark overflow-hidden flex shrink-0">
                  <span className="w-1/2 h-full" style={{ backgroundColor: t.canvas }} />
                  <span className="w-1/2 h-full" style={{ backgroundColor: t.accent }} />
                </span>
                <span
                  className="text-xs uppercase tracking-wide whitespace-nowrap"
                  style={{ color: isActive ? t.accent : undefined }}
                >
                  {t.name}
                </span>
              </div>

              {isActive && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-on-primary shrink-0 ml-2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isCompactVariant) {
    return (
      <div className="relative w-full" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="w-full p-3 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark hover:border-white/20 text-xs font-semibold text-on-primary flex items-center justify-between transition-colors cursor-pointer"
          aria-label="Змінити тему"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-3 rounded-[3px] border border-hairline-dark overflow-hidden flex shrink-0">
              <span className="w-1/2 h-full" style={{ backgroundColor: currentTheme.canvas }} />
              <span className="w-1/2 h-full" style={{ backgroundColor: currentTheme.accent }} />
            </span>
            <div className="text-left">
              <span className="block text-xs font-bold uppercase">{currentTheme.name}</span>
              <span className="block text-[10px] text-ink-mute font-mono">{currentTheme.badge}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="micro-cap text-ink-mute text-[10px] border border-hairline-dark px-2 py-0.5 rounded-full">
              ТЕМИ
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-ink-mute transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {isOpen && dropdownMenu}
      </div>
    );
  }

  if (isIconVariant) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-hairline-dark hover:border-white/40 text-on-primary-mute hover:text-on-primary bg-canvas-night-soft/60 hover:bg-canvas-night-soft transition-all shrink-0 cursor-pointer group"
          title={`Тема: ${currentTheme.name} (${currentTheme.tagline})`}
          aria-label="Вибір теми"
        >
          <span className="w-3.5 h-2.5 rounded-[2px] border border-hairline-dark overflow-hidden flex shrink-0">
            <span className="w-1/2 h-full" style={{ backgroundColor: currentTheme.canvas }} />
            <span className="w-1/2 h-full" style={{ backgroundColor: currentTheme.accent }} />
          </span>
        </button>

        {isOpen && dropdownMenu}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="h-8 px-2.5 rounded-full flex items-center gap-2 border border-hairline-dark hover:border-white/40 text-on-primary-mute hover:text-on-primary bg-canvas-night-soft/60 hover:bg-canvas-night-soft transition-all shrink-0 cursor-pointer group"
        title={`Тема: ${currentTheme.name} (${currentTheme.tagline})`}
        aria-label="Вибір теми"
      >
        <span className="w-3.5 h-2.5 rounded-[2px] border border-hairline-dark overflow-hidden flex shrink-0">
          <span className="w-1/2 h-full" style={{ backgroundColor: currentTheme.canvas }} />
          <span className="w-1/2 h-full" style={{ backgroundColor: currentTheme.accent }} />
        </span>
        <span className="text-[11px] font-mono uppercase tracking-wider hidden xl:inline">
          {currentTheme.name}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && dropdownMenu}
    </div>
  );
}
