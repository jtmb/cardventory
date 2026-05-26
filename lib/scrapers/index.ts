import { ebayScraper } from "./ebay";
import { priceChartingScraper } from "./pricecharting";
import { sportsCardInvestorScraper } from "./sportscardinvestor";
import { sportsCardsProScraper } from "./sportscardspro";
import type { CardQuery, PriceResult } from "./types";

// eBay HTML scraping is blocked by Akamai on datacenter IPs, but the Finding API
// (svcs.ebay.com) is not subject to that block. Set EBAY_APP_ID to enable it;
// the scraper returns null gracefully when the env var is absent.
export const scrapers = [
  priceChartingScraper,
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
