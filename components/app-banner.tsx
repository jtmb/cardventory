"use client";

import { useState, useEffect } from "react";

const SIZE_CLASS: Record<string, string> = {
  sm: "h-7 max-w-[160px]",
  md: "h-10 max-w-[220px]",
  lg: "h-14 max-w-[280px]",
  "2xl": "h-18 max-w-[320px]",
  xl: "h-20 max-w-[360px]",
};

const SIZE_ORDER = ["sm", "md", "lg", "2xl", "xl"];
function capSize(size: string, max?: string): string {
  if (!max) return size;
  const si = SIZE_ORDER.indexOf(size);
  const mi = SIZE_ORDER.indexOf(max);
  if (si === -1 || mi === -1) return size;
  return SIZE_ORDER[Math.min(si, mi)];
}

const DEFAULT_BANNER_SRC = "/branding/cardventory-rookie-mark-banner-dark.svg";
const DEFAULT_SIZE = "xl";
const DEFAULT_OFFSET = { x: -15, y: 0 };

type BannerOffset = { x: number; y: number };

interface AppBannerProps {
  logoSize?: "sm" | "md";
  textClassName?: string;
  textStyle?: React.CSSProperties;
  maxSize?: "sm" | "md" | "lg" | "xl";
}

export function AppBanner({ logoSize: _logoSize = "sm", textClassName: _textClassName, textStyle: _textStyle, maxSize }: AppBannerProps) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerSize, setBannerSize] = useState("sm");
  const [bannerOffset, setBannerOffset] = useState<BannerOffset>(DEFAULT_OFFSET);

  useEffect(() => {
    fetch("/api/admin/banner")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setBannerUrl(d?.url ?? null);
        setBannerSize(d?.size ?? "sm");
        setBannerOffset(d?.offset ?? DEFAULT_OFFSET);
      })
      .catch(() => {});

    function onBannerChanged(e: Event) {
      const { url, size, offset } = (e as CustomEvent<{ url: string | null; size: string; offset?: BannerOffset }>).detail;
      setBannerUrl(url);
      setBannerSize(size ?? "sm");
      if (offset) setBannerOffset(offset);
    }
    window.addEventListener("banner-changed", onBannerChanged);
    return () => window.removeEventListener("banner-changed", onBannerChanged);
  }, []);

  if (bannerUrl) {
    const effectiveSize = capSize(bannerSize, maxSize);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bannerUrl}
        alt="Cardventory"
        className={`${SIZE_CLASS[effectiveSize] ?? SIZE_CLASS.sm} object-contain`}
        style={{ transform: `translate(${bannerOffset.x}px, ${bannerOffset.y}px)` }}
      />
    );
  }

  // Default branding banner
  const effectiveDefaultSize = capSize(DEFAULT_SIZE, maxSize);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={DEFAULT_BANNER_SRC}
      alt="Cardventory"
      className={`${SIZE_CLASS[effectiveDefaultSize]} object-contain`}
      style={{ transform: `translate(${DEFAULT_OFFSET.x}px, ${DEFAULT_OFFSET.y}px)` }}
    />
  );
}
