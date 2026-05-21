export type ThemeColors = {
  primary: string;
  background: string;
  card: string;
  sidebar: string;
  foreground: string;
  mutedForeground: string;
  destructive: string;
  primaryForeground?: string;
};

export const THEME_VARS: Array<{
  key: keyof ThemeColors;
  label: string;
  desc: string;
  default: string;
}> = [
  { key: "primary",         label: "Button Accent",     desc: "Primary buttons, active nav, focus ring", default: "#b8b8c7" },
  { key: "background",      label: "Background",    desc: "Main page background",             default: "#1a1919" },
  { key: "card",            label: "Card / Panel",  desc: "Cards, dropdowns, panels",         default: "#1a1a1a" },
  { key: "sidebar",         label: "Sidebar",       desc: "Navigation sidebar",               default: "#111111" },
  { key: "foreground",      label: "Text",          desc: "Primary body text",                default: "#e5e5e5" },
  { key: "mutedForeground", label: "Muted Text",    desc: "Secondary / subdued text",         default: "#737373" },
  { key: "destructive",     label: "Destructive",   desc: "Delete / error actions",           default: "#ef4444" },
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
  if (colors.primaryForeground) {
    set("--primary-foreground", colors.primaryForeground);
    set("--sidebar-primary-foreground", colors.primaryForeground);
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
    "--primary-foreground", "--sidebar-primary-foreground",
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
  | "ivory"
  | "sunset"
  | "sky"
  | "monochrome"
  | "blurple"
  | "nord"
  | "neon"
  | "rose"
  | "slate";

export const PRESET_THEMES: Array<{
  key: PresetThemeKey;
  label: string;
  desc: string;
  mode: "light" | "dark";
  colors: ThemeColors;
}> = [
  {
    key: "default",
    label: "Default",
    desc: "Near-black with muted lavender accent",
    mode: "dark",
    colors: {
      primary: "#b8b8c7",
      background: "#1a1919",
      card: "#1a1a1a",
      sidebar: "#111111",
      foreground: "#e5e5e5",
      mutedForeground: "#737373",
      destructive: "#ef4444",
    },
  },
  {
    key: "midnight",
    label: "Midnight",
    desc: "Pure black with indigo accent",
    mode: "dark",
    colors: {
      primary: "#6366f1",
      primaryForeground: "#ffffff",
      background: "#0d0d0d",
      card: "#1a1a1a",
      sidebar: "#111111",
      foreground: "#e5e5e5",
      mutedForeground: "#737373",
      destructive: "#ef4444",
    },
  },
  {
    key: "ivory",
    label: "Ivory",
    desc: "Warm cream background with amber accent",
    mode: "light",
    colors: {
      primary: "#b45309",
      primaryForeground: "#ffffff",
      background: "#faf8f5",
      card: "#f0ece4",
      sidebar: "#e8e3d8",
      foreground: "#1c1917",
      mutedForeground: "#78716c",
      destructive: "#dc2626",
    },
  },
  {
    key: "sunset",
    label: "Sunset",
    desc: "Warm dark tones with rose accent",
    mode: "dark",
    colors: {
      primary: "#f43f5e",
      primaryForeground: "#ffffff",
      background: "#211820",
      card: "#2d1e28",
      sidebar: "#180e18",
      foreground: "#fce7f3",
      mutedForeground: "#9ca3af",
      destructive: "#dc2626",
    },
  },
  {
    key: "sky",
    label: "Sky",
    desc: "Light slate background with blue accent",
    mode: "light",
    colors: {
      primary: "#3b82f6",
      primaryForeground: "#ffffff",
      background: "#f1f5f9",
      card: "#ffffff",
      sidebar: "#e2e8f0",
      foreground: "#0f172a",
      mutedForeground: "#64748b",
      destructive: "#dc2626",
    },
  },
  {
    key: "monochrome",
    label: "Monochrome",
    desc: "Dark charcoal with silver accent",
    mode: "dark",
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
  {
    key: "blurple",
    label: "Blurple",
    desc: "Dark gray panels with electric violet accent",
    mode: "dark",
    colors: {
      primary: "#5865f2",
      primaryForeground: "#ffffff",
      background: "#313338",
      card: "#2b2d31",
      sidebar: "#1e1f22",
      foreground: "#dbdee1",
      mutedForeground: "#80848e",
      destructive: "#ed4245",
    },
  },
  {
    key: "nord",
    label: "Nord",
    desc: "Arctic blue-gray tones with frost accent",
    mode: "dark",
    colors: {
      primary: "#88c0d0",
      background: "#2e3440",
      card: "#3b4252",
      sidebar: "#242831",
      foreground: "#eceff4",
      mutedForeground: "#616e88",
      destructive: "#bf616a",
    },
  },
  {
    key: "neon",
    label: "Neon",
    desc: "Near-black with vivid green accent",
    mode: "dark",
    colors: {
      primary: "#00cc6a",
      background: "#0a0a0f",
      card: "#111118",
      sidebar: "#060609",
      foreground: "#e0ffe8",
      mutedForeground: "#3f4a5a",
      destructive: "#ff3366",
    },
  },
  {
    key: "rose",
    label: "Rose",
    desc: "Soft pink background with crimson accent",
    mode: "light",
    colors: {
      primary: "#e11d48",
      primaryForeground: "#ffffff",
      background: "#fff1f2",
      card: "#ffe4e6",
      sidebar: "#fecdd3",
      foreground: "#1f0708",
      mutedForeground: "#9f1239",
      destructive: "#dc2626",
    },
  },
  {
    key: "slate",
    label: "Slate",
    desc: "Deep navy with electric sky accent",
    mode: "dark",
    colors: {
      primary: "#38bdf8",
      background: "#0f172a",
      card: "#1e293b",
      sidebar: "#0a1020",
      foreground: "#f1f5f9",
      mutedForeground: "#64748b",
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

// ─── Desktop Zoom Scale ───────────────────────────────────────────────────────

export const ZOOM_SCALE_LS_KEY = "cv_zoom";
export type ZoomScaleKey = "natural" | "comfort" | "big" | "boomer";

export const ZOOM_SCALE_OPTIONS: Array<{
  key: ZoomScaleKey;
  label: string;
  desc: string;
  value: number;
}> = [
  { key: "natural", label: "Natural", desc: "100% — browser default",     value: 1.0  },
  { key: "comfort", label: "Comfort", desc: "110% — comfortable desktop",  value: 1.1  },
  { key: "big",     label: "Big",     desc: "125% — easier reading",       value: 1.25 },
  { key: "boomer",  label: "Boomer",  desc: "140% — large & clear",        value: 1.4  },
];

export function applyZoomScale(key: ZoomScaleKey) {
  if (typeof window === "undefined") return;
  const opt = ZOOM_SCALE_OPTIONS.find((o) => o.key === key);
  if (!opt) return;
  // Only apply on desktop (≥ 1024 px wide)
  if (window.innerWidth >= 1024) {
    document.documentElement.style.zoom = opt.value === 1 ? "" : String(opt.value);
  } else {
    document.documentElement.style.zoom = "";
  }
}

// ─── Settings Panel Layout ────────────────────────────────────────────────────

export const SETTINGS_LAYOUT_LS_KEY = "cv_settings_layout";
export type SettingsLayoutKey = "narrow" | "centered" | "wide" | "full";

export const SETTINGS_LAYOUT_OPTIONS: Array<{
  key: SettingsLayoutKey;
  label: string;
  desc: string;
}> = [
  { key: "centered", label: "Centered", desc: "672px — default" },
  { key: "wide",     label: "Wide",     desc: "896px — roomier panels" },
  { key: "full",     label: "Full",     desc: "Uses all available width" },
];

/** Returns a Tailwind class string for the settings content wrapper (desktop only). */
export function settingsLayoutWrapperClass(key: SettingsLayoutKey): string {
  switch (key) {
    case "narrow":   return "mx-auto w-full lg:max-w-lg";
    case "centered": return "mx-auto w-full lg:max-w-2xl";
    case "wide":     return "mx-auto w-full lg:max-w-4xl";
    case "full":     return "w-full";
  }
}

// ─── Settings Card Arrangement ────────────────────────────────────────────────

export const SETTINGS_ARRANGEMENT_LS_KEY = "cv_settings_arrangement";
export type SettingsArrangementKey = "single" | "grid" | "dense";

export const SETTINGS_ARRANGEMENT_OPTIONS: Array<{
  key: SettingsArrangementKey;
  label: string;
  desc: string;
}> = [
  { key: "single", label: "Single",  desc: "Cards stacked one per row" },
  { key: "grid",   label: "Grid",    desc: "Two cards side by side" },
  { key: "dense",  label: "Dense",   desc: "Three cards per row" },
];

export function settingsArrangementClass(key: SettingsArrangementKey): string {
  switch (key) {
    case "single": return "space-y-4";
    case "grid":   return "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))] [&>*]:min-w-0";
    case "dense":  return "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))] [&>*]:min-w-0";
  }
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
// Card/chip/button style — set data attributes before first paint
(function(){
  try {
    var e = document.documentElement;
    var cs = localStorage.getItem('cv_card_style') || 'elevated'; e.setAttribute('data-card-style', cs);
    var ch = localStorage.getItem('cv_chip_style'); if (ch) e.setAttribute('data-chip-style', ch);
    var bs = localStorage.getItem('cv_btn_style');  if (bs) e.setAttribute('data-btn-style',  bs);
  } catch(err) {}
})();
// Desktop zoom scale — applied before first paint
(function(){
  try {
    var z = localStorage.getItem('cv_zoom') || 'natural';
    var map = { natural: '', comfort: '1.1', big: '1.25', boomer: '1.4' };
    if (window.innerWidth >= 1024) {
      var v = map[z]; if (v) document.documentElement.style.zoom = v;
    }
  } catch(err) {}
})();`;
