"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import ThemeSelector from "@/components/ui/ThemeSelector";

export default function FooterThemeButton() {
  const { currentTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <span className="micro-cap text-ink-mute text-[10px] hidden sm:inline">ТЕМА:</span>
      <ThemeSelector direction="up" />
    </div>
  );
}
