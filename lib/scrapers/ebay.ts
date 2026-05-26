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

/**
 * eBay scraper using the eBay Finding API.
 *
 * The eBay HTML search endpoint is blocked by Akamai on datacenter IPs, but the
 * Finding API (svcs.ebay.com) is not subject to that block.
 *
 * Requires the EBAY_APP_ID environment variable (free eBay developer App ID).
 * If EBAY_APP_ID is not set, the scraper returns null gracefully.
 *
 * Get a free App ID at: https://developer.ebay.com/
 */
export const ebayScraper: Scraper = {
  source: "ebay",

  async fetchPrice(card: CardQuery): Promise<PriceResult> {
    const query = buildQuery(card);
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Sold=1&LH_Complete=1&_sop=13`;

    const appId = process.env.EBAY_APP_ID;
    if (!appId) {
      return { source: "ebay", price: null, url: searchUrl, imageUrl: null };
    }

    const apiUrl =
      `https://svcs.ebay.com/services/search/FindingService/v1` +
      `?OPERATION-NAME=findCompletedItems` +
      `&SERVICE-VERSION=1.0.0` +
      `&SECURITY-APPNAME=${encodeURIComponent(appId)}` +
      `&RESPONSE-DATA-FORMAT=JSON` +
      `&keywords=${encodedQuery}` +
      `&itemFilter(0).name=SoldItemsOnly` +
      `&itemFilter(0).value=true` +
      `&sortOrder=EndTimeSoonest` +
      `&paginationInput.entriesPerPage=10`;

    try {
      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { source: "ebay", price: null, url: searchUrl, imageUrl: null };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();
      const items =
        data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item;

      if (!Array.isArray(items) || items.length === 0) {
        return { source: "ebay", price: null, url: searchUrl, imageUrl: null };
      }

      const prices: number[] = items
        .map((item) => {
          const val =
            item?.sellingStatus?.[0]?.currentPrice?.[0]?.["__value__"];
          return parseFloat(val ?? "");
        })
        .filter((p) => !isNaN(p) && p > 0)
        .sort((a, b) => a - b);

      if (prices.length === 0) {
        return { source: "ebay", price: null, url: searchUrl, imageUrl: null };
      }

      // Use median sold price
      const medianPrice = prices[Math.floor(prices.length / 2)];
      const imageUrl: string | null = items[0]?.galleryURL?.[0] ?? null;

      return {
        source: "ebay",
        price: medianPrice,
        url: searchUrl,
        imageUrl,
      };
    } catch {
      return { source: "ebay", price: null, url: searchUrl, imageUrl: null };
    }
  },
};
