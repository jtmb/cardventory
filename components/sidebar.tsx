"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboardIcon,
  LayersIcon,
  PlusCircleIcon,
  SettingsIcon,
  LogOutIcon,
  TrendingUpIcon,
  PaletteIcon,
  DatabaseIcon,
  TagIcon,
  ServerIcon,
  ShieldIcon,
  BellIcon,
  MenuIcon,
  XIcon,
  BookmarkIcon,
  UsersIcon,
  BarChart3Icon,
  UserCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollFade } from "@/components/ui/scroll-fade";
import { AddCardDialog } from "@/components/cards/add-card-dialog";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/cards", label: "My Cards", icon: LayersIcon },
  { href: "/watchlist", label: "Watchlist", icon: BookmarkIcon },
  { href: "/cards/add", label: "Add Card", icon: PlusCircleIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const settingsSubItems = [
  { key: "general",        label: "General",        icon: TagIcon      },
  { key: "appearance",    label: "Appearance",    icon: PaletteIcon  },
  { key: "data",          label: "Data",          icon: DatabaseIcon },
  { key: "notifications", label: "Notifications", icon: BellIcon     },
  { key: "account",       label: "Account",       icon: UserCircleIcon },
];

const adminSubItems = [
  { key: "user-management", label: "User Management", icon: UsersIcon  },
  { key: "authentication",  label: "Authentication",  icon: ShieldIcon },
  { key: "system",          label: "System",          icon: ServerIcon },
];

/** Nav links + sign-out — rendered in both desktop sidebar and mobile drawer. */
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const onSettings = pathname.startsWith("/settings") || pathname.startsWith("/admin");
  const searchParams = useSearchParams();
  const activeSubSection = onSettings ? (searchParams.get("s") ?? "general") : null;
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [pendingCount, setPendingCount] = useState(0);
  const [addCardOpen, setAddCardOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/pending-count")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setPendingCount(data.count); })
      .catch(() => {});
  }, [isAdmin]);

  return (
    <>
      <ScrollFade className="flex-1 px-3 py-4 space-y-1" fromColor="from-sidebar">
        <nav>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard" ? pathname === "/dashboard" || pathname === "/" :
            href === "/cards"     ? pathname === "/cards" || (pathname.startsWith("/cards/") && !pathname.startsWith("/cards/add")) :
            href === "/cards/add" ? pathname === "/cards/add" :
            href === "/settings" ? pathname.startsWith("/settings") || pathname.startsWith("/admin") :
            pathname.startsWith(href);
          const tourId = href === "/cards/add" ? "tour-add-card" : href === "/settings" ? "tour-settings" : undefined;
          return (
            <div key={href}>
              {href === "/cards/add" ? (
                <button
                  type="button"
                  data-tour-id={tourId}
                  onClick={() => { setAddCardOpen(true); onNavigate?.(); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ) : (
              <Link
                href={href}
                onClick={onNavigate}
                data-tour-id={tourId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
              )}

              {href === "/settings" && (onSettings || !!onNavigate) && (
                <div className="mt-0.5 ml-3 pl-4 border-l border-sidebar-border space-y-0.5">
                  {settingsSubItems.map(({ key, label: subLabel, icon: SubIcon }) => (
                    <Link
                      key={key}
                      href={`/settings?s=${key}`}
                      onClick={onNavigate}
                      data-tour-id={key === "data" ? "tour-settings-data" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        activeSubSection === key
                          ? "text-primary bg-primary/10"
                          : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <SubIcon className="h-3.5 w-3.5 shrink-0" />
                      {subLabel}
                    </Link>
                  ))}
                  {isAdmin && (
                    <>
                      <div className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">Admin</div>
                      <Link
                        href="/admin/analytics"
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                          pathname === "/admin/analytics"
                            ? "text-primary bg-primary/10"
                            : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <BarChart3Icon className="h-3.5 w-3.5 shrink-0" />
                        Analytics
                      </Link>
                      {adminSubItems.map(({ key, label: subLabel, icon: SubIcon }) => (
                        <Link
                          key={key}
                          href={`/settings?s=${key}`}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                            activeSubSection === key
                              ? "text-primary bg-primary/10"
                              : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}
                        >
                          <SubIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1">{subLabel}</span>
                          {pendingCount > 0 && key === "user-management" && (
                            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold leading-none">
                              {pendingCount}
                            </span>
                          )}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}


        </nav>
      </ScrollFade>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent text-sm"
          onClick={() => { onNavigate?.(); signOut({ callbackUrl: "/login" }); }}
        >
          <LogOutIcon className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
      <AddCardDialog open={addCardOpen} onOpenChange={setAddCardOpen} />
    </>
  );
}

function AppLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/logo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.url) setLogoUrl(d.url); })
      .catch(() => {});
  }, []);
  const cls = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return logoUrl ? (
    <Image src={logoUrl} alt="App logo" width={size === "sm" ? 20 : 24} height={size === "sm" ? 20 : 24} className={`${cls} object-contain rounded`} unoptimized />
  ) : (
    <TrendingUpIcon className={`${cls} text-primary`} />
  );
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar (md and up) ──────────────────────────────────── */}
          <aside className="hidden md:flex w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex-col sticky top-0 h-dvh overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <AppLogo size="md" />
          <span className="font-bold text-lg text-sidebar-foreground tracking-tight">Cardventory</span>
        </div>
        <NavContent />
      </aside>

      {/* ── Mobile top bar (below md) ─────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <AppLogo size="sm" />
        <span className="font-bold text-base text-sidebar-foreground tracking-tight">Cardventory</span>
      </div>

      {/* ── Mobile backdrop ───────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ease-in-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <AppLogo size="sm" />
            <span className="font-bold text-base text-sidebar-foreground tracking-tight">Cardventory</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="p-1 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <NavContent onNavigate={() => setDrawerOpen(false)} />
      </div>
    </>
  );
}
