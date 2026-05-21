export type ThemeColors = {
  primary: string;
  background: string;
  card: string;
  sidebar: string;
  foreground: string;
  mutedForeground: string;
  destructive: string;
};

export const THEME_VARS: Array<{
  key: keyof ThemeColors;
  label: string;
  desc: string;
  default: string;
}> = [
  { key: "primary",         label: "Button Accent",     desc: "Primary buttons, active nav, focus ring", default: "#d6d2e0" },
  { key: "background",      label: "Background",    desc: "Main page background",             default: "#2a2d40" },
  { key: "card",            label: "Card / Panel",  desc: "Cards, dropdowns, panels",         default: "#323649" },
  { key: "sidebar",         label: "Sidebar",       desc: "Navigation sidebar",               default: "#1d2030" },
  { key: "foreground",      label: "Text",          desc: "Primary body text",                default: "#c9c9c9" },
  { key: "mutedForeground", label: "Muted Text",    desc: "Secondary / subdued text",         default: "#838383" },
  { key: "destructive",     label: "Destructive",   desc: "Delete / error actions",           default: "#d94536" },
];

export const THEME_LS_KEY = "cv_theme";

// ─── Font Theme ──────────────────────────────────────────────────────────────

export type FontThemeKey = "sport" | "modern" | "system" | "bebas" | "inter" | "nunito";

export const FONT_THEMES: Array<{
  key: FontThemeKey;
  label: string;
  desc: string;
  fontVar: string;
  previewStyle: { fontFamily: string; fontWeight?: string; letterSpacing?: string };
}> = [
  {
    key: "sport",
    label: "Sport",
    desc: "Oswald — bold, condensed, sporty",
    fontVar: "var(--font-oswald)",
    previewStyle: { fontFamily: "var(--font-oswald)", fontWeight: "700", letterSpacing: "0.04em" },
  },
  {
    key: "modern",
    label: "Modern",
    desc: "Plus Jakarta Sans — clean, rounded",
    fontVar: "var(--font-jakarta)",
    previewStyle: { fontFamily: "var(--font-jakarta)" },
  },
  {
    key: "system",
    label: "System",
    desc: "OS default — familiar, fast",
    fontVar: "system-ui, -apple-system, sans-serif",
    previewStyle: { fontFamily: "system-ui, -apple-system, sans-serif" },
  },
  {
    key: "bebas",
    label: "Bebas Neue",
    desc: "Bebas Neue — bold display, athletic",
    fontVar: "var(--font-bebas)",
    previewStyle: { fontFamily: "var(--font-bebas)", letterSpacing: "0.08em" },
  },
  {
    key: "inter",
    label: "Inter",
    desc: "Inter — neutral, highly readable",
    fontVar: "var(--font-inter)",
    previewStyle: { fontFamily: "var(--font-inter)" },
  },
  {
    key: "nunito",
    label: "Nunito",
    desc: "Nunito — rounded, friendly",
    fontVar: "var(--font-nunito)",
    previewStyle: { fontFamily: "var(--font-nunito)" },
  },
];

export const FONT_LS_KEY = "cv_font";

export function applyFontTheme(key: FontThemeKey) {
  const theme = FONT_THEMES.find((t) => t.key === key);
  if (!theme) return;
  // @theme inline bakes font-sans value at build time, so setting --font-sans
  // has no effect at runtime. Override font-family directly on <html> instead.
  if (key === "sport") {
    // Remove the inline override; let the stylesheet's var(--font-oswald) take over.
    document.documentElement.style.removeProperty("font-family");
  } else {
    document.documentElement.style.fontFamily = theme.fontVar;
  }
}

/** Apply a partial set of theme color overrides to the document root. */
export function applyThemeColors(colors: Partial<ThemeColors>) {
  const el = document.documentElement;
  const set = (prop: string, val: string) => el.style.setProperty(prop, val);

  if (colors.primary) {
    set("--primary", colors.primary);
    set("--ring", colors.primary);
    set("--sidebar-primary", colors.primary);
    set("--sidebar-ring", colors.primary);
    set("--chart-1", colors.primary);
  }
  if (colors.background) {
    set("--background", colors.background);
  }
  if (colors.card) {
    set("--card", colors.card);
    set("--popover", colors.card);
    set("--secondary", colors.card);
    set("--muted", colors.card);
    set("--accent", colors.card);
  }
  if (colors.sidebar) {
    set("--sidebar", colors.sidebar);
    set("--sidebar-accent", colors.sidebar);
  }
  if (colors.foreground) {
    set("--foreground", colors.foreground);
    set("--card-foreground", colors.foreground);
    set("--popover-foreground", colors.foreground);
    set("--secondary-foreground", colors.foreground);
    set("--sidebar-foreground", colors.foreground);
    set("--accent-foreground", colors.foreground);
  }
  if (colors.mutedForeground) {
    set("--muted-foreground", colors.mutedForeground);
    set("--sidebar-accent-foreground", colors.mutedForeground);
  }
  if (colors.destructive) {
    set("--destructive", colors.destructive);
  }
}

