"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  SaveIcon, RefreshCwIcon, FlaskConicalIcon, RotateCcwIcon,
  CheckIcon, DownloadIcon, SparklesIcon, EyeIcon, ShieldIcon,
} from "lucide-react";
import { seedTestData } from "@/lib/actions";
import {
  THEME_VARS, type ThemeColors, THEME_LS_KEY, applyThemeColors, resetThemeColors,
  FONT_THEMES, type FontThemeKey, FONT_LS_KEY, applyFontTheme,
  PRESET_THEMES, PRESET_LS_KEY, applyPresetTheme, type PresetThemeKey,
  TYPE_DENSITY_OPTIONS, TYPE_DENSITY_LS_KEY, applyTypeDensity, type TypeDensityKey,
  CARD_STYLE_OPTIONS, CARD_STYLE_LS_KEY, applyCardStyle, type CardStyleKey,
  CHIP_STYLE_OPTIONS, CHIP_STYLE_LS_KEY, applyChipStyle, type ChipStyleKey,
  BUTTON_STYLE_OPTIONS, BUTTON_STYLE_LS_KEY, applyButtonStyle, type ButtonStyleKey,
  SLEEVE_LS_KEY, applySleeve,
} from "@/lib/theme";

const REFRESH_INTERVALS = [
  { value: "0",     label: "Disabled" },
  { value: "360",   label: "Every 6 hours" },
  { value: "720",   label: "Every 12 hours" },
  { value: "1440",  label: "Every 24 hours" },
  { value: "4320",  label: "Every 3 days" },
  { value: "10080", label: "Every week" },
];

