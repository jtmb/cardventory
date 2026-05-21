"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SaveIcon, RefreshCwIcon, FlaskConicalIcon, RotateCcwIcon } from "lucide-react";
import { seedTestData } from "@/lib/actions";
import {
  THEME_VARS,
  type ThemeColors,
  THEME_LS_KEY,
  applyThemeColors,
  resetThemeColors,
  FONT_THEMES,
  type FontThemeKey,
  FONT_LS_KEY,
  applyFontTheme,
} from "@/lib/theme";

const REFRESH_INTERVALS = [
  { value: "0", label: "Disabled" },
  { value: "360", label: "Every 6 hours" },
  { value: "720", label: "Every 12 hours" },
  { value: "1440", label: "Every 24 hours" },
  { value: "4320", label: "Every 3 days" },
  { value: "10080", label: "Every week" },
];

export default function SettingsPage() {
  const [refreshInterval, setRefreshInterval] = useState("1440");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [themeColors, setThemeColors] = useState<Partial<ThemeColors>>({});
  const [fontTheme, setFontTheme] = useState<FontThemeKey>("sport");

  useEffect(() => {
    // Apply from localStorage immediately (ThemeApplicator also does this, but
    // we need the state here for the colour pickers to show current values)
    try {
      const stored = localStorage.getItem(THEME_LS_KEY);
      if (stored) setThemeColors(JSON.parse(stored));
    } catch {}

    try {
      const storedFont = localStorage.getItem(FONT_LS_KEY) as FontThemeKey | null;
      if (storedFont) setFontTheme(storedFont);
    } catch {}

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.refresh_interval) setRefreshInterval(data.refresh_interval);
        if (data.theme_colors) {
          try {
            const apiColors = JSON.parse(data.theme_colors) as Partial<ThemeColors>;
            setThemeColors(apiColors);
            localStorage.setItem(THEME_LS_KEY, JSON.stringify(apiColors));
            applyThemeColors(apiColors);
          } catch {}
        }
        if (data.font_theme) {
          const f = data.font_theme as FontThemeKey;
          setFontTheme(f);
          localStorage.setItem(FONT_LS_KEY, f);
          applyFontTheme(f);
        }
      })
      .catch(() => {});
  }, []);

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
  }

  function handleResetTheme() {
    setThemeColors({});
    localStorage.removeItem(THEME_LS_KEY);
    resetThemeColors();
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_interval: refreshInterval,
          theme_colors: JSON.stringify(themeColors),
          font_theme: fontTheme,
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
      toast.success(`Refreshed ${data.refreshed} of ${data.total} cards`);
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure Cardventory to your preferences</p>
      </div>

      {/* Text Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Text Theme</CardTitle>
          <CardDescription>Choose a typography style for the entire app.</CardDescription>
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
                <div
                  className="text-lg font-bold mb-1 truncate"
                  style={theme.previewStyle}
                >
                  MY COLLECTION
                </div>
                <p className="font-semibold text-sm">{theme.label}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{theme.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme Colors</CardTitle>
          <CardDescription>Customise the app appearance. Changes apply instantly — save to persist.</CardDescription>
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
                    <p className="text-sm font-medium leading-none">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
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

      {/* Test Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Data</CardTitle>
          <CardDescription>
            Populate your collection with sample cards to explore the UI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Adds 6 realistic sports cards (basketball, football, baseball, hockey) with price history so all dashboard stats and charts populate immediately.
            </p>
            <Button
              onClick={handleSeedTestData}
              variant="outline"
              disabled={seeding}
              className="mt-2 gap-2"
            >
              <FlaskConicalIcon className="h-4 w-4" />
              {seeding ? "Generating…" : "Generate 6 Test Cards"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing Refresh</CardTitle>
          <CardDescription>
            How often to automatically check card prices across all 4 sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Auto-refresh interval</Label>
            <Select value={refreshInterval} onValueChange={(v) => { if (v) setRefreshInterval(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFRESH_INTERVALS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Takes effect after server restart</p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Manual refresh</Label>
            <p className="text-xs text-muted-foreground mb-2">Immediately fetch fresh prices for all cards in your collection</p>
            <Button
              onClick={triggerRefreshAll}
              variant="outline"
              className="gap-2"
            >
              <RefreshCwIcon className="h-4 w-4" /> Refresh All Prices Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data sources info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing Sources</CardTitle>
          <CardDescription>
            The following sources are checked for each card
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: "eBay", url: "ebay.com", desc: "Completed/sold listings" },
              { name: "SportsCardInvestor", url: "sportscardinvestor.com", desc: "Market pricing data" },
              { name: "CardLadder", url: "cardladder.com", desc: "Historical sales data" },
              { name: "SportsCardsPro", url: "sportscardspro.com", desc: "Price guide & population" },
            ].map(({ name, url, desc }) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <a href={`https://www.${url}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline">{url}</a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Volume mounts info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Docker Volume Mounts</CardTitle>
          <CardDescription>
            Configure storage paths via environment variables in docker-compose.yml
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
          <p className="text-xs text-muted-foreground">
            Set these in a <code className="bg-muted px-1 rounded">.env</code> file alongside <code className="bg-muted px-1 rounded">docker-compose.yml</code>
          </p>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="gap-2">
        <SaveIcon className="h-4 w-4" />
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}

