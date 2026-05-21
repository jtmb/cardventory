import * as cheerio from "cheerio";
import type { Scraper, CardQuery, PriceResult } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Convert a string to a URL-safe slug */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the most likely SportsCardsPro card URL from a CardQuery.
 * Pattern: /game/{sport}-cards-{year}-{set}/{player}-{cardNumber}
 */
function buildCardUrl(card: CardQuery): string {
  const sport = slugify(card.sportGenre ?? "");
  const year = card.year ?? "";
  const setSlug = slugify(card.setName ?? "");
  const playerSlug = slugify(card.name);
  const numSlug = card.cardNumber ? `-${card.cardNumber}` : "";
  return `https://www.sportscardspro.com/game/${sport}-cards-${year}-${setSlug}/${playerSlug}${numSlug}`;
}

/**
 * Choose the right price element ID based on the card's grade.
 * PriceCharting/SCP DOM uses these IDs for price cells:
 *   #used_price        — Ungraded / Loose (no grade)
 *   #new_price         — Grade 8 / 8.5
 *   #graded_price      — Grade 9 / 9.5
 *   #manual_only_price — PSA 10
 *   #bgs_10_price      — BGS 10
 */
function priceSelector(card: CardQuery): string {
  const grade = card.gradeValue ?? "";
  const company = (card.gradeCompany ?? "").toUpperCase();

  if (!grade) return "#used_price";
  const gNum = parseFloat(grade);
  if (gNum === 10) {
    if (company === "BGS") return "#bgs_10_price";
    return "#manual_only_price"; // PSA 10, SGC 10, CGC 10
  }
  if (gNum >= 9) return "#graded_price";
  if (gNum >= 8) return "#new_price";
  return "#used_price";
}

export const sportsCardsProScraper: Scraper = {
  source: "sportscardspro",

  async fetchPrice(card: CardQuery): Promise<PriceResult> {
    const url = buildCardUrl(card);
    const noData = (): PriceResult => ({
      source: "sportscardspro",
      price: null,
      url,
      imageUrl: null,
    });

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: AbortSignal.timeout(12000),
      });

      // SportsCardsPro is protected by Cloudflare on datacenter IPs.
      // Return the correct URL so the user can click through, but null price.
      if (!res.ok) return noData();

      const html = await res.text();
      const $ = cheerio.load(html);

      // Bail out if we got a Cloudflare challenge page
      if ($("title").text().toLowerCase().includes("just a moment")) return noData();

      // Extract price from the appropriate grade cell
      const selector = priceSelector(card);
      const priceText = $(selector).first().text().replace(/[^0-9.]/g, "").trim();
      const price = priceText ? parseFloat(priceText) : null;

      // Card image uses a standard class in PriceCharting/SCP pages
      const imageUrl =
        $("img.product-image, img[class*='card-image']").first().attr("src") ??
        $("img[src*='storage.googleapis.com']").first().attr("src") ??
        null;

      return {
        source: "sportscardspro",
        price: price && !isNaN(price) ? price : null,
        url,
        imageUrl: imageUrl ?? null,
      };
    } catch {
      return noData();
    }
  },
};