/** Generic option picker row */
function OptionPicker<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string; desc: string }>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          title={opt.desc}
          className={`flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2.5 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-[6rem] ${
            value === opt.key ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <span className="type-label-large font-semibold">{opt.label}</span>
          <span className="type-label-small text-muted-foreground">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  general: "General",
  appearance: "Appearance",
  data: "Data",
  system: "System",
};

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isActualAdmin = session?.user?.role === "admin";
  const [previewRole, setPreviewRole] = useState<"admin" | "user">("admin");
  const isAdmin = isActualAdmin && previewRole === "admin";
  const activeSection = searchParams.get("s") ?? "appearance";
  const [refreshInterval, setRefreshInterval] = useState("1440");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [themeColors, setThemeColors] = useState<Partial<ThemeColors>>({});
  const [fontTheme, setFontTheme] = useState<FontThemeKey>("sport");
  const [activePreset, setActivePreset] = useState<PresetThemeKey | null>(null);
  const [typeDensity, setTypeDensity] = useState<TypeDensityKey>("default");
  const [cardStyle, setCardStyle] = useState<CardStyleKey>("outlined");
  const [chipStyle, setChipStyle] = useState<ChipStyleKey>("assist");
  const [btnStyle, setBtnStyle] = useState<ButtonStyleKey>("filled");
  const [sleeveEffect, setSleeveEffect] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState<Date | null>(null);

  const refreshBlocked = !isActualAdmin && refreshCooldownUntil !== null && refreshCooldownUntil > new Date();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_LS_KEY);
      if (stored) setThemeColors(JSON.parse(stored));
    } catch {}
    try {
      const f = localStorage.getItem(FONT_LS_KEY) as FontThemeKey | null;
      if (f) setFontTheme(f);
    } catch {}
    try {
      const p = localStorage.getItem(PRESET_LS_KEY) as PresetThemeKey | null;
      if (p) setActivePreset(p);
    } catch {}
    try {
      const d = localStorage.getItem(TYPE_DENSITY_LS_KEY) as TypeDensityKey | null;
      if (d) setTypeDensity(d);
    } catch {}
    try {
      const cs = localStorage.getItem(CARD_STYLE_LS_KEY) as CardStyleKey | null;
      if (cs) setCardStyle(cs);
    } catch {}
    try {
      const ch = localStorage.getItem(CHIP_STYLE_LS_KEY) as ChipStyleKey | null;
      if (ch) setChipStyle(ch);
    } catch {}
    try {
      const bs = localStorage.getItem(BUTTON_STYLE_LS_KEY) as ButtonStyleKey | null;
      if (bs) setBtnStyle(bs);
    } catch {}
    try {
      const sl = localStorage.getItem(SLEEVE_LS_KEY);
      if (sl !== null) setSleeveEffect(sl === "true");
    } catch {}

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.refresh_interval) setRefreshInterval(data.refresh_interval);
        if (data.theme_colors) {
          try {
            const c = JSON.parse(data.theme_colors) as Partial<ThemeColors>;
            setThemeColors(c);
            localStorage.setItem(THEME_LS_KEY, JSON.stringify(c));
            applyThemeColors(c);
          } catch {}
        }
        if (data.font_theme) {
          const f = data.font_theme as FontThemeKey;
          setFontTheme(f);
          localStorage.setItem(FONT_LS_KEY, f);
          applyFontTheme(f);
        }
        if (data.preset_theme) {
          const p = data.preset_theme as PresetThemeKey;
          setActivePreset(p);
          localStorage.setItem(PRESET_LS_KEY, p);
        }
        if (data.type_density) {
          const d = data.type_density as TypeDensityKey;
          setTypeDensity(d);
          localStorage.setItem(TYPE_DENSITY_LS_KEY, TYPE_DENSITY_OPTIONS.find((o) => o.key === d)!.value);
          applyTypeDensity(d);
        }
        if (data.card_style) {
          const cs = data.card_style as CardStyleKey;
          setCardStyle(cs);
          localStorage.setItem(CARD_STYLE_LS_KEY, cs);
          applyCardStyle(cs);
        }
        if (data.chip_style) {
          const ch = data.chip_style as ChipStyleKey;
          setChipStyle(ch);
          localStorage.setItem(CHIP_STYLE_LS_KEY, ch);
          applyChipStyle(ch);
        }
        if (data.btn_style) {
          const bs = data.btn_style as ButtonStyleKey;
          setBtnStyle(bs);
          localStorage.setItem(BUTTON_STYLE_LS_KEY, bs);
          applyButtonStyle(bs);
        }
        if (data.sleeve_effect !== undefined) {
          const sl = data.sleeve_effect === "true";
          setSleeveEffect(sl);
          localStorage.setItem(SLEEVE_LS_KEY, String(sl));
          applySleeve(sl);
        }
        if (data.manual_refresh_last) {
          const nextAllowed = new Date(new Date(data.manual_refresh_last).getTime() + 24 * 60 * 60 * 1000);
          setRefreshCooldownUntil(nextAllowed);
        }
      })
      .catch(() => {});
  }, []);

  function handlePresetTheme(key: PresetThemeKey) {
    setActivePreset(key);
    applyPresetTheme(key);
    const preset = PRESET_THEMES.find((p) => p.key === key)!;
    setThemeColors(preset.colors);
  }

  function handleFontTheme(key: FontThemeKey) {
    setFontTheme(key);
    applyFontTheme(key);
    localStorage.setItem(FONT_LS_KEY, key);
  }

  function handleColorChange(key: keyof ThemeColors, value: string) {
    const updated = { ...themeColors, [key]: value };
    setThemeColors(updated);
    applyThemeColors({ [key]: value });
    localStorage.setItem(THEME_LS_KEY, JSON.stringify(updated));
    setActivePreset(null);
    localStorage.removeItem(PRESET_LS_KEY);
  }

  function handleResetTheme() {
    setThemeColors({});
    setActivePreset(null);
    localStorage.removeItem(THEME_LS_KEY);
    localStorage.removeItem(PRESET_LS_KEY);
    resetThemeColors();
  }

  function handleTypeDensity(key: TypeDensityKey) {
    setTypeDensity(key);
    applyTypeDensity(key);
    localStorage.setItem(TYPE_DENSITY_LS_KEY, TYPE_DENSITY_OPTIONS.find((o) => o.key === key)!.value);
  }

  function handleCardStyle(key: CardStyleKey) {
    setCardStyle(key);
    applyCardStyle(key);
    localStorage.setItem(CARD_STYLE_LS_KEY, key);
  }

  function handleChipStyle(key: ChipStyleKey) {
    setChipStyle(key);
    applyChipStyle(key);
    localStorage.setItem(CHIP_STYLE_LS_KEY, key);
  }

  function handleBtnStyle(key: ButtonStyleKey) {
    setBtnStyle(key);
    applyButtonStyle(key);
    localStorage.setItem(BUTTON_STYLE_LS_KEY, key);
  }

  function handleSleeve(on: boolean) {
    setSleeveEffect(on);
    applySleeve(on);
    localStorage.setItem(SLEEVE_LS_KEY, String(on));
  }

  /** Single source of truth for all exportable / saveable settings. */
  function buildSettingsPayload() {
    // Merge THEME_VARS defaults so exported theme_colors always has all keys,
    // even when no custom color overrides have been applied.
    const defaultColors = Object.fromEntries(
      THEME_VARS.map(({ key, default: def }) => [key, def])
    ) as ThemeColors;
    return {
      theme_colors: { ...defaultColors, ...themeColors } as ThemeColors,
      preset_theme: activePreset,
      font_theme: fontTheme,
      type_density: typeDensity,
      card_style: cardStyle,
      chip_style: chipStyle,
      btn_style: btnStyle,
      sleeve_effect: sleeveEffect,
      refresh_interval: refreshInterval,
    };
  }

  function exportSettings() {
    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      ...buildSettingsPayload(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cardventory-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const s = buildSettingsPayload();
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_interval: s.refresh_interval,
          theme_colors: JSON.stringify(s.theme_colors),
          font_theme: s.font_theme,
          preset_theme: s.preset_theme ?? "",
          type_density: s.type_density,
          card_style: s.card_style,
          chip_style: s.chip_style,
          btn_style: s.btn_style,
          sleeve_effect: String(s.sleeve_effect),
        }),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function triggerRefreshAll() {
    toast.info("Starting refresh of all card prices…");
    try {
      const res = await fetch("/api/pricing/refresh-all", { method: "POST" });
      const data = await res.json();
      if (res.status === 429 && data.nextAllowedAt) {
        setRefreshCooldownUntil(new Date(data.nextAllowedAt));
        const hoursLeft = Math.ceil((new Date(data.nextAllowedAt).getTime() - Date.now()) / 3_600_000);
        toast.error(`Rate limited — available again in ${hoursLeft}h`);
        return;
      }
      if (!res.ok) { toast.error("Refresh failed"); return; }
      toast.success(`Refreshed ${data.refreshed} of ${data.total} cards`);
      if (!isActualAdmin) {
        setRefreshCooldownUntil(new Date(Date.now() + 24 * 60 * 60 * 1000));
      }
    } catch {
      toast.error("Refresh failed");
    }
  }

  async function handleSeedTestData() {
    setSeeding(true);
    try {
      const result = await seedTestData();
      toast.success(`Added ${result.count} test cards to your collection`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <div className="p-6 max-w-2xl mx-auto w-full pb-20">
      <div className="mb-4">
        <h1 className="type-headline-large font-bold">{SECTION_LABELS[activeSection] ?? "Settings"}</h1>
        <p className="type-body-medium text-muted-foreground mt-1">Configure Cardventory to your preferences</p>
      </div>

      {/* ── Appearance ─────────────────────────────────────────────────────── */}
      {activeSection === "appearance" && (
        <div className="space-y-4">
        {/* Preset Themes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Themes</CardTitle>
            <CardDescription>Select a preset colour scheme for the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_THEMES.map((preset) => {
                const isActive = activePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetTheme(preset.key)}
                    className={`relative text-left rounded-xl border-2 p-3 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive ? "border-primary shadow-md shadow-primary/20" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex gap-1 mb-2.5">
                      {[preset.colors.background, preset.colors.card, preset.colors.primary, preset.colors.foreground].map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <p className="type-label-large font-semibold">{preset.label}</p>
                    <p className="type-label-small text-muted-foreground mt-0.5 line-clamp-1">{preset.desc}</p>
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <CheckIcon className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Text Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Text Style</CardTitle>
            <CardDescription>Choose a typeface for the entire app.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FONT_THEMES.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => handleFontTheme(theme.key)}
                  className={`text-left rounded-lg border-2 p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    fontTheme === theme.key ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="text-lg font-bold mb-1 truncate" style={theme.previewStyle}>
                    MY COLLECTION
                  </div>
                  <p className="type-label-large font-semibold">{theme.label}</p>
                  <p className="type-label-small text-muted-foreground mt-0.5">{theme.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Type Size */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Type Size</CardTitle>
            <CardDescription>Scale all text uniformly. Follows the M3 type scale.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {TYPE_DENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleTypeDensity(opt.key)}
                  className={`text-left rounded-lg border-2 p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    typeDensity === opt.key ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="font-bold mb-1" style={{ fontSize: `${parseFloat(opt.value) * 1.5}rem` }}>
                    Aa
                  </p>
                  <p className="type-label-large font-semibold">{opt.label}</p>
                  <p className="type-label-small text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Card Style</CardTitle>
            <CardDescription>
              M3 card variant applied to all collection cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <OptionPicker options={CARD_STYLE_OPTIONS} value={cardStyle} onChange={handleCardStyle} />
            {/* Mini preview */}
            <div className="flex gap-3 pt-1">
              {/* Elevated preview */}
              <div className="flex-1 rounded-lg p-3 text-center text-xs text-muted-foreground border-transparent"
                style={{ boxShadow: "0 2px 8px oklch(0 0 0 / 22%)", background: "color-mix(in oklch, var(--card) 93%, var(--primary) 7%)" }}>
                Elevated
              </div>
              {/* Filled preview */}
              <div className="flex-1 rounded-lg p-3 text-center text-xs text-muted-foreground bg-card">
                Filled
              </div>
              {/* Outlined preview */}
              <div className="flex-1 rounded-lg p-3 text-center text-xs text-muted-foreground border border-border">
                Outlined
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chip Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chip Style</CardTitle>
            <CardDescription>
              M3 chip variant applied to genre/filter tabs and tags.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <OptionPicker options={CHIP_STYLE_OPTIONS} value={chipStyle} onChange={handleChipStyle} />
            {/* Mini preview */}
            <div className="flex gap-2 flex-wrap pt-1">
              <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg">Assist</span>
              <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">Filter</span>
              <span className="px-3 py-1 text-xs font-medium bg-muted text-muted-foreground rounded border border-border">Input</span>
              <span className="px-3 py-1 text-xs font-medium text-primary rounded-full border border-primary">Suggestion</span>
            </div>
          </CardContent>
        </Card>

        {/* Button Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Button Style</CardTitle>
            <CardDescription>
              M3 button variant applied to primary action buttons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <OptionPicker options={BUTTON_STYLE_OPTIONS} value={btnStyle} onChange={handleBtnStyle} />
            {/* Live preview */}
            <div className="pt-1">
              <Button size="sm">Preview Button</Button>
            </div>
          </CardContent>
        </Card>

        {/* Card Sleeve Effect */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Card Sleeve Effect</CardTitle>
            <CardDescription>
              Adds a translucent glare overlay to card images, simulating a protective sleeve or card book page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="type-label-large font-medium">Sleeve overlay</p>
                <p className="type-label-small text-muted-foreground mt-0.5">
                  {sleeveEffect ? "On — cards show a sleeve glare" : "Off — cards show unobscured"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sleeveEffect}
                onClick={() => handleSleeve(!sleeveEffect)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  sleeveEffect ? "bg-primary border-primary" : "bg-muted border-border"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    sleeveEffect ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Custom Colours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom Colours</CardTitle>
            <CardDescription>Override individual colours. Applied on top of any preset.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              {THEME_VARS.map(({ key, label, desc, default: def }) => {
                const current = themeColors[key] ?? def;
                return (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative shrink-0 w-9 h-9 rounded-lg border-2 border-border group-hover:border-primary/60 transition-colors overflow-hidden">
                      <div className="absolute inset-0" style={{ backgroundColor: current }} />
                      <input
                        type="color"
                        value={current}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="type-label-large font-medium leading-none">{label}</p>
                      <p className="type-label-small text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetTheme}
              className="h-7 px-2 text-xs gap-1.5 text-muted-foreground"
            >
              <RotateCcwIcon className="h-3 w-3" /> Reset to defaults
            </Button>
          </CardContent>
        </Card>
        </div>
      )}

      {/* ── Data ───────────────────────────────────────────────────────────── */}
      {activeSection === "data" && (
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Data</CardTitle>
            <CardDescription>
              Populate your collection with 12 sample cards across all sports and genres.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="type-body-medium text-muted-foreground">
              Adds cards spanning basketball, football, baseball, hockey, and Pokémon. Includes 4 cards with prices pre-seeded from all 3 data sources.
            </p>
            <Button onClick={handleSeedTestData} variant="outline" disabled={seeding} className="gap-2" data-tour-id="tour-generate-btn">
              <FlaskConicalIcon className="h-4 w-4" />
              {seeding ? "Generating…" : "Add 12 Test Cards"}
            </Button>
          </CardContent>
        </Card>
        </div>
      )}

      {/* ── General ────────────────────────────────────────────────────────── */}
      {activeSection === "general" && (
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auto-refresh</CardTitle>
            <CardDescription>How often to automatically check card prices across all sources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className={!isAdmin ? "text-muted-foreground" : undefined}>Refresh interval</Label>
              <Select
                value={refreshInterval}
                onValueChange={(v) => { if (v && isAdmin) setRefreshInterval(v); }}
                disabled={!isAdmin}
              >
                <SelectTrigger className={!isAdmin ? "opacity-60 cursor-not-allowed" : undefined}>
                  <SelectValue>
                    {(value: string) => REFRESH_INTERVALS.find((o) => o.value === value)?.label ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REFRESH_INTERVALS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="type-label-small text-muted-foreground">
                {isAdmin ? "Takes effect after server restart" : "Only admins can change this setting"}
              </p>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className={refreshBlocked ? "text-muted-foreground" : undefined}>Manual refresh</Label>
              <p className="type-body-medium text-muted-foreground mb-2">
                Immediately fetch fresh prices for all cards in your collection.
              </p>
              <Button onClick={triggerRefreshAll} variant="outline" className="gap-2" disabled={refreshBlocked}>
                <RefreshCwIcon className="h-4 w-4" /> Refresh All Prices Now
              </Button>
              {refreshBlocked && refreshCooldownUntil && (
                <p className="type-label-small text-muted-foreground">
                  Available again in {Math.ceil((refreshCooldownUntil.getTime() - Date.now()) / 3_600_000)}h
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing Sources</CardTitle>
            <CardDescription>The following sources are checked for each card.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: "eBay",               url: "ebay.com",               desc: "Completed/sold listings" },
                { name: "SportsCardInvestor", url: "sportscardinvestor.com", desc: "Market pricing data" },
                { name: "SportsCardsPro",     url: "sportscardspro.com",     desc: "Price guide & population" },
              ].map(({ name, url, desc }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="type-label-large font-medium">{name}</p>
                    <p className="type-label-small text-muted-foreground">{desc}</p>
                  </div>
                  <a href={`https://www.${url}`} target="_blank" rel="noopener noreferrer"
                    className="type-label-small text-primary hover:underline">{url}</a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Welcome Tour</CardTitle>
            <CardDescription>
              Replay the guided walkthrough that highlights key features of the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                localStorage.removeItem("cv_tour_done");
                router.push("/dashboard");
                setTimeout(() => window.dispatchEvent(new CustomEvent("cv:start-tour")), 50);
              }}
            >
              <SparklesIcon className="h-4 w-4" />
              Start Welcome Tour
            </Button>
          </CardContent>
        </Card>
        </div>
      )}

      {/* ── System ────────────────────────────────────────────────────────── */}
      {activeSection === "system" && (
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Docker Volume Mounts</CardTitle>
            <CardDescription>
              Configure storage paths via environment variables in docker-compose.yml.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="font-mono text-xs bg-muted rounded-lg p-4 text-muted-foreground space-y-1">
              <p className="opacity-60"># Database (SQLite file)</p>
              <p>DATA_DIR=./data</p>
              <p className="mt-2 opacity-60"># Card images</p>
              <p>UPLOADS_DIR=./uploads</p>
              <p className="mt-2 opacity-60"># Port</p>
              <p>PORT=3000</p>
            </div>
            <p className="type-body-small text-muted-foreground">
              Set these in a <code className="bg-muted px-1 rounded">.env</code> file alongside{" "}
              <code className="bg-muted px-1 rounded">docker-compose.yml</code>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export Settings</CardTitle>
            <CardDescription>
              Download all current settings as a JSON file for backup or migration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={exportSettings} className="gap-2">
              <DownloadIcon className="h-4 w-4" />
              Export Settings as JSON
            </Button>
          </CardContent>
        </Card>
        </div>
      )}

      </div>

      {/* Fixed save bar — always visible at the bottom, offset past the sidebar */}
      <div className="fixed bottom-0 left-60 right-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          {isActualAdmin && (
            <Button
              variant={previewRole === "user" ? "secondary" : "outline"}
              size="sm"
              className={previewRole === "user" ? "gap-2 ring-1 ring-border" : "gap-2 text-muted-foreground"}
              onClick={() => setPreviewRole((r) => (r === "admin" ? "user" : "admin"))}
            >
              {previewRole === "admin" ? (
                <><EyeIcon className="h-3.5 w-3.5" /> Preview as User</>
              ) : (
                <><ShieldIcon className="h-3.5 w-3.5" /> Back to Admin view</>
              )}
            </Button>
          )}
          <Button onClick={saveSettings} disabled={saving} className="gap-2 ml-auto shadow-sm">
            <SaveIcon className="h-4 w-4" />
            {saving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
