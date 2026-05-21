import * as cheerio from "cheerio";
import type { Scraper, CardQuery, PriceResult } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Convert a string to a URL-safe slug (handles accents, special chars) */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the most likely SCI card URL from a CardQuery.
 * Pattern: /cards/{name}-{sport}/{year}-{set}-{variant}-{number}
 */
function buildCardUrl(card: CardQuery): string {
  const sport = slugify(card.sportGenre ?? "");
  const playerSlug = sport ? `${slugify(card.name)}-${sport}` : slugify(card.name);
  const setSlug = slugify(card.setName ?? "");
  const year = card.year ?? "";
  const variantSlug = card.variant ? `-${slugify(card.variant)}` : "";
  const numSlug = card.cardNumber ? `-${card.cardNumber}` : "";
  return `https://www.sportscardinvestor.com/cards/${playerSlug}/${year}-${setSlug}${variantSlug}${numSlug}`;
}

export const sportsCardInvestorScraper: Scraper = {
  source: "sportscardinvestor",

  async fetchPrice(card: CardQuery): Promise<PriceResult> {
    const url = buildCardUrl(card);
    const noData = (): PriceResult => ({
      source: "sportscardinvestor",
      price: null,
      url,
      imageUrl: null,
    });

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) return noData();

      const html = await res.text();
      const $ = cheerio.load(html);

      // Parse JSON-LD for structured product data
      let price: number | null = null;
      let imageUrl: string | null = null;

      try {
        const jsonLd = JSON.parse(
          $('script[type="application/ld+json"]').first().html() ?? "{}"
        ) as { "@graph"?: Array<Record<string, unknown>> };

        const product = jsonLd["@graph"]?.find((n) => n["@type"] === "Product");
        if (product) {
          const imgObj = product.image as { contentUrl?: string } | undefined;
          imageUrl = imgObj?.contentUrl ?? null;

          const offers = (product.offers ?? []) as Array<{ price?: unknown }>;
          const offerPrices = offers
            .map((o) => o.price)
            .filter((p): p is number => typeof p === "number")
            .sort((a, b) => a - b);

          if (offerPrices.length) {
            const mid = Math.floor(offerPrices.length / 2);
            price =
              offerPrices.length % 2
                ? offerPrices[mid]
                : (offerPrices[mid - 1] + offerPrices[mid]) / 2;
          }
        }
      } catch {
        // ignore JSON-LD parse errors
      }

      // Prefer "Last Sale" price from HTML — it's the most recent actual sold
      // price and is more accurate than active listing prices from JSON-LD offers
      $("[class*='flex'][class*='flex-col']").each((_, el) => {
        const text = $(el).text().trim();
        if (text.startsWith("Last Sale")) {
          const match = text.match(/\$(\d[\d,]*(?:\.\d{1,2})?)/);
          if (match) {
            const parsed = parseFloat(match[1].replace(/,/g, ""));
            if (!isNaN(parsed)) price = parsed;
          }
        }
      });

      return { source: "sportscardinvestor", price, url, imageUrl };
    } catch {
      return noData();
    }
  },
};

