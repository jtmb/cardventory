"use client";

import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/cards", label: "My Cards", icon: LayersIcon },
  { href: "/cards/add", label: "Add Card", icon: PlusCircleIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const settingsSubItems = [
  { key: "general",    label: "General",    icon: TagIcon },
  { key: "appearance", label: "Appearance", icon: PaletteIcon },
  { key: "data",       label: "Data",       icon: DatabaseIcon },
  { key: "system",     label: "System",     icon: ServerIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const onSettings = pathname.startsWith("/settings");
  const searchParams = useSearchParams();
  const activeSubSection = onSettings ? (searchParams.get("s") ?? "appearance") : null;
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <TrendingUpIcon className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg text-sidebar-foreground tracking-tight">Cardventory</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === "/dashboard" || pathname === "/" : pathname.startsWith(href);
          const tourId = href === "/cards/add" ? "tour-add-card" : href === "/settings" ? "tour-settings" : undefined;
          return (
            <div key={href}>
              <Link
                href={href}
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

              {/* Settings sub-items — shown when on any /settings route */}
              {href === "/settings" && onSettings && (
                <div className="mt-0.5 ml-3 pl-4 border-l border-sidebar-border space-y-0.5">
                  {settingsSubItems.map(({ key, label: subLabel, icon: SubIcon }) => (
                    <Link
                      key={key}
                      href={`/settings?s=${key}`}
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
                </div>
              )}
            </div>
          );
        })}

        {/* Admin link — visible to admins only */}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-primary/15 text-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <ShieldIcon className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent text-sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOutIcon className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
