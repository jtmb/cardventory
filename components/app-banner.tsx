"use client";

import { useState, useEffect } from "react";
import { AppLogo } from "@/components/app-logo";

interface AppBannerProps {
  logoSize?: "sm" | "md";
  textClassName?: string;
  textStyle?: React.CSSProperties;
}

export function AppBanner({ logoSize = "sm", textClassName, textStyle }: AppBannerProps) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/banner")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.url) setBannerUrl(d.url); })
      .catch(() => {});
  }, []);

  if (bannerUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={bannerUrl} alt="Cardventory" className="h-7 max-w-[160px] object-contain" />
    );
  }

  return (
    <>
      <AppLogo size={logoSize} />
      <span className={textClassName} style={textStyle}>Cardventory</span>
    </>
  );
}