/** Remove all custom theme overrides, reverting to CSS defaults. */
export function resetThemeColors() {
  const el = document.documentElement;
  [
    "--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--chart-1",
    "--background",
    "--card", "--popover", "--secondary", "--muted", "--accent",
    "--sidebar", "--sidebar-accent",
    "--foreground", "--card-foreground", "--popover-foreground",
    "--secondary-foreground", "--sidebar-foreground", "--accent-foreground",
    "--muted-foreground", "--sidebar-accent-foreground",
    "--destructive",
  ].forEach((v) => el.style.removeProperty(v));
}

// ─── Preset Themes ───────────────────────────────────────────────────────────

export const PRESET_LS_KEY = "cv_preset";

export type PresetThemeKey =
  | "default"
  | "midnight"
  | "forest"
  | "sunset"
  | "ocean"
  | "monochrome";

export const PRESET_THEMES: Array<{
  key: PresetThemeKey;
  label: string;
  desc: string;
  colors: ThemeColors;
}> = [
  {
    key: "default",
    label: "Default",
    desc: "Sonarr-inspired dark blue & orange",
    colors: {
      primary: "#f5a323",
      background: "#2a2d40",
      card: "#323649",
      sidebar: "#1d2030",
      foreground: "#c9c9c9",
      mutedForeground: "#838383",
      destructive: "#d94536",
    },
  },
  {
    key: "midnight",
    label: "Midnight",
    desc: "Pure black with indigo accent",
    colors: {
      primary: "#6366f1",
      background: "#0d0d0d",
      card: "#1a1a1a",
      sidebar: "#111111",
      foreground: "#e5e5e5",
      mutedForeground: "#737373",
      destructive: "#ef4444",
    },
  },
  {
    key: "forest",
    label: "Forest",
    desc: "Dark green tones with emerald accent",
    colors: {
      primary: "#10b981",
      background: "#1a2420",
      card: "#1e2e28",
      sidebar: "#141e1a",
      foreground: "#d1fae5",
      mutedForeground: "#6b7280",
      destructive: "#dc2626",
    },
  },
  {
    key: "sunset",
    label: "Sunset",
    desc: "Warm dark tones with rose accent",
    colors: {
      primary: "#f43f5e",
      background: "#211820",
      card: "#2d1e28",
      sidebar: "#180e18",
      foreground: "#fce7f3",
      mutedForeground: "#9ca3af",
      destructive: "#dc2626",
    },
  },
  {
    key: "ocean",
    label: "Ocean",
    desc: "Deep navy with cyan accent",
    colors: {
      primary: "#06b6d4",
      background: "#0d1b2a",
      card: "#1a2e40",
      sidebar: "#091220",
      foreground: "#e0f2fe",
      mutedForeground: "#94a3b8",
      destructive: "#ef4444",
    },
  },
  {
    key: "monochrome",
    label: "Monochrome",
    desc: "Dark charcoal with silver accent",
    colors: {
      primary: "#d4d4d4",
      background: "#1c1c1c",
      card: "#262626",
      sidebar: "#141414",
      foreground: "#f5f5f5",
      mutedForeground: "#737373",
      destructive: "#ef4444",
    },
  },
];

export function applyPresetTheme(key: PresetThemeKey) {
  const preset = PRESET_THEMES.find((p) => p.key === key);
  if (!preset) return;
  applyThemeColors(preset.colors);
  localStorage.setItem(THEME_LS_KEY, JSON.stringify(preset.colors));
  localStorage.setItem(PRESET_LS_KEY, key);
}

// ─── Type Density ─────────────────────────────────────────────────────────────

export const TYPE_DENSITY_LS_KEY = "cv_type_density";

export type TypeDensityKey = "compact" | "default" | "comfortable";

export const TYPE_DENSITY_OPTIONS: Array<{
  key: TypeDensityKey;
  label: string;
  desc: string;
  value: string;
}> = [
  { key: "compact",     label: "Compact",     desc: "Smaller, denser text",    value: "0.875" },
  { key: "default",     label: "Default",     desc: "Balanced type scale",      value: "1" },
  { key: "comfortable", label: "Comfortable", desc: "Larger, easier to read",   value: "1.125" },
];

export function applyTypeDensity(key: TypeDensityKey) {
  const opt = TYPE_DENSITY_OPTIONS.find((o) => o.key === key);
  if (!opt) return;
  document.documentElement.style.setProperty("--type-density", opt.value);
}

// ─── Card Style ───────────────────────────────────────────────────────────────

export const CARD_STYLE_LS_KEY = "cv_card_style";
export type CardStyleKey = "elevated" | "filled" | "outlined";

export const CARD_STYLE_OPTIONS: Array<{
  key: CardStyleKey;
  label: string;
  desc: string;
}> = [
  { key: "elevated", label: "Elevated", desc: "Shadow lift, surface tint" },
  { key: "filled",   label: "Filled",   desc: "Flat filled, no border" },
  { key: "outlined", label: "Outlined", desc: "Border, no shadow" },
];

export function applyCardStyle(key: CardStyleKey) {
  document.documentElement.setAttribute("data-card-style", key);
}

