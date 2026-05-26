import * as cheerio from "cheerio";
import type { Scraper, CardQuery, PriceResult } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Choose the right PriceCharting price element ID based on the card's grade.
 * PriceCharting DOM uses the same IDs as SportscardsPro:
 *   #used_price        — Ungraded / Loose (no grade)
 *   #new_price         — Grade 8 / 8.5
 *   #graded_price      — Grade 9 / 9.5
 *   #manual_only_price — PSA 10 / SGC 10 / CGC 10
 *   #bgs_10_price      — BGS 10
 */
function priceSelector(card: CardQuery): string {
  const grade = card.gradeValue ?? "";
  const company = (card.gradeCompany ?? "").toUpperCase();

  if (!grade) return "#used_price";
  const gNum = parseFloat(grade);
  if (gNum === 10) {
    if (company === "BGS") return "#bgs_10_price";
    return "#manual_only_price";
  }
  if (gNum >= 9) return "#graded_price";
  if (gNum >= 8) return "#new_price";
  return "#used_price";
}

function buildQuery(card: CardQuery): string {
  const parts = [card.name];
  if (card.year) parts.push(String(card.year));
  if (card.setName) parts.push(card.setName);
  if (card.cardNumber) parts.push(card.cardNumber);
  return parts.join(" ");
}

export const priceChartingScraper: Scraper = {
  source: "pricecharting",

  async fetchPrice(card: CardQuery): Promise<PriceResult> {
    const query = buildQuery(card);
    const searchUrl = `https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=prices`;
    const noData = (): PriceResult => ({
      source: "pricecharting",
      price: null,
      url: searchUrl,
      imageUrl: null,
    });

    // PriceCharting covers TCG/CCG (Pokémon, Magic, etc.) and Funko Pops.
    // It does NOT have sports trading cards (Topps, Panini, etc.) — skip them.
    const SPORTS_GENRES = new Set([
      "basketball",
      "football",
      "baseball",
      "hockey",
      "soccer",
      "tennis",
      "golf",
      "boxing",
      "mma",
      "wrestling",
    ]);
    if (SPORTS_GENRES.has((card.sportGenre ?? "").toLowerCase())) return noData();

    try {
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
        redirect: "follow",
      });

      if (!res.ok) return noData();

      const html = await res.text();
      const $ = cheerio.load(html);

      let price: number | null = null;
      let imageUrl: string | null = null;
      let finalUrl = res.url ?? searchUrl;

      if ($("#used_price").length > 0) {
        // Redirected to a product page — use grade-specific selector
        const selector = priceSelector(card);
        const priceText = $(`${selector} .price`).first().text().trim();
        price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) : null;
        imageUrl =
          $("#product-image img").first().attr("src") ??
          $("img[src*='googleapis']").first().attr("src") ??
          null;
      } else {
        // Still on search results list — pick the best matching row
        const rows: ReturnType<typeof $>[] = [];
        $("tr[id^='product-']")
          .slice(0, 10)
          .each((_, el) => { rows.push($(el)); });

        if (rows.length > 0) {
          const setWords = (card.setName ?? "")
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3);
          const yearStr = card.year ? String(card.year) : "";
          // Meaningful words from the card name (skip very short words)
          const nameWords = card.name
            .toLowerCase()
            .replace(/[''`]/g, "")
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length > 2);

          const junkPaths = [
            "funko-pop",
            "playstation",
            "nintendo-",
            "xbox",
            "gameboy",
            "atari",
            "sega-",
            "wii-",
            "switch-",
          ];

          const href = (row: ReturnType<typeof $>) =>
            (row.find("a").first().attr("href") ?? "").toLowerCase();

          const hasName = (row: ReturnType<typeof $>) =>
            nameWords.every((w) => href(row).includes(w));
          const hasYear = (row: ReturnType<typeof $>) =>
            yearStr ? href(row).includes(yearStr) : true;
          const hasSetWord = (row: ReturnType<typeof $>) =>
            setWords.length > 0 ? setWords.some((w) => href(row).includes(w)) : true;
          const isJunk = (row: ReturnType<typeof $>) =>
            junkPaths.some((j) => href(row).includes(j));

          const bestRow =
            // Priority 1: player name + year in URL
            rows.find((row) => hasName(row) && hasYear(row)) ??
            // Priority 2: player name + set word in URL
            rows.find((row) => hasName(row) && hasSetWord(row)) ??
            // Priority 3: player name anywhere in URL
            rows.find((row) => hasName(row)) ??
            // Priority 4: skip Funko/console junk
            rows.find((row) => !isJunk(row)) ??
            rows[0];

          const rowLink = bestRow.find("a").first().attr("href");
          // cib_price = "mid" price (most representative market value)
          const midPriceText = bestRow.find("td.cib_price").text().trim();
          price = midPriceText ? parseFloat(midPriceText.replace(/[^0-9.]/g, "")) : null;
          imageUrl = bestRow.find("img.photo").attr("src") ?? null;
          if (rowLink) finalUrl = rowLink;
        }
      }

      return {
        source: "pricecharting",
        price: price && !isNaN(price) ? price : null,
        url: finalUrl,
        imageUrl: imageUrl ?? null,
      };
    } catch {
      return noData();
    }
  },
};
