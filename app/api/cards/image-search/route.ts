import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function getDdgVqd(query: string): Promise<string> {
  const res = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`DDG home: ${res.status}`);
  const html = await res.text();
  const vqd = html.match(/vqd=["']?([\d-]+)["']?/)?.[1];
  if (!vqd) throw new Error("No vqd token in DDG response");
  return vqd;
}

async function searchDdgImages(query: string): Promise<string[]> {
  const vqd = await getDdgVqd(query);
  const apiUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&p=1&l=us-en&o=json`;
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": UA, "Accept": "application/json", "Referer": "https://duckduckgo.com/" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`DDG images: ${res.status}`);
  const data = (await res.json()) as { results?: Array<{ image: string; thumbnail: string }> };
  return (data.results ?? []).map((r) => r.image).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ images: [] });

  try {
    const all = await searchDdgImages(`${q} trading card`);
    // Prefer eBay CDN images (high quality, stable); filter out known bad patterns
    const images = all
      .filter((u) => !u.endsWith(".gif") && !u.includes("placeholder"))
      .slice(0, 9);
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