// ─── Chip Style ───────────────────────────────────────────────────────────────

export const CHIP_STYLE_LS_KEY = "cv_chip_style";
export type ChipStyleKey = "assist" | "filter" | "input" | "suggestion";

export const CHIP_STYLE_OPTIONS: Array<{
  key: ChipStyleKey;
  label: string;
  desc: string;
}> = [
  { key: "assist",     label: "Assist",     desc: "Rounded rect, filled" },
  { key: "filter",     label: "Filter",     desc: "Pill shape, toggleable" },
  { key: "input",      label: "Input",      desc: "Compact with border" },
  { key: "suggestion", label: "Suggestion", desc: "Pill outline, dynamic" },
];

export function applyChipStyle(key: ChipStyleKey) {
  document.documentElement.setAttribute("data-chip-style", key);
}

// ─── Button Style ─────────────────────────────────────────────────────────────

export const BUTTON_STYLE_LS_KEY = "cv_btn_style";
export type ButtonStyleKey = "filled" | "filled-tonal" | "outlined" | "elevated" | "text";

export const BUTTON_STYLE_OPTIONS: Array<{
  key: ButtonStyleKey;
  label: string;
  desc: string;
}> = [
  { key: "filled",       label: "Filled",       desc: "Solid primary, high emphasis" },
  { key: "filled-tonal", label: "Filled Tonal", desc: "Tinted, medium emphasis" },
  { key: "outlined",     label: "Outlined",     desc: "Border only, medium" },
  { key: "elevated",     label: "Elevated",     desc: "Shadow + surface tint" },
  { key: "text",         label: "Text",         desc: "No background, low emphasis" },
];

export function applyButtonStyle(key: ButtonStyleKey) {
  document.documentElement.setAttribute("data-btn-style", key);
}

// ─── Card Sleeve Effect ───────────────────────────────────────────────────────

export const SLEEVE_LS_KEY = "cv_sleeve";

export function applySleeve(on: boolean) {
  document.documentElement.setAttribute("data-sleeve", on ? "true" : "false");
}

/**
 * Inline script string for injecting into <head> to apply theme colors
 * from localStorage synchronously before first paint (prevents FOUC).
 */
export const THEME_INIT_SCRIPT = `(function(){
  try {
    var c = JSON.parse(localStorage.getItem('cv_theme') || '{}');
    var e = document.documentElement;
    var s = function(p, v) { e.style.setProperty(p, v); };
    if (c.primary) {
      ['--primary','--ring','--sidebar-primary','--sidebar-ring','--chart-1']
        .forEach(function(p) { s(p, c.primary); });
    }
    if (c.background) s('--background', c.background);
    if (c.card) {
      ['--card','--popover','--secondary','--muted','--accent']
        .forEach(function(p) { s(p, c.card); });
    }
    if (c.sidebar) {
      ['--sidebar','--sidebar-accent'].forEach(function(p) { s(p, c.sidebar); });
    }
    if (c.foreground) {
      ['--foreground','--card-foreground','--popover-foreground',
       '--secondary-foreground','--sidebar-foreground','--accent-foreground']
        .forEach(function(p) { s(p, c.foreground); });
    }
    if (c.mutedForeground) {
      ['--muted-foreground','--sidebar-accent-foreground']
        .forEach(function(p) { s(p, c.mutedForeground); });
    }
    if (c.destructive) s('--destructive', c.destructive);
  } catch(err) {}
})();
// Font theme — applied before first paint to prevent FOUC
// @theme inline bakes font values at build time; must override fontFamily directly.
// Font CSS vars live on <html> so var() references resolve correctly.
(function(){
  try {
    var f = localStorage.getItem('cv_font');
    var e = document.documentElement;
    if      (f === 'modern') e.style.fontFamily = 'var(--font-jakarta)';
    else if (f === 'system') e.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    else if (f === 'bebas')  e.style.fontFamily = 'var(--font-bebas)';
    else if (f === 'inter')  e.style.fontFamily = 'var(--font-inter)';
    else if (f === 'nunito') e.style.fontFamily = 'var(--font-nunito)';
    // 'sport' (default): no override needed, CSS already uses var(--font-oswald)
  } catch(err) {}
})();
// Type density — applied before first paint to prevent FOUC
(function(){
  try {
    var d = localStorage.getItem('cv_type_density');
    if (d) document.documentElement.style.setProperty('--type-density', d);
  } catch(err) {}
})();
// Card/chip/button style + sleeve — set data attributes before first paint
(function(){
  try {
    var e = document.documentElement;
    var cs = localStorage.getItem('cv_card_style'); if (cs) e.setAttribute('data-card-style', cs);
    var ch = localStorage.getItem('cv_chip_style'); if (ch) e.setAttribute('data-chip-style', ch);
    var bs = localStorage.getItem('cv_btn_style');  if (bs) e.setAttribute('data-btn-style',  bs);
    var sl = localStorage.getItem('cv_sleeve');      if (sl) e.setAttribute('data-sleeve',      sl);
  } catch(err) {}
})();`;
