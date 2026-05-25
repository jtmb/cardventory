"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

const LETTERBOX_THRESHOLD = 0.25;

/**
 * Samples image edges to detect background/border padding around the card subject.
 * Returns the scale factor to zoom past the border (≥ 1.0).
 * Returns null when canvas access fails (cross-origin security error).
 */
function detectBorderZoom(img: HTMLImageElement): number | null {
  const W = 64, H = 64;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H); // throws SecurityError for cross-origin

    const px = (x: number, y: number): [number, number, number] => {
      const i = (Math.round(y) * W + Math.round(x)) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const diff = (a: [number, number, number], b: [number, number, number]) =>
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

    // Average all 4 corners (2×2 px each) to establish background colour
    const cornerSamples: [number, number, number][] = [
      px(0, 0), px(1, 0), px(0, 1), px(1, 1),
      px(W - 2, 0), px(W - 1, 0), px(W - 2, 1), px(W - 1, 1),
      px(0, H - 2), px(1, H - 2), px(0, H - 1), px(1, H - 1),
      px(W - 2, H - 2), px(W - 1, H - 2), px(W - 2, H - 1), px(W - 1, H - 1),
    ];
    const bg = cornerSamples
      .reduce<[number, number, number]>((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0])
      .map(v => v / cornerSamples.length) as [number, number, number];

    // Walk inward from each edge at the midpoint; stop when pixel differs from background
    const THRESH = 35;
    const midY = H / 2, midX = W / 2;
    let lBorder = 0, rBorder = 0, tBorder = 0, bBorder = 0;
    for (let x = 0; x < W / 2; x++) {
      if (diff(px(x, midY), bg) > THRESH) { lBorder = x; break; }
    }
    for (let x = W - 1; x > W / 2; x--) {
      if (diff(px(x, midY), bg) > THRESH) { rBorder = W - 1 - x; break; }
    }
    for (let y = 0; y < H / 2; y++) {
      if (diff(px(midX, y), bg) > THRESH) { tBorder = y; break; }
    }
    for (let y = H - 1; y > H / 2; y--) {
      if (diff(px(midX, y), bg) > THRESH) { bBorder = H - 1 - y; break; }
    }

    const borderFrac = Math.max((lBorder + rBorder) / W, (tBorder + bBorder) / H);
    if (borderFrac < 0.05) return 1;
    return Math.min(1 / (1 - borderFrac), 1.65);
  } catch {
    return null; // CORS blocked — caller decides fallback
  }
}

export function SmartCardImage({
  src,
  alt,
  unoptimized,
  fitMode = "smart",
  containerClassName,
  containerStyle,
  imageClassName,
  placeholder,
  children,
}: {
  src: string | null | undefined;
  alt: string;
  unoptimized?: boolean;
  /**
   * "smart"   = auto-detect cover vs contain based on aspect ratio (default)
   * "cover"   = always fill edges, may crop
   * "contain" = always show full image
   * "ambient" = blurred fill + canvas-detected border zoom on foreground
   */
  fitMode?: "smart" | "cover" | "contain" | "ambient";
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  imageClassName?: string;
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [cls, setCls] = useState(
    fitMode === "contain" ? "object-contain" : "object-cover object-center"
  );
  // Smart mode: hide until handleLoad resolves the final object-fit class to avoid a
  // visible cover→contain (or cover→cover-top) jump. cover/contain never switch so they
  // start as visible.
  const [smartLoaded, setSmartLoaded] = useState(fitMode !== "smart");
  // Ambient mode foreground state — start as cover so the blurred background stays hidden
  const [fgCls, setFgCls] = useState("object-cover object-center");
  const [fgScale, setFgScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;

    if (fitMode === "ambient") {
      const zoom = detectBorderZoom(img);
      if (zoom === null) {
        // Cross-origin image — canvas blocked; fall back to cover so it fills naturally
        setFgCls("object-cover object-center");
      } else if (zoom > 1.01) {
        // Border/background detected — apply zoom via wrapper div
        setFgScale(zoom);
      }
      // zoom ≈ 1.0: tight crop, object-contain is already correct
      return;
    }

    if (fitMode !== "smart") return;
    const container = containerRef.current;
    if (!container || !img.naturalWidth || !img.naturalHeight) return;

    const imageRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = container.clientWidth / container.clientHeight;
    const letterboxFraction =
      1 - Math.min(imageRatio, containerRatio) / Math.max(imageRatio, containerRatio);

    if (letterboxFraction <= LETTERBOX_THRESHOLD) {
      setCls("object-contain");
    } else if (imageRatio > containerRatio) {
      setCls("object-cover object-top");
    } else {
      setCls("object-cover object-center");
    }
    setSmartLoaded(true);
  }, [fitMode]);

  return (
    <div ref={containerRef} className={containerClassName ?? "relative w-full h-full rounded-3xl overflow-hidden"} style={containerStyle}>
      {src ? (
        fitMode === "ambient" ? (
          <>
            {/* Blurred copy fills dead-space behind the card */}
            <Image
              src={src}
              alt=""
              fill
              className="object-cover scale-125 blur-xl brightness-50 saturate-150"
              unoptimized={unoptimized}
              aria-hidden
            />
            {/*
              Wrapper div applies the canvas-detected zoom via transform.
              Using a wrapper (not Image style prop) ensures the scale is
              applied after Next.js Image sets its own fill styles.
            */}
            <div
              className="absolute inset-0"
              style={fgScale > 1 ? { transform: `scale(${fgScale.toFixed(3)})`, transition: "transform 0.3s ease" } : undefined}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className={imageClassName ? `${fgCls} ${imageClassName}` : fgCls}
                onLoad={handleLoad}
                unoptimized={unoptimized}
              />
            </div>
          </>
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            className={imageClassName ? `${cls} ${imageClassName}` : cls}
            onLoad={handleLoad}
            unoptimized={unoptimized}
            style={smartLoaded ? undefined : { opacity: 0 }}
          />
        )
      ) : (
        (placeholder ?? null)
      )}
      {children}
    </div>
  );
}

