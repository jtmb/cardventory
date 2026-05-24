"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "banner";
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  sm: { px: 20, cls: "h-5 w-5" },
  md: { px: 24, cls: "h-6 w-6" },
  lg: { px: 40, cls: "h-10 w-10" },
};

// Banner logo — fixed at 70h × 150w px
const BANNER_HEIGHT = 70;
const BANNER_WIDTH = 150;

export function AppLogo({ size = "md", variant = "icon", className, style }: AppLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/logo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.url) setLogoUrl(d.url); })
      .catch(() => {});
  }, []);

  if (variant === "banner") {
    return logoUrl ? (
      <Image
        src={logoUrl}
        alt="App logo"
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        className={cn("object-contain rounded", className)}
        style={{ height: 70, width: 150, ...style }}
        unoptimized
      />
    ) : (
      <Image
        src="/branding/cardventory-rookie-mark-banner-logo-dark.svg"
        alt="Cardventory"
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        className={cn("object-contain", className)}
        style={{ height: 70, width: 150, ...style }}
        unoptimized
      />
    );
  }

  const { px, cls } = SIZE_MAP[size];

  return logoUrl ? (
    <Image
      src={logoUrl}
      alt="App logo"
      width={px}
      height={px}
      className={cn(`${cls} object-contain rounded`, className)}
      unoptimized
    />
  ) : (
    <Image
      src="/branding/cardventory-rookie-mark-icon-dark.svg"
      alt="Cardventory"
      width={px}
      height={px}
      className={cn(`${cls} object-contain`, className)}
      unoptimized
    />
  );
}
