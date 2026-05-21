import * as cheerio from "cheerio";
import type { Scraper, CardQuery, PriceResult } from "./types";

function buildQuery(card: CardQuery): string {
  const parts = [card.name];
  if (card.year) parts.push(String(card.year));
  if (card.setName) parts.push(card.setName);
  if (card.cardNumber) parts.push(card.cardNumber);
  return parts.join(" ");
}

export const cardLadderScraper: Scraper = {
  source: "cardladder",

  async fetchPrice(card: CardQuery): Promise<PriceResult> {
    const query = buildQuery(card);
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.cardladder.com/search?q=${encodedQuery}`;

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
        return {
          source: "cardladder",
          price: null,
          url: searchUrl,
          imageUrl: null,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const priceEl = $('[class*="price"], [class*="value"]').first();
      const priceText = priceEl.text().replace(/[^0-9.]/g, "");
      const price = priceText ? parseFloat(priceText) : null;

      const cardLink = $("a").filter((_, el) => {
        const href = $(el).attr("href") ?? "";
        return href.includes("/cards/") || href.includes("/card/");
      }).first();
      const cardUrl = cardLink.attr("href")
        ? `https://www.cardladder.com${cardLink.attr("href")}`
        : searchUrl;

      const imageUrl =
        $("img").first().attr("src") ?? $("img").first().attr("data-src") ?? null;

      return {
        source: "cardladder",
        price: price && !isNaN(price) ? price : null,
        url: cardUrl,
        imageUrl: imageUrl ?? null,
      };
    } catch {
      return {
        source: "cardladder",
        price: null,
        url: searchUrl,
        imageUrl: null,
      };
    }
  },
};
