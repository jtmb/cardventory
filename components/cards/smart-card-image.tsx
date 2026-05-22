"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

// If object-contain would leave more than this fraction as dead space,
// switch to object-cover (crop) instead.
const LETTERBOX_THRESHOLD = 0.25;

export function SmartCardImage({
  src,
  alt,
  unoptimized,
}: {
  src: string;
  alt: string;
  unoptimized?: boolean;
}) {
  const [cls, setCls] = useState("object-cover object-center");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    if (!container || !img.naturalWidth || !img.naturalHeight) return;

    const imageRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = container.clientWidth / container.clientHeight;

    // Dead-space fraction that object-contain would leave on the short axis
    const letterboxFraction =
      1 - Math.min(imageRatio, containerRatio) / Math.max(imageRatio, containerRatio);

    if (letterboxFraction <= LETTERBOX_THRESHOLD) {
      // Small mismatch — contain, minimal dead space
      setCls("object-contain");
    } else if (imageRatio > containerRatio) {
      // Image wider than container → crop left/right, anchor top (PSA label visible)
      setCls("object-cover object-top");
    } else {
      // Image taller than container → crop top/bottom equally
      setCls("object-cover object-center");
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-3xl overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        className={cls}
        onLoad={handleLoad}
        unoptimized={unoptimized}
      />
    </div>
  );
}
