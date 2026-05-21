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
  { key: "primary",         label: "Accent Color",  desc: "Buttons, active nav, highlights",  default: "#f5a323" },
  { key: "background",      label: "Background",    desc: "Main page background",             default: "#2a2d40" },
  { key: "card",            label: "Card / Panel",  desc: "Cards, dropdowns, panels",         default: "#323649" },
  { key: "sidebar",         label: "Sidebar",       desc: "Navigation sidebar",               default: "#1d2030" },
  { key: "foreground",      label: "Text",          desc: "Primary body text",                default: "#c9c9c9" },
  { key: "mutedForeground", label: "Muted Text",    desc: "Secondary / subdued text",         default: "#838383" },
  { key: "destructive",     label: "Destructive",   desc: "Delete / error actions",           default: "#d94536" },
];

export const THEME_LS_KEY = "cv_theme";

// ─── Font Theme ──────────────────────────────────────────────────────────────

export type FontThemeKey = "sport" | "modern" | "system";

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
];

export const FONT_LS_KEY = "cv_font";

export function applyFontTheme(key: FontThemeKey) {
  const theme = FONT_THEMES.find((t) => t.key === key);
  if (!theme) return;
  document.documentElement.style.setProperty("--font-sans", theme.fontVar);
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
(function(){
  try {
    var f = localStorage.getItem('cv_font');
    var e = document.documentElement;
    if (f === 'modern') e.style.setProperty('--font-sans', 'var(--font-jakarta)');
    else if (f === 'system') e.style.setProperty('--font-sans', 'system-ui, -apple-system, sans-serif');
    // 'sport' (default): CSS already sets --font-sans = var(--font-oswald)
  } catch(err) {}
})();`;
