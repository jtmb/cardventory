"use client";

import { useEffect } from "react";
import { THEME_LS_KEY, applyThemeColors, FONT_LS_KEY, applyFontTheme, type FontThemeKey } from "@/lib/theme";

/**
 * Reads theme color + font overrides from localStorage and applies them on
 * mount. Works in tandem with the inline <head> script for FOUC prevention.
 */
export default function ThemeApplicator() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_LS_KEY);
      if (stored) applyThemeColors(JSON.parse(stored));
    } catch {}

    try {
      const font = localStorage.getItem(FONT_LS_KEY) as FontThemeKey | null;
      if (font) applyFontTheme(font);
    } catch {}
  }, []);

  return null;
}
