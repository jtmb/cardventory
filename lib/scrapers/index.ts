import { ebayScraper } from "./ebay";
import { sportsCardInvestorScraper } from "./sportscardinvestor";
import { sportsCardsProScraper } from "./sportscardspro";
import type { CardQuery, PriceResult } from "./types";

export const scrapers = [
  ebayScraper,
  sportsCardInvestorScraper,
  sportsCardsProScraper,
];

export async function fetchAllPrices(card: CardQuery): Promise<PriceResult[]> {
  const results = await Promise.allSettled(
    scrapers.map((scraper) => scraper.fetchPrice(card))
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    return {
      source: scrapers[i].source,
      price: null,
      url: null,
      imageUrl: null,
    };
  });
}

export function getHighestPrice(results: PriceResult[]): number | null {
  const prices = results.map((r) => r.price).filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.max(...prices) : null;
}

export type { CardQuery, PriceResult };
