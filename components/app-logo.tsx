"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { px: 20, cls: "h-5 w-5" },
  md: { px: 24, cls: "h-6 w-6" },
  lg: { px: 40, cls: "h-10 w-10" },
};

export function AppLogo({ size = "md", className }: AppLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/logo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.url) setLogoUrl(d.url); })
      .catch(() => {});
  }, []);

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
    <TrendingUpIcon className={cn(`${cls} text-primary`, className)} aria-hidden />
  );
}
