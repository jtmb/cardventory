import geoip from "geoip-lite";

type GeoResult = { country: string; region: string; city: string } | null;

// Private IP ranges — never look these up
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isPrivate(ip: string): boolean {
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

// Simple LRU cache — evict oldest when at capacity
const CACHE_MAX = 500;
const cache = new Map<string, GeoResult>();

function cacheGet(ip: string): GeoResult | undefined {
  if (!cache.has(ip)) return undefined;
  const val = cache.get(ip)!;
  // Move to front by re-inserting
  cache.delete(ip);
  cache.set(ip, val);
  return val;
}

function cacheSet(ip: string, val: GeoResult) {
  if (cache.size >= CACHE_MAX) {
    cache.delete(cache.keys().next().value!);
  }
  cache.set(ip, val);
}

export function lookupGeo(ip: string): GeoResult {
  if (!ip || isPrivate(ip)) return null;

  const cached = cacheGet(ip);
  if (cached !== undefined) return cached;

  const result = geoip.lookup(ip);
  const geo: GeoResult = result
    ? { country: result.country ?? "", region: result.region ?? "", city: result.city ?? "" }
    : null;

  cacheSet(ip, geo);
  return geo;
}
