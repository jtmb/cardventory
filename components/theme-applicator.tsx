"use client";

import { useEffect } from "react";
import {
  THEME_LS_KEY, applyThemeColors,
  FONT_LS_KEY, applyFontTheme, type FontThemeKey,
  TYPE_DENSITY_LS_KEY, applyTypeDensity, type TypeDensityKey,
  CARD_STYLE_LS_KEY, applyCardStyle, type CardStyleKey,
  CHIP_STYLE_LS_KEY, applyChipStyle, type ChipStyleKey,
  BUTTON_STYLE_LS_KEY, applyButtonStyle, type ButtonStyleKey,
  PRESET_LS_KEY, PRESET_THEMES, applyPresetTheme,
  ZOOM_SCALE_LS_KEY, applyZoomScale, type ZoomScaleKey,
} from "@/lib/theme";

/**
 * Reads theme color, font, and type-density overrides from localStorage and
 * applies them on mount. Works in tandem with the inline <head> script for
 * FOUC prevention.
 */
export default function ThemeApplicator() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_LS_KEY);
      if (stored) {
        applyThemeColors(JSON.parse(stored));
      } else {
        // No theme saved — apply and persist the default dark preset
        applyPresetTheme("default");
      }
    } catch {}

    try {
      const font = localStorage.getItem(FONT_LS_KEY) as FontThemeKey | null;
      if (font) applyFontTheme(font);
    } catch {}

    try {
      const density = localStorage.getItem(TYPE_DENSITY_LS_KEY) as TypeDensityKey | null;
      if (density) applyTypeDensity(density);
    } catch {}

    try {
      const cardStyle = localStorage.getItem(CARD_STYLE_LS_KEY) as CardStyleKey | null;
      if (cardStyle) applyCardStyle(cardStyle);
    } catch {}

    try {
      const chipStyle = localStorage.getItem(CHIP_STYLE_LS_KEY) as ChipStyleKey | null;
      if (chipStyle) applyChipStyle(chipStyle);
    } catch {}

    try {
      const btnStyle = localStorage.getItem(BUTTON_STYLE_LS_KEY) as ButtonStyleKey | null;
      if (btnStyle) applyButtonStyle(btnStyle);
    } catch {}

    try {
      const zoom = (localStorage.getItem(ZOOM_SCALE_LS_KEY) ?? "natural") as ZoomScaleKey;
      applyZoomScale(zoom);
    } catch {}
  }, []);

  return null;
}
