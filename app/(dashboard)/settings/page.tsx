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
  CheckIcon, DownloadIcon, UploadIcon, SparklesIcon, EyeIcon, ShieldIcon,
  BellIcon, MailIcon, MessageSquareIcon, EyeOffIcon, SendIcon,
  DatabaseIcon, Trash2Icon,
} from "lucide-react";
import { seedTestData } from "@/lib/actions";
import {
  THEME_VARS, type ThemeColors, THEME_LS_KEY, applyThemeColors, resetThemeColors,
  FONT_THEMES, type FontThemeKey, FONT_LS_KEY, applyFontTheme,
  PRESET_THEMES, PRESET_LS_KEY, applyPresetTheme, type PresetThemeKey,
  TYPE_DENSITY_OPTIONS, TYPE_DENSITY_LS_KEY, applyTypeDensity, type TypeDensityKey,
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
  notifications: "Notifications",
  system: "System",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [fontTheme, setFontTheme] = useState<FontThemeKey>("system");
  const [activePreset, setActivePreset] = useState<PresetThemeKey | null>(null);
  const [typeDensity, setTypeDensity] = useState<TypeDensityKey>("default");
  const [chipStyle, setChipStyle] = useState<ChipStyleKey>("assist");
  const [btnStyle, setBtnStyle] = useState<ButtonStyleKey>("filled");
  const [sleeveEffect, setSleeveEffect] = useState(true);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState<Date | null>(null);
  // Notification state
  const [notifEmailEnabled, setNotifEmailEnabled] = useState(false);
  const [notifSmtpHost, setNotifSmtpHost] = useState("");
  const [notifSmtpPort, setNotifSmtpPort] = useState("587");
  const [notifSmtpSecure, setNotifSmtpSecure] = useState(false);
  const [notifSmtpUser, setNotifSmtpUser] = useState("");
  const [notifSmtpPass, setNotifSmtpPass] = useState("");
  const [notifEmailFrom, setNotifEmailFrom] = useState("");
  const [notifEmailTo, setNotifEmailTo] = useState("");
  const [notifDiscordEnabled, setNotifDiscordEnabled] = useState(false);
  const [notifDiscordWebhook, setNotifDiscordWebhook] = useState("");
  const [notifDiscordMode, setNotifDiscordMode] = useState<"webhook" | "dm">("webhook");
  const [notifDiscordBotToken, setNotifDiscordBotToken] = useState("");
  const [notifDiscordUserId, setNotifDiscordUserId] = useState("");
  const [notifOnNewHigh, setNotifOnNewHigh] = useState(true);
  const [notifOnPriceChange, setNotifOnPriceChange] = useState(false);
  // OAuth / system settings (admin only)
  const [oauthGoogleId, setOauthGoogleId] = useState("");
  const [oauthGoogleSecret, setOauthGoogleSecret] = useState("");
  const [oauthGithubId, setOauthGithubId] = useState("");
  const [oauthGithubSecret, setOauthGithubSecret] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  // Test notification loading
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  // Backup state (System tab, admin only)
  const [backupList, setBackupList] = useState<{ name: string; size: number; createdAt: string }[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [autoBackupHours, setAutoBackupHours] = useState("0");
  const [autoBackupMax, setAutoBackupMax] = useState("10");

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
        // Notifications
        if (data.notif_email_enabled) setNotifEmailEnabled(data.notif_email_enabled === "true");
        if (data.notif_smtp_host) setNotifSmtpHost(data.notif_smtp_host);
        if (data.notif_smtp_port) setNotifSmtpPort(data.notif_smtp_port);
        if (data.notif_smtp_secure) setNotifSmtpSecure(data.notif_smtp_secure === "true");
        if (data.notif_smtp_user) setNotifSmtpUser(data.notif_smtp_user);
        if (data.notif_smtp_pass) setNotifSmtpPass(data.notif_smtp_pass);
        if (data.notif_email_from) setNotifEmailFrom(data.notif_email_from);
        if (data.notif_email_to) setNotifEmailTo(data.notif_email_to);
        if (data.notif_discord_enabled) setNotifDiscordEnabled(data.notif_discord_enabled === "true");
        if (data.notif_discord_webhook) setNotifDiscordWebhook(data.notif_discord_webhook);
        if (data.notif_discord_mode === "dm" || data.notif_discord_mode === "webhook") setNotifDiscordMode(data.notif_discord_mode);
        if (data.notif_discord_bot_token) setNotifDiscordBotToken(data.notif_discord_bot_token);
        if (data.notif_discord_user_id) setNotifDiscordUserId(data.notif_discord_user_id);
        if (data.notif_on_new_high !== undefined) setNotifOnNewHigh(data.notif_on_new_high === "true");
        if (data.notif_on_price_change !== undefined) setNotifOnPriceChange(data.notif_on_price_change === "true");
      })
      .catch(() => {});

    // Load system settings (admin only)
    fetch("/api/system-settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.oauth_google_client_id) setOauthGoogleId(data.oauth_google_client_id);
        if (data.oauth_google_client_secret) setOauthGoogleSecret(data.oauth_google_client_secret);
        if (data.oauth_github_client_id) setOauthGithubId(data.oauth_github_client_id);
        if (data.oauth_github_client_secret) setOauthGithubSecret(data.oauth_github_client_secret);
        if (data.auto_backup_interval_hours) setAutoBackupHours(data.auto_backup_interval_hours);
        if (data.auto_backup_max_count) setAutoBackupMax(data.auto_backup_max_count);
      })
      .catch(() => {});
  }, []);

  // Lazy-load backup list when System tab is opened
  useEffect(() => {
    if (activeSection === "system" && isActualAdmin) {
      setBackupsLoading(true);
      fetch("/api/backups")
        .then((r) => r.json())
        .then((data) => { setBackupList(data); })
        .catch(() => {})
        .finally(() => setBackupsLoading(false));
    }
  }, [activeSection, isActualAdmin]);

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
    const defaultColors = Object.fromEntries(
      THEME_VARS.map(({ key, default: def }) => [key, def])
    ) as ThemeColors;
    return {
      theme_colors: { ...defaultColors, ...themeColors } as ThemeColors,
      preset_theme: activePreset,
      font_theme: fontTheme,
      type_density: typeDensity,
      chip_style: chipStyle,
      btn_style: btnStyle,
      sleeve_effect: sleeveEffect,
      refresh_interval: refreshInterval,
      notif_email_enabled: notifEmailEnabled,
      notif_smtp_host: notifSmtpHost,
      notif_smtp_port: notifSmtpPort,
      notif_smtp_secure: notifSmtpSecure,
      notif_smtp_user: notifSmtpUser,
      notif_smtp_pass: notifSmtpPass,
      notif_email_from: notifEmailFrom,
      notif_email_to: notifEmailTo,
      notif_discord_enabled: notifDiscordEnabled,
      notif_discord_webhook: notifDiscordWebhook,
      notif_discord_mode: notifDiscordMode,
      notif_discord_bot_token: notifDiscordBotToken,
      notif_discord_user_id: notifDiscordUserId,
      notif_on_new_high: notifOnNewHigh,
      notif_on_price_change: notifOnPriceChange,
    };
  }

  function exportSettings() {
    const payload = { version: 1, exported_at: new Date().toISOString(), ...buildSettingsPayload() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cardventory-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importSettings(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.theme_colors) { setThemeColors(data.theme_colors); applyThemeColors(data.theme_colors); localStorage.setItem(THEME_LS_KEY, JSON.stringify(data.theme_colors)); }
        if (data.preset_theme) { setActivePreset(data.preset_theme); localStorage.setItem(PRESET_LS_KEY, data.preset_theme); }
        if (data.font_theme) { setFontTheme(data.font_theme); applyFontTheme(data.font_theme); localStorage.setItem(FONT_LS_KEY, data.font_theme); }
        if (data.type_density) { setTypeDensity(data.type_density); applyTypeDensity(data.type_density); const opt = TYPE_DENSITY_OPTIONS.find((o) => o.key === data.type_density); if (opt) localStorage.setItem(TYPE_DENSITY_LS_KEY, opt.value); }
        if (data.chip_style) { setChipStyle(data.chip_style); applyChipStyle(data.chip_style); localStorage.setItem(CHIP_STYLE_LS_KEY, data.chip_style); }
        if (data.btn_style) { setBtnStyle(data.btn_style); applyButtonStyle(data.btn_style); localStorage.setItem(BUTTON_STYLE_LS_KEY, data.btn_style); }
        if (data.sleeve_effect !== undefined) { const sv = Boolean(data.sleeve_effect); setSleeveEffect(sv); applySleeve(sv); localStorage.setItem(SLEEVE_LS_KEY, String(sv)); }
        if (data.refresh_interval) setRefreshInterval(data.refresh_interval);
        if (data.notif_email_enabled !== undefined) setNotifEmailEnabled(data.notif_email_enabled);
        if (data.notif_smtp_host) setNotifSmtpHost(data.notif_smtp_host);
        if (data.notif_smtp_port) setNotifSmtpPort(data.notif_smtp_port);
        if (data.notif_smtp_secure !== undefined) setNotifSmtpSecure(data.notif_smtp_secure);
        if (data.notif_smtp_user) setNotifSmtpUser(data.notif_smtp_user);
        if (data.notif_smtp_pass) setNotifSmtpPass(data.notif_smtp_pass);
        if (data.notif_email_from) setNotifEmailFrom(data.notif_email_from);
        if (data.notif_email_to) setNotifEmailTo(data.notif_email_to);
        if (data.notif_discord_enabled !== undefined) setNotifDiscordEnabled(data.notif_discord_enabled);
        if (data.notif_discord_webhook) setNotifDiscordWebhook(data.notif_discord_webhook);
        if (data.notif_discord_mode === "dm" || data.notif_discord_mode === "webhook") setNotifDiscordMode(data.notif_discord_mode);
        if (data.notif_discord_bot_token) setNotifDiscordBotToken(data.notif_discord_bot_token);
        if (data.notif_discord_user_id) setNotifDiscordUserId(data.notif_discord_user_id);
        if (data.notif_on_new_high !== undefined) setNotifOnNewHigh(data.notif_on_new_high);
        if (data.notif_on_price_change !== undefined) setNotifOnPriceChange(data.notif_on_price_change);
        toast.success("Settings imported — click Save to apply");
      } catch {
        toast.error("Invalid settings file");
      }
    };
    reader.readAsText(file);
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
          chip_style: s.chip_style,
          btn_style: s.btn_style,
          sleeve_effect: String(s.sleeve_effect),
          notif_email_enabled: String(s.notif_email_enabled),
          notif_smtp_host: s.notif_smtp_host,
          notif_smtp_port: s.notif_smtp_port,
          notif_smtp_secure: String(s.notif_smtp_secure),
          notif_smtp_user: s.notif_smtp_user,
          notif_smtp_pass: s.notif_smtp_pass,
          notif_email_from: s.notif_email_from,
          notif_email_to: s.notif_email_to,
          notif_discord_enabled: String(s.notif_discord_enabled),
          notif_discord_webhook: s.notif_discord_webhook,
          notif_discord_mode: s.notif_discord_mode,
          notif_discord_bot_token: s.notif_discord_bot_token,
          notif_discord_user_id: s.notif_discord_user_id,
          notif_on_new_high: String(s.notif_on_new_high),
          notif_on_price_change: String(s.notif_on_price_change),
        }),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }

    // Save system settings (admin only) in parallel with main save
    if (isActualAdmin) {
      fetch("/api/system-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oauth_google_client_id: oauthGoogleId,
          oauth_google_client_secret: oauthGoogleSecret,
          oauth_github_client_id: oauthGithubId,
          oauth_github_client_secret: oauthGithubSecret,
          auto_backup_interval_hours: autoBackupHours,
          auto_backup_max_count: autoBackupMax,
        }),
      }).catch(() => {});
    }
  }

  async function sendTestNotification(type: "email" | "discord") {
    const setter = type === "email" ? setTestingEmail : setTestingDiscord;
    setter(true);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          config: {
            smtp_host: notifSmtpHost,
            smtp_port: notifSmtpPort,
            smtp_secure: String(notifSmtpSecure),
            smtp_user: notifSmtpUser,
            smtp_pass: notifSmtpPass,
            email_from: notifEmailFrom,
            email_to: notifEmailTo,
            discord_webhook: notifDiscordWebhook,
            discord_mode: notifDiscordMode,
            discord_bot_token: notifDiscordBotToken,
            discord_user_id: notifDiscordUserId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Test ${type === "email" ? "email" : "Discord message"} sent!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test notification");
    } finally {
      setter(false);
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
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <p className="type-label-large font-semibold">{preset.label}</p>
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{preset.mode}</span>
                    </div>
                    <p className="type-label-small text-muted-foreground line-clamp-1">{preset.desc}</p>
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
            <CardTitle className="text-base">Settings Backup</CardTitle>
            <CardDescription>Export or import all settings as JSON — includes theme, pricing, and notification config.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportSettings} className="gap-2">
              <DownloadIcon className="h-4 w-4" /> Export Settings
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => document.getElementById("settings-import-input")?.click()}>
              <UploadIcon className="h-4 w-4" /> Import Settings
            </Button>
            <input
              id="settings-import-input"
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importSettings(f); e.target.value = ""; }}
            />
          </CardContent>
        </Card>
        </div>
      )}

      {/* ── Notifications ───────────────────────────────────────────── */}
      {activeSection === "notifications" && (
        <div className="space-y-4">
        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MailIcon className="h-4 w-4" /> Email (SMTP)</CardTitle>
            <CardDescription>Send email notifications when card price events occur.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="notif-email-enabled" checked={notifEmailEnabled} onChange={e => setNotifEmailEnabled(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="notif-email-enabled">Enable email notifications</Label>
            </div>
            {notifEmailEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SMTP Host</Label>
                  <input value={notifSmtpHost} onChange={e => setNotifSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <input value={notifSmtpPort} onChange={e => setNotifSmtpPort(e.target.value)} placeholder="587" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <input value={notifSmtpUser} onChange={e => setNotifSmtpUser(e.target.value)} placeholder="you@gmail.com" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password / App Password</Label>
                  <input type="password" value={notifSmtpPass} onChange={e => setNotifSmtpPass(e.target.value)} placeholder="••••••••" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>From address</Label>
                  <input value={notifEmailFrom} onChange={e => setNotifEmailFrom(e.target.value)} placeholder="Cardventory &lt;you@gmail.com&gt;" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Send to</Label>
                  <input value={notifEmailTo} onChange={e => setNotifEmailTo(e.target.value)} placeholder="you@example.com" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <input type="checkbox" id="notif-smtp-secure" checked={notifSmtpSecure} onChange={e => setNotifSmtpSecure(e.target.checked)} className="h-4 w-4 rounded border-border" />
                  <Label htmlFor="notif-smtp-secure">Use SSL/TLS (port 465)</Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discord */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MessageSquareIcon className="h-4 w-4" /> Discord</CardTitle>
            <CardDescription>Post alerts to a Discord channel via webhook, or send a DM via a bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="notif-discord-enabled" checked={notifDiscordEnabled} onChange={e => setNotifDiscordEnabled(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <Label htmlFor="notif-discord-enabled">Enable Discord notifications</Label>
            </div>
            {notifDiscordEnabled && (
              <>
                {/* Mode toggle */}
                <div className="flex rounded-md border border-border overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => setNotifDiscordMode("webhook")}
                    className={`px-4 py-1.5 text-sm transition-colors ${notifDiscordMode === "webhook" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
                  >
                    Channel webhook
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifDiscordMode("dm")}
                    className={`px-4 py-1.5 text-sm transition-colors border-l border-border ${notifDiscordMode === "dm" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
                  >
                    Direct message
                  </button>
                </div>

                {notifDiscordMode === "webhook" ? (
                  <div className="space-y-1.5">
                    <Label>Webhook URL</Label>
                    <input
                      value={notifDiscordWebhook}
                      onChange={e => setNotifDiscordWebhook(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                    />
                    <p className="type-label-small text-muted-foreground">In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy URL.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Bot token</Label>
                      <input
                        type="password"
                        value={notifDiscordBotToken}
                        onChange={e => setNotifDiscordBotToken(e.target.value)}
                        placeholder="MTEx…"
                        className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Your Discord user ID</Label>
                      <input
                        value={notifDiscordUserId}
                        onChange={e => setNotifDiscordUserId(e.target.value)}
                        placeholder="123456789012345678"
                        className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                      />
                    </div>
                    <p className="type-label-small text-muted-foreground">
                      Create a bot at <strong>discord.com/developers</strong>, add it to a shared server, then enable DMs from server members. Your user ID is in Settings → Advanced → Developer Mode → right-click your name → Copy User ID.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><BellIcon className="h-4 w-4" /> Events</CardTitle>
            <CardDescription>Choose which card price events trigger a notification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="notif-new-high" checked={notifOnNewHigh} onChange={e => setNotifOnNewHigh(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <div>
                <Label htmlFor="notif-new-high">New price high</Label>
                <p className="type-label-small text-muted-foreground">Alert when a card hits a new all-time market value high.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="notif-price-change" checked={notifOnPriceChange} onChange={e => setNotifOnPriceChange(e.target.checked)} className="h-4 w-4 rounded border-border" />
              <div>
                <Label htmlFor="notif-price-change">Any price change</Label>
                <p className="type-label-small text-muted-foreground">Alert on every price refresh that returns new data.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><SendIcon className="h-4 w-4" /> Test Notifications</CardTitle>
            <CardDescription>Fire a test notification using your current (unsaved) settings.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2"
              disabled={testingEmail || !notifEmailEnabled}
              onClick={() => sendTestNotification("email")}
            >
              <MailIcon className="h-4 w-4" />
              {testingEmail ? "Sending…" : "Send Test Email"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={testingDiscord || !notifDiscordEnabled}
              onClick={() => sendTestNotification("discord")}
            >
              <MessageSquareIcon className="h-4 w-4" />
              {testingDiscord ? "Sending…" : "Send Test Discord"}
            </Button>
            {(!notifEmailEnabled && !notifDiscordEnabled) && (
              <p className="w-full type-label-small text-muted-foreground">Enable a notification channel above to test it.</p>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* ── System ────────────────────────────────────────────────────────── */}
      {activeSection === "system" && (
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Release Version</CardTitle>
            <CardDescription>The currently running build of Cardventory.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">v{process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown"}</p>
          </CardContent>
        </Card>
        {/* Database Backups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DatabaseIcon className="h-4 w-4" /> Database Backups
            </CardTitle>
            <CardDescription>
              Manual and automatic SQLite backups. Stored in <code className="bg-muted px-1 rounded">data/backups/</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Scheduler config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Auto-backup interval</Label>
                <select
                  value={autoBackupHours}
                  onChange={(e) => setAutoBackupHours(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="0">Disabled</option>
                  <option value="1">Every hour</option>
                  <option value="6">Every 6 hours</option>
                  <option value="12">Every 12 hours</option>
                  <option value="24">Every 24 hours</option>
                  <option value="168">Every week</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Keep last <span className="text-muted-foreground font-normal">(oldest pruned)</span></Label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={autoBackupMax}
                  onChange={(e) => setAutoBackupMax(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
            </div>
            <p className="type-label-small text-muted-foreground -mt-2">
              Scheduler starts on first request after server boot. Save settings to update interval.
            </p>

            {/* Manual backup */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Manual snapshot</p>
              <Button
                variant="outline"
                size="sm"
                disabled={creatingBackup}
                onClick={async () => {
                  setCreatingBackup(true);
                  try {
                    const res = await fetch("/api/backups", { method: "POST" });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    setBackupList((prev) => [data, ...prev]);
                    toast.success("Backup created");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Backup failed");
                  } finally {
                    setCreatingBackup(false);
                  }
                }}
                className="gap-2"
              >
                <DatabaseIcon className="h-4 w-4" />
                {creatingBackup ? "Backing up…" : "Back Up Now"}
              </Button>
            </div>

            {/* Backup list */}
            {backupsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded-md animate-pulse" />
                ))}
              </div>
            ) : backupList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No backups yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                {backupList.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs truncate">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(b.size)} · {new Date(b.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {/* Download */}
                      <a
                        href={`/api/backups/${encodeURIComponent(b.name)}`}
                        download
                        className="flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-muted transition-colors"
                        title="Download"
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                      </a>
                      {/* Restore */}
                      <button
                        type="button"
                        disabled={restoringBackup !== null}
                        onClick={async () => {
                          if (!confirm(`Restore "${b.name}"?\n\nA safety snapshot will be created first. The server must be restarted after restoring.`)) return;
                          setRestoringBackup(b.name);
                          try {
                            const res = await fetch(`/api/backups/${encodeURIComponent(b.name)}/restore`, { method: "POST" });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error);
                            toast.success("Restored! Restart the server to load the new data.");
                            // Refresh list to show the pre-restore snapshot
                            const listRes = await fetch("/api/backups");
                            if (listRes.ok) setBackupList(await listRes.json());
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Restore failed");
                          } finally {
                            setRestoringBackup(null);
                          }
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-muted transition-colors disabled:opacity-40"
                        title="Restore"
                      >
                        {restoringBackup === b.name ? (
                          <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcwIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Delete backup "${b.name}"?`)) return;
                          try {
                            const res = await fetch(`/api/backups/${encodeURIComponent(b.name)}`, { method: "DELETE" });
                            if (!res.ok) throw new Error((await res.json()).error);
                            setBackupList((prev) => prev.filter((x) => x.name !== b.name));
                            toast.success("Backup deleted");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Delete failed");
                          }
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-destructive/80 hover:text-destructive-foreground transition-colors"
                        title="Delete"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* OAuth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OAuth Providers</CardTitle>
            <CardDescription>
              Configure Google and GitHub sign-in. Changes take effect after the next server restart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="type-label-large font-semibold text-muted-foreground">Google</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Client ID</Label>
                  <input value={oauthGoogleId} onChange={e => setOauthGoogleId(e.target.value)} placeholder="123456-abc.apps.googleusercontent.com" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <input type={showSecrets ? "text" : "password"} value={oauthGoogleSecret} onChange={e => setOauthGoogleSecret(e.target.value)} placeholder="GOCSPX-…" className="w-full h-9 rounded-md border border-border bg-background px-3 pr-9 text-sm" />
                    <button type="button" onClick={() => setShowSecrets(s => !s)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                      {showSecrets ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="type-label-large font-semibold text-muted-foreground">GitHub</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Client ID</Label>
                  <input value={oauthGithubId} onChange={e => setOauthGithubId(e.target.value)} placeholder="Ov23li…" className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <input type={showSecrets ? "text" : "password"} value={oauthGithubSecret} onChange={e => setOauthGithubSecret(e.target.value)} placeholder="github_pat_…" className="w-full h-9 rounded-md border border-border bg-background px-3 pr-9 text-sm" />
                    <button type="button" onClick={() => setShowSecrets(s => !s)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                      {showSecrets ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <p className="type-label-small text-muted-foreground">
              Callback URLs to register:
              <code className="ml-1 bg-muted px-1 rounded">[domain]/api/auth/callback/google</code>
              {" · "}
              <code className="bg-muted px-1 rounded">[domain]/api/auth/callback/github</code>
            </p>
          </CardContent>
        </Card>
        </div>
      )}
      </div>{/* end p-6 wrapper */}

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
