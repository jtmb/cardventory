"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  SaveIcon, RefreshCwIcon, FlaskConicalIcon, RotateCcwIcon,
  CheckIcon, DownloadIcon, UploadIcon, SparklesIcon, EyeIcon, ShieldIcon,
  BellIcon, MailIcon, MessageSquareIcon, EyeOffIcon, SendIcon,
  DatabaseIcon, Trash2Icon, StarIcon, ServerIcon, ClockIcon, CpuIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { seedTestData } from "@/lib/actions";
import { UserManagementSection } from "@/components/user-management-section";
import {
  THEME_VARS, type ThemeColors, THEME_LS_KEY, applyThemeColors,
  FONT_THEMES, type FontThemeKey, FONT_LS_KEY, applyFontTheme,
  PRESET_THEMES, PRESET_LS_KEY, applyPresetTheme, type PresetThemeKey,
  TYPE_DENSITY_OPTIONS, TYPE_DENSITY_LS_KEY, applyTypeDensity, type TypeDensityKey,
  CHIP_STYLE_OPTIONS, CHIP_STYLE_LS_KEY, applyChipStyle, type ChipStyleKey,
  BUTTON_STYLE_OPTIONS, BUTTON_STYLE_LS_KEY, applyButtonStyle, type ButtonStyleKey,
  ZOOM_SCALE_OPTIONS, ZOOM_SCALE_LS_KEY, applyZoomScale, type ZoomScaleKey,
  SETTINGS_LAYOUT_OPTIONS, SETTINGS_LAYOUT_LS_KEY, settingsLayoutWrapperClass, type SettingsLayoutKey,
  SETTINGS_ARRANGEMENT_OPTIONS, SETTINGS_ARRANGEMENT_LS_KEY, settingsArrangementClass, type SettingsArrangementKey,
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
  account: "Account",
  general: "General",
  appearance: "Appearance",
  data: "Data",
  notifications: "Notifications",
  "user-management": "User Management",
  authentication: "Authentication",
  system: "System",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDefaultUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isActualAdmin = session?.user?.role === "admin";
  const [previewRole, setPreviewRole] = useState<"admin" | "user">("admin");
  const isAdmin = isActualAdmin && previewRole === "admin";
  const activeSection = searchParams.get("s") ?? "general";
  const [refreshInterval, setRefreshInterval] = useState("1440");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [triggeringEvent, setTriggeringEvent] = useState(false);
  const [themeColors, setThemeColors] = useState<Partial<ThemeColors>>({});
  const [fontTheme, setFontTheme] = useState<FontThemeKey>("system");
  const [activePreset, setActivePreset] = useState<PresetThemeKey | null>("default");
  const [typeDensity, setTypeDensity] = useState<TypeDensityKey>("default");
  const [chipStyle, setChipStyle] = useState<ChipStyleKey>("assist");
  const [btnStyle, setBtnStyle] = useState<ButtonStyleKey>("filled");
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
  // Signup Discord notifications (admin-only system settings)
  const [signupDiscordEnabled, setSignupDiscordEnabled] = useState(false);
  const [signupDiscordWebhook, setSignupDiscordWebhook] = useState("");
  const [signupNotifyRegister, setSignupNotifyRegister] = useState(true);
  const [signupNotifyPending, setSignupNotifyPending] = useState(true);
  // Demo mode
  const [demoMode, setDemoMode] = useState(false);
  // OAuth / system settings (admin only)
  const [oauthGoogleId, setOauthGoogleId] = useState("");
  const [oauthGoogleSecret, setOauthGoogleSecret] = useState("");
  const [oauthGithubId, setOauthGithubId] = useState("");
  const [oauthGithubSecret, setOauthGithubSecret] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [autoDenyHours, setAutoDenyHours] = useState("0");
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
  const [zoomScale, setZoomScale] = useState<ZoomScaleKey>("natural");
  const [settingsLayout, setSettingsLayout] = useState<SettingsLayoutKey>("centered");
  const [settingsArrangement, setSettingsArrangement] = useState<SettingsArrangementKey>("single");
  // Appearance extras
  const [priceBadges, setPriceBadges] = useState(true);
  // System info (admin)
  const [systemInfo, setSystemInfo] = useState<{
    version: string;
    nodeVersion: string;
    platform: string;
    startedAt: string;
    uptimeSeconds: number;
    dbSizeBytes: number | null;
  } | null>(null);
  // Logo state (admin)
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  // Banner state (admin)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  // Account panel state
  const [accountName, setAccountName] = useState(session?.user?.name ?? "");
  const [accountCurrentPw, setAccountCurrentPw] = useState("");
  const [accountNewPw, setAccountNewPw] = useState("");
  const [accountConfirmPw, setAccountConfirmPw] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  // Public profile
  const [usernameInput, setUsernameInput] = useState(() => toDefaultUsername(session?.user?.name ?? ""));
  const [profilePublic, setProfilePublic] = useState(false);
  const [profileTradeBaitOnly, setProfileTradeBaitOnly] = useState(false);
  const [showPublicConfirm, setShowPublicConfirm] = useState(false);

  // Sync name from session when session loads
  useEffect(() => {
    if (session?.user?.name && !accountName) setAccountName(session.user.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.name]);

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
      const z = localStorage.getItem(ZOOM_SCALE_LS_KEY) as ZoomScaleKey | null;
      if (z) setZoomScale(z);
    } catch {}
    try {
      const sl = localStorage.getItem(SETTINGS_LAYOUT_LS_KEY) as SettingsLayoutKey | null;
      if (sl && SETTINGS_LAYOUT_OPTIONS.some((o) => o.key === sl)) setSettingsLayout(sl);
    } catch {}
    try {
      const sa = localStorage.getItem(SETTINGS_ARRANGEMENT_LS_KEY) as SettingsArrangementKey | null;
      if (sa) setSettingsArrangement(sa);
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
        if (data.zoom_scale) {
          const z = data.zoom_scale as ZoomScaleKey;
          setZoomScale(z);
          localStorage.setItem(ZOOM_SCALE_LS_KEY, z);
          applyZoomScale(z);
        }
        if (data.settings_layout && SETTINGS_LAYOUT_OPTIONS.some((o) => o.key === data.settings_layout)) {
          const sl = data.settings_layout as SettingsLayoutKey;
          setSettingsLayout(sl);
          localStorage.setItem(SETTINGS_LAYOUT_LS_KEY, sl);
        }
        if (data.settings_arrangement) {
          const sa = data.settings_arrangement as SettingsArrangementKey;
          setSettingsArrangement(sa);
          localStorage.setItem(SETTINGS_ARRANGEMENT_LS_KEY, sa);
        }
        if (data.price_badges !== undefined) setPriceBadges(data.price_badges !== "false");
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
        // Public profile
        setUsernameInput(data._username || toDefaultUsername(session?.user?.name ?? ""));
        if (data._profilePublic !== undefined) setProfilePublic(Boolean(data._profilePublic));
        if (data.profile_trade_bait_only !== undefined) setProfileTradeBaitOnly(data.profile_trade_bait_only === "true");
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
        if (data.allow_registration !== undefined) setAllowRegistration(data.allow_registration !== "false");
        if (data.require_approval !== undefined) setRequireApproval(data.require_approval === "true");
        if (data.auto_deny_after_hours !== undefined) {
          const validOptions = ["0", "24", "48", "96", "168"];
          const stored = String(data.auto_deny_after_hours);
          setAutoDenyHours(validOptions.includes(stored) ? stored : "0");
        }
        if (data.signup_discord_enabled !== undefined) setSignupDiscordEnabled(data.signup_discord_enabled === "true");
        if (data.signup_discord_webhook) setSignupDiscordWebhook(data.signup_discord_webhook);
        if (data.signup_notify_register !== undefined) setSignupNotifyRegister(data.signup_notify_register !== "false");
        if (data.signup_notify_pending !== undefined) setSignupNotifyPending(data.signup_notify_pending !== "false");
        if (data.demo_mode !== undefined) setDemoMode(data.demo_mode === "true");
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
      // Load current logo
      fetch("/api/admin/logo")
        .then((r) => r.json())
        .then((data) => { if (data.url) setLogoPreview(data.url); })
        .catch(() => {});
      // Load current banner
      fetch("/api/admin/banner")
        .then((r) => r.json())
        .then((data) => { if (data.url) setBannerPreview(data.url); })
        .catch(() => {});
      // Load system info
      fetch("/api/system-info")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setSystemInfo(data); })
        .catch(() => {});
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
    const dp = PRESET_THEMES.find((p) => p.key === "default")!;
    setThemeColors(dp.colors);
    setActivePreset("default");
    applyPresetTheme("default");
    localStorage.setItem(THEME_LS_KEY, JSON.stringify(dp.colors));
    localStorage.setItem(PRESET_LS_KEY, "default");
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

  function handleZoomScale(key: ZoomScaleKey) {
    setZoomScale(key);
    applyZoomScale(key);
    localStorage.setItem(ZOOM_SCALE_LS_KEY, key);
  }

  function handleSettingsLayout(key: SettingsLayoutKey) {
    setSettingsLayout(key);
    localStorage.setItem(SETTINGS_LAYOUT_LS_KEY, key);
  }

  function handleSettingsArrangement(key: SettingsArrangementKey) {
    setSettingsArrangement(key);
    localStorage.setItem(SETTINGS_ARRANGEMENT_LS_KEY, key);
  }

  async function handleResetAllAppearance() {
    const dp = PRESET_THEMES.find((p) => p.key === "default")!;
    // Reset state
    setThemeColors(dp.colors);
    setActivePreset("default");
    setFontTheme("system");
    setTypeDensity("default");
    setChipStyle("assist");
    setBtnStyle("filled");
    setZoomScale("natural");
    setPriceBadges(true);
    setSettingsLayout("centered");
    setSettingsArrangement("single");
    // Apply CSS immediately
    applyPresetTheme("default");
    applyFontTheme("system");
    applyTypeDensity("default");
    applyChipStyle("assist");
    applyButtonStyle("filled");
    applyZoomScale("natural");
    // Sync localStorage
    localStorage.setItem(THEME_LS_KEY, JSON.stringify(dp.colors));
    localStorage.setItem(PRESET_LS_KEY, "default");
    localStorage.setItem(FONT_LS_KEY, "system");
    const defDensity = TYPE_DENSITY_OPTIONS.find((o) => o.key === "default");
    if (defDensity) localStorage.setItem(TYPE_DENSITY_LS_KEY, defDensity.value);
    localStorage.setItem(CHIP_STYLE_LS_KEY, "assist");
    localStorage.setItem(BUTTON_STYLE_LS_KEY, "filled");
    localStorage.setItem(ZOOM_SCALE_LS_KEY, "natural");
    localStorage.setItem(SETTINGS_LAYOUT_LS_KEY, "centered");
    localStorage.setItem(SETTINGS_ARRANGEMENT_LS_KEY, "single");
    // Persist to API
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme_colors: dp.colors,
          preset_theme: "default",
          font_theme: "system",
          type_density: "default",
          chip_style: "assist",
          btn_style: "filled",
          zoom_scale: "natural",
          price_badges: true,
          settings_layout: "centered",
          settings_arrangement: "single",
        }),
      });
      toast.success("Appearance reset to defaults");
    } catch {
      toast.error("Failed to save reset");
    }
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
      zoom_scale: zoomScale,
      settings_layout: settingsLayout,
      settings_arrangement: settingsArrangement,
      price_badges: priceBadges,
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
    const u = usernameInput.trim();
    if (u && !/^[a-zA-Z0-9_-]{3,30}$/.test(u)) {
      toast.error("Username must be 3–30 characters: letters, numbers, _ and - only.");
      return;
    }
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
          zoom_scale: s.zoom_scale,
          settings_layout: s.settings_layout,
          settings_arrangement: s.settings_arrangement,
          price_badges: String(s.price_badges),
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
          profile_trade_bait_only: String(profileTradeBaitOnly),
        }),
      });
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_public_profile", username: u || null, profilePublic }),
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
          allow_registration: String(allowRegistration),
          require_approval: String(requireApproval),
          auto_deny_after_hours: autoDenyHours,
          signup_discord_enabled: String(signupDiscordEnabled),
          signup_discord_webhook: signupDiscordWebhook,
          signup_notify_register: String(signupNotifyRegister),
          signup_notify_pending: String(signupNotifyPending),
          demo_mode: String(demoMode),
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
      <div className={`p-6 pb-20 ${settingsLayoutWrapperClass(settingsLayout)}`}>
      {activeSection !== "appearance" && (
      <div className="mb-4">
        <h1 className="type-headline-large font-bold">{SECTION_LABELS[activeSection] ?? "Settings"}</h1>
        <p className="type-body-medium text-muted-foreground mt-1">Configure Cardventory to your preferences</p>
      </div>
      )}

      {/* ── Account ────────────────────────────────────────────────────────── */}
      {activeSection === "account" && (
        <div className={settingsArrangementClass(settingsArrangement)}>
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Update your display name.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={accountSaving || !accountName.trim() || accountName === session?.user?.name}
                  onClick={async () => {
                    setAccountSaving(true);
                    try {
                      const res = await fetch("/api/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "update_profile", name: accountName.trim() }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      toast.success("Name updated");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    } finally {
                      setAccountSaving(false);
                    }
                  }}
                >
                  Save name
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>
                {session?.user
                  ? "Update your sign-in password. You'll need your current password to confirm."
                  : "OAuth accounts cannot set a password."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <input
                  type="password"
                  value={accountCurrentPw}
                  onChange={(e) => setAccountCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <input
                  type="password"
                  value={accountNewPw}
                  onChange={(e) => setAccountNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <input
                  type="password"
                  value={accountConfirmPw}
                  onChange={(e) => setAccountConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={accountSaving || !accountCurrentPw || !accountNewPw || !accountConfirmPw}
                  onClick={async () => {
                    if (accountNewPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
                    if (accountNewPw !== accountConfirmPw) { toast.error("Passwords do not match"); return; }
                    setAccountSaving(true);
                    try {
                      const res = await fetch("/api/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "change_password", currentPassword: accountCurrentPw, newPassword: accountNewPw }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      toast.success("Password changed");
                      setAccountCurrentPw("");
                      setAccountNewPw("");
                      setAccountConfirmPw("");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    } finally {
                      setAccountSaving(false);
                    }
                  }}
                >
                  Change password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Public Profile */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">Public Collection</CardTitle>
                <CardDescription>
                  Share your collection with a public link. Anyone with the link can view your owned cards.
                </CardDescription>
              </div>
              <button
                role="switch"
                aria-checked={profilePublic}
                onClick={() => { if (!profilePublic) setShowPublicConfirm(true); else setProfilePublic(false); }}
                className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${profilePublic ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${profilePublic ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </CardHeader>
            <CardContent className={`space-y-4 transition-opacity ${!profilePublic ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. jordan23"
                  maxLength={30}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">3–30 characters: letters, numbers, _ and - only.</p>
                <p className="text-xs text-amber-500/80 flex items-center gap-1">
                  <TriangleAlertIcon className="h-3 w-3 shrink-0" />
                  Your username is public and visible to anyone with the link.
                </p>
              </div>
              <div className={`flex items-center justify-between rounded-md border border-border px-3 py-2.5 transition-opacity ${!profilePublic ? "opacity-40 pointer-events-none" : ""}`}>
                <div>
                  <p className="text-sm font-medium">Show trade bait only</p>
                  <p className="text-xs text-muted-foreground">Public profile shows only cards marked for trade.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={profileTradeBaitOnly}
                  disabled={!profilePublic}
                  onClick={() => setProfileTradeBaitOnly((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${!profilePublic ? "cursor-not-allowed" : "cursor-pointer"} ${profileTradeBaitOnly ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${profileTradeBaitOnly ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              {usernameInput && profilePublic && (
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground overflow-hidden">
                  <span className="truncate font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/u/{usernameInput}</span>
                  <a
                    href={`/u/${usernameInput}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 underline hover:text-foreground transition-colors"
                  >
                    View
                  </a>
                  <button
                    className="shrink-0 underline hover:text-foreground transition-colors"
                    onClick={() => {
                      const url = `${window.location.origin}/u/${usernameInput}`;
                      navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => {});
                    }}
                  >
                    Copy
                  </button>
                </div>
              )}
            </CardContent>
            <AlertDialog open={showPublicConfirm} onOpenChange={setShowPublicConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Make collection public?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make your profile and full card inventory visible to anyone with the link.
                    You can restrict visibility to trade bait cards only using the <strong>Show trade bait only</strong> option after enabling.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setProfilePublic(true)}>Make public</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      )}

      {/* ── Appearance ─────────────────────────────────────────────────────── */}
      {activeSection === "appearance" && (
        <>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="type-headline-large font-bold">Appearance</h1>
            <p className="type-body-medium text-muted-foreground mt-1">Configure Cardventory to your preferences</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAllAppearance}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <RotateCcwIcon className="h-3.5 w-3.5" /> Reset all to defaults
          </Button>
        </div>
        <div className={settingsArrangementClass(settingsArrangement)}>
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

        {/* Price Change Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Price Change Badges</CardTitle>
            <CardDescription>
              Show trend badges on card thumbnails when the 7-day price moves up or down.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="type-label-large font-medium">Price badges</p>
                <p className="type-label-small text-muted-foreground mt-0.5">
                  {priceBadges ? "On — badges show on card thumbnails" : "Off — badges hidden"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={priceBadges}
                onClick={() => setPriceBadges((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  priceBadges ? "bg-primary border-primary" : "bg-muted border-border"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    priceBadges ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Zoom Scale */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desktop Zoom</CardTitle>
            <CardDescription className="hidden sm:block">
              Scale the entire UI for desktop screens. Has no effect on mobile.
            </CardDescription>
            <CardDescription className="sm:hidden text-muted-foreground/60">
              Desktop-only setting — not applied on mobile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:opacity-100 opacity-50 pointer-events-none sm:pointer-events-auto">
              {ZOOM_SCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleZoomScale(opt.key)}
                  disabled={typeof window !== "undefined" && window.innerWidth < 1024}
                  className={`text-left rounded-lg border-2 p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    zoomScale === opt.key ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="font-bold mb-1 leading-none" style={{ fontSize: `${Math.max(opt.value * 0.95, 0.85)}rem` }}>
                    {Math.round(opt.value * 100)}%
                  </p>
                  <p className="type-label-large font-semibold mt-1.5">{opt.label}</p>
                  <p className="type-label-small text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings Panel Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings Panel Width</CardTitle>
            <CardDescription>
              Control how wide the settings content area is on desktop. Has no effect on mobile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:opacity-100 opacity-50 pointer-events-none sm:pointer-events-auto">
              {SETTINGS_LAYOUT_OPTIONS.map((opt) => {
                const isDisabled = opt.key === "centered" && settingsArrangement !== "single";
                return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => !isDisabled && handleSettingsLayout(opt.key)}
                  disabled={isDisabled}
                  title={isDisabled ? "Centered is too narrow for multi-column layouts" : undefined}
                  className={`text-left rounded-lg border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isDisabled
                      ? "border-border opacity-35 cursor-not-allowed"
                      : settingsLayout === opt.key
                        ? "border-primary bg-primary/5 hover:border-primary/60"
                        : "border-border hover:border-primary/60"
                  }`}
                >
                  <p className="type-label-large font-semibold">{opt.label}</p>
                  <p className="type-label-small text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Card Arrangement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Card Arrangement</CardTitle>
            <CardDescription>
              Choose how setting cards are arranged on desktop. Does not affect mobile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:opacity-100 opacity-50 pointer-events-none sm:pointer-events-auto">
              {SETTINGS_ARRANGEMENT_OPTIONS.map((opt) => {
                const isDisabled = opt.key !== "single" && settingsLayout === "centered";
                return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => !isDisabled && handleSettingsArrangement(opt.key)}
                  disabled={isDisabled}
                  title={isDisabled ? "Switch to Wide or Full panel width to use this layout" : undefined}
                  className={`relative text-left rounded-lg border-2 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isDisabled
                      ? "border-border opacity-35 cursor-not-allowed"
                      : settingsArrangement === opt.key
                        ? "border-primary bg-primary/5 hover:border-primary/60"
                        : "border-border hover:border-primary/60"
                  }`}
                >
                  {/* Mini layout preview */}
                  <div className="mb-2.5 flex gap-1 h-8">
                    {opt.key === "single" && (
                      <div className="flex-1 rounded bg-muted-foreground/20 border border-muted-foreground/30" />
                    )}
                    {opt.key === "grid" && (
                      <>
                        <div className="flex-1 rounded bg-muted-foreground/20 border border-muted-foreground/30" />
                        <div className="flex-1 rounded bg-muted-foreground/20 border border-muted-foreground/30" />
                      </>
                    )}
                    {opt.key === "dense" && (
                      <>
                        <div className="flex-1 rounded bg-muted-foreground/20 border border-muted-foreground/30" />
                        <div className="flex-1 rounded bg-muted-foreground/20 border border-muted-foreground/30" />
                        <div className="flex-1 rounded bg-muted-foreground/20 border border-muted-foreground/30" />
                      </>
                    )}
                  </div>
                  <p className="type-label-large font-semibold">{opt.label}</p>
                  <p className="type-label-small text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
                );
              })}
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
        </>
      )}

      {/* ── Data ───────────────────────────────────────────────────────────── */}
      {activeSection === "data" && (
        <div className={settingsArrangementClass(settingsArrangement)}>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trigger Test Event</CardTitle>
            <CardDescription>
              Insert a test notification into the event queue. It will appear as a toast on the next poll cycle (up to 30 s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={triggeringEvent}
              className="gap-2"
              onClick={async () => {
                setTriggeringEvent(true);
                try {
                  const res = await fetch("/api/notifications", { method: "POST" });
                  if (!res.ok) throw new Error("Failed");
                  toast.success("Test event queued — watch for the toast notification");
                } catch {
                  toast.error("Failed to trigger test event");
                } finally {
                  setTriggeringEvent(false);
                }
              }}
            >
              <BellIcon className="h-4 w-4" />
              {triggeringEvent ? "Queuing…" : "Trigger Test Event"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Release Notes</CardTitle>
            <CardDescription>
              Preview the release notes modal for the current version.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                localStorage.removeItem("cv_last_seen_version");
                window.dispatchEvent(new CustomEvent("cv:show-release-notes"));
              }}
            >
              <SparklesIcon className="h-4 w-4" />
              Show Release Notes
            </Button>
          </CardContent>
        </Card>
        </div>
      )}

      {/* ── General ────────────────────────────────────────────────────────── */}
      {activeSection === "general" && (
        <div className={settingsArrangementClass(settingsArrangement)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Welcome Tour</CardTitle>
            <CardDescription>
              Replay the guided walkthrough that highlights key features of the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative inline-flex">
              <StarIcon className="sparkle-star absolute -top-3 -right-2 h-3.5 w-3.5 text-yellow-400 fill-yellow-400 pointer-events-none" />
              <StarIcon className="sparkle-star absolute -bottom-2.5 right-2 h-3 w-3 text-yellow-400 fill-yellow-400 pointer-events-none" />
              <StarIcon className="sparkle-star absolute top-0 -left-2.5 h-2.5 w-2.5 text-yellow-300 fill-yellow-300 pointer-events-none" />
              <StarIcon className="sparkle-star absolute -top-1 right-7 h-2 w-2 text-yellow-400 fill-yellow-400 pointer-events-none" />
              <StarIcon className="sparkle-star absolute bottom-0 -left-1.5 h-2 w-2 text-yellow-300 fill-yellow-300 pointer-events-none" />
              <Button
                variant="outline"
                className="gap-2 tour-btn-shimmer ring-1 ring-yellow-400/40 hover:ring-yellow-400/80 hover:border-yellow-400/60 hover:bg-yellow-400/5 transition-colors"
                onClick={() => {
                  localStorage.removeItem("cv_tour_done");
                  router.push("/dashboard");
                  setTimeout(() => window.dispatchEvent(new CustomEvent("cv:start-tour")), 50);
                }}
              >
                <SparklesIcon className="h-4 w-4 text-yellow-400" />
                Start Welcome Tour
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Welcome to Cardventory</CardTitle>
            <CardDescription>Your sports card collection manager.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {([
                "Track and organize your entire card collection",
                "Live price lookups from eBay, SportsCardInvestor & SportscardsPro",
                "Watchlist for cards you\u2019re hunting",
                "Notifications for price spikes and new all-time highs",
                "Automatic backups with import/export support",
                "Customizable themes, layouts, and display preferences",
              ] as const).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckIcon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <span className="text-xs text-muted-foreground">Release Version</span>
              <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md border border-border">
                v{process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown"}
              </code>
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
        <div className={settingsArrangementClass(settingsArrangement)}>
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
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => toast("Test notification", { description: "Toast notifications are working correctly!" })}
            >
              <BellIcon className="h-4 w-4" />
              Send Test Toast
            </Button>
            {(!notifEmailEnabled && !notifDiscordEnabled) && (
              <p className="w-full type-label-small text-muted-foreground">Enable a notification channel above to test it.</p>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* ── User Management ───────────────────────────────────────────────── */}
      {activeSection === "user-management" && isAdmin && (
        <div className={settingsArrangementClass(settingsArrangement)}>
          <UserManagementSection />
        </div>
      )}

      {/* ── Authentication ────────────────────────────────────────────────── */}
      {activeSection === "authentication" && isAdmin && (
        <div className={settingsArrangementClass(settingsArrangement)}>
          {/* Signup Discord notifications — shown first so admins configure alerts before enabling registration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareIcon className="h-4 w-4" /> Signup Notifications
              </CardTitle>
              <CardDescription>
                Send a Discord webhook message when someone registers or is placed in the approval queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="signup-discord-enabled"
                  checked={signupDiscordEnabled}
                  onChange={(e) => setSignupDiscordEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="signup-discord-enabled">Enable signup Discord notifications</Label>
              </div>
              {signupDiscordEnabled && (
                <>
                  <div className="space-y-1.5">
                    <Label>Webhook URL</Label>
                    <input
                      value={signupDiscordWebhook}
                      onChange={(e) => setSignupDiscordWebhook(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Notify on</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="signup-notify-register"
                        checked={signupNotifyRegister}
                        onChange={(e) => setSignupNotifyRegister(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div>
                        <Label htmlFor="signup-notify-register">New registration</Label>
                        <p className="type-label-small text-muted-foreground">Alert when a user successfully registers.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="signup-notify-pending"
                        checked={signupNotifyPending}
                        onChange={(e) => setSignupNotifyPending(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div>
                        <Label htmlFor="signup-notify-pending">Pending approval</Label>
                        <p className="type-label-small text-muted-foreground">Alert when a new account is waiting for admin approval.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Registration Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration</CardTitle>
              <CardDescription>Control how new users can create accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Allow new registrations</p>
                  <p className="text-xs text-muted-foreground mt-0.5">When disabled, new users cannot create accounts. Existing accounts are not affected.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={allowRegistration}
                    onChange={(e) => setAllowRegistration(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-muted border border-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-4.5" />
                </label>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Require admin approval</p>
                  <p className="text-xs text-muted-foreground mt-0.5">New registrations (including OAuth) are placed in a pending queue. Accounts cannot sign in until an admin approves them in User Management.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-muted border border-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-4.5" />
                </label>
              </div>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Auto-deny after</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically deny and delete pending requests after the selected time. Set to Never to disable.</p>
                </div>
                <select
                  value={autoDenyHours}
                  onChange={(e) => setAutoDenyHours(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                >
                  <option value="0">Never</option>
                  <option value="24">1 day</option>
                  <option value="48">2 days</option>
                  <option value="96">4 days</option>
                  <option value="168">7 days</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* OAuth Providers */}
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

          {/* Session Management — moved here from System tab */}
          <SignOutAllCard />
        </div>
      )}

      {/* ── System ────────────────────────────────────────────────────────── */}
      {activeSection === "system" && (
        <div className={settingsArrangementClass(settingsArrangement)}>
        {/* Demo Mode */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConicalIcon className="h-4 w-4" /> Demo Mode
              </CardTitle>
              <CardDescription>
                Show a visible banner indicating this is a demonstration instance. Useful when sharing the app with others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Enable demo mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Displays a &ldquo;Demo Mode&rdquo; banner across the top of the dashboard for all users.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={(e) => setDemoMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-muted border border-border rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:after:translate-x-4.5" />
                </label>
              </div>
            </CardContent>
          </Card>
        )}
        {/* App Logo */}
        {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Logo</CardTitle>
            <CardDescription>
              Upload a custom logo that replaces the default icon in the sidebar. Max 512 KB, image files only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo preview" className="w-12 h-12 rounded-xl object-contain border border-border bg-muted" />
              ) : (
                <div className="w-12 h-12 rounded-xl border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-xl">&#128247;</div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors text-sm font-medium">
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={logoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 512 * 1024) { toast.error("File too large (max 512 KB)"); return; }
                      setLogoUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append("logo", file);
                        const res = await fetch("/api/admin/logo", { method: "POST", body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);
                        setLogoPreview(data.url);
                        toast.success("Logo updated");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Upload failed");
                      } finally {
                        setLogoUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    disabled={logoUploading}
                    onClick={async () => {
                      setLogoUploading(true);
                      try {
                        await fetch("/api/admin/logo", { method: "DELETE" });
                        setLogoPreview(null);
                        toast.success("Logo removed");
                      } finally { setLogoUploading(false); }
                    }}
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="type-label-large font-medium">Or use an image URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={logoUrlInput}
                  onChange={(e) => setLogoUrlInput(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={logoUploading || !logoUrlInput.trim()}
                  onClick={async () => {
                    const url = logoUrlInput.trim();
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                      toast.error("URL must start with http:// or https://");
                      return;
                    }
                    setLogoUploading(true);
                    try {
                      const res = await fetch("/api/admin/logo", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      setLogoPreview(data.url);
                      setLogoUrlInput("");
                      toast.success("Logo updated");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed");
                    } finally {
                      setLogoUploading(false);
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
        {/* App Banner */}
        {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Navigation Banner</CardTitle>
            <CardDescription>
              Upload a banner image to replace the logo + text lockup in the sidebar and public profile nav. Recommended: SVG or wide PNG/WebP, max 512 KB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {bannerPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerPreview} alt="Banner preview" className="h-10 max-w-[180px] rounded-lg object-contain border border-border bg-muted px-2" />
              ) : (
                <div className="h-10 w-44 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-xs">No banner set</div>
              )}
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors text-sm font-medium">
                    {bannerPreview ? "Change Banner" : "Upload Banner"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={bannerUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 512 * 1024) { toast.error("File too large (max 512 KB)"); return; }
                      setBannerUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append("banner", file);
                        const res = await fetch("/api/admin/banner", { method: "POST", body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);
                        setBannerPreview(data.url);
                        toast.success("Banner updated");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Upload failed");
                      } finally {
                        setBannerUploading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                {bannerPreview && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    disabled={bannerUploading}
                    onClick={async () => {
                      setBannerUploading(true);
                      try {
                        await fetch("/api/admin/banner", { method: "DELETE" });
                        setBannerPreview(null);
                        toast.success("Banner removed");
                      } finally { setBannerUploading(false); }
                    }}
                  >
                    Remove banner
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ServerIcon className="h-4 w-4" /> About
            </CardTitle>
            <CardDescription>Runtime information for the currently running instance.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="space-y-0.5">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Release Version</dt>
                <dd className="font-mono">{systemInfo ? `v${systemInfo.version}` : `v${process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown"}`}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Node.js</dt>
                <dd className="font-mono">{systemInfo?.nodeVersion ?? "—"}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" /> Last Restart
                </dt>
                <dd>
                  {systemInfo
                    ? new Date(systemInfo.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                    : "—"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CpuIcon className="h-3 w-3" /> Uptime
                </dt>
                <dd>
                  {systemInfo
                    ? (() => {
                        const s = systemInfo.uptimeSeconds;
                        const d = Math.floor(s / 86400);
                        const h = Math.floor((s % 86400) / 3600);
                        const m = Math.floor((s % 3600) / 60);
                        return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(" ");
                      })()
                    : "—"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Database Size</dt>
                <dd>
                  {systemInfo?.dbSizeBytes != null
                    ? systemInfo.dbSizeBytes < 1024 * 1024
                      ? `${(systemInfo.dbSizeBytes / 1024).toFixed(1)} KB`
                      : `${(systemInfo.dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                    : "—"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform</dt>
                <dd className="font-mono">{systemInfo?.platform ?? "—"}</dd>
              </div>
            </dl>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>
                  Keep last{" "}
                  <span className="text-muted-foreground font-normal text-xs">(oldest pruned)</span>
                </Label>
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

        </div>
      )}
      </div>{/* end p-6 wrapper */}

      <div className="fixed bottom-0 left-0 md:left-60 right-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={`${settingsLayoutWrapperClass(settingsLayout)} px-6 py-3 flex items-center gap-3`}>
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
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function SignOutAllCard() {
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignOutAll() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sign-out-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Signed out ${data.count ?? 0} user${data.count !== 1 ? "s" : ""}.`);
      setMessage("");
      setConfirming(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign out users.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldIcon className="h-4 w-4 text-destructive" /> Session Management
        </CardTitle>
        <CardDescription>
          Force all other users to sign out immediately. Optionally show them a message on the login page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Sign-out message (optional)</Label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Maintenance in progress, please sign back in shortly."
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="type-label-small text-muted-foreground">
            Leave blank to silently sign out all users without displaying a message.
          </p>
        </div>
        {!confirming ? (
          <Button
            variant="destructive"
            onClick={() => setConfirming(true)}
            className="gap-2"
          >
            <ShieldIcon className="h-4 w-4" />
            Sign Out All Users
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={handleSignOutAll}
              disabled={loading}
              className="gap-2"
            >
              {loading ? "Signing out…" : "Confirm — Sign Out Everyone"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
