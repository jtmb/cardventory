import * as cheerio from "cheerio";
import type { Scraper, CardQuery, PriceResult } from "./types";

function buildQuery(card: CardQuery): string {
  const parts = [card.name];
  if (card.year) parts.push(String(card.year));
  if (card.setName) parts.push(card.setName);
  if (card.cardNumber) parts.push(`#${card.cardNumber}`);
  if (card.variant) parts.push(card.variant);
  if (card.gradeCompany && card.gradeValue) {
    parts.push(`${card.gradeCompany} ${card.gradeValue}`);
  }
  return parts.join(" ");
}

export const ebayScraper: Scraper = {
  source: "ebay",

  async fetchPrice(card: CardQuery): Promise<PriceResult> {
    const query = buildQuery(card);
    const encodedQuery = encodeURIComponent(query);
    // Search sold/completed listings on eBay
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Sold=1&LH_Complete=1&_sop=13`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { source: "ebay", price: null, url: searchUrl, imageUrl: null };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // eBay sold listings price selector
      const priceEl = $(".s-item__price").first();
      const priceText = priceEl.text().replace(/[^0-9.]/g, "");
      const price = priceText ? parseFloat(priceText) : null;

      const imageUrl =
        $(".s-item__image-img").first().attr("src") ??
        $(".s-item__image-img").first().attr("data-src") ??
        null;

      return {
        source: "ebay",
        price: price && !isNaN(price) ? price : null,
        url: searchUrl,
        imageUrl: imageUrl ?? null,
      };
    } catch {
      return { source: "ebay", price: null, url: searchUrl, imageUrl: null };
    }
  },
};
