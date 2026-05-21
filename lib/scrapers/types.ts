export interface PriceResult {
  source: "ebay" | "sportscardinvestor" | "cardladder" | "sportscardspro";
  price: number | null;
  url: string | null;
  imageUrl: string | null;
  label?: string; // e.g. "Near Mint", "PSA 10"
}

export interface CardQuery {
  name: string;
  setName?: string | null;
  year?: number | null;
  cardNumber?: string | null;
  variant?: string | null;
  gradeCompany?: string | null;
  gradeValue?: string | null;
  sportGenre?: string | null;
}

export interface Scraper {
  source: PriceResult["source"];
  fetchPrice(card: CardQuery): Promise<PriceResult>;
}
