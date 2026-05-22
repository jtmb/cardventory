import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "../data/cardventory.db"));

const cards = db.prepare("SELECT id, name FROM cards").all();

// 30-day price series per player name (realistic trends: some rising, some falling)
const basePrices = {
  "LeBron James":   [420,435,428,445,460,455,470,480,475,490,505,498,510,522,518,535,528,542,538,550,545,562,558,570,575,568,580,590,585,600],
  "Patrick Mahomes":[380,375,390,385,395,400,392,408,415,410,420,418,425,430,422,435,428,440,438,445,442,450,448,458,455,462,460,468,465,472],
  "Mike Trout":     [310,305,315,320,312,308,300,295,302,298,290,285,292,288,280,275,282,278,270,265,272,268,260,255,262,258,250,248,255,252],
  "Luka Dončić":    [200,205,210,208,215,220,218,225,222,230,228,235,232,240,238,245,242,250,248,255,252,260,258,265,270,268,275,272,280,285],
  "Connor McDavid": [150,148,155,152,158,160,162,158,165,168,165,172,170,175,172,178,180,176,182,185,182,188,190,186,192,195,192,198,200,205],
  "Shohei Ohtani":  [180,185,182,188,190,195,192,198,202,205,208,205,210,215,212,218,220,225,222,228,230,235,232,238,240,245,242,248,250,255],
  "Bulbasaur":      [85,82,88,90,87,84,80,78,75,72,70,68,65,62,60,58,55,53,50,48,52,55,58,60,57,54,50,48,45,43],
  "Roman Anthony":  [40,42,45,48,46,50,55,58,62,65,68,72,75,78,80,85,88,92,95,98,102,105,108,112,115,118,122,125,128,132],
  "Kobe Bryant":        [520,535,528,545,558,552,568,575,580,572,588,595,600,610,605,618,625,620,632,640,635,648,655,650,662,670,665,678,685,690],
  "Tom Brady":          [290,285,295,300,292,288,295,302,298,305,310,305,312,318,315,322,328,322,330,325,332,338,335,342,348,345,352,358,355,362],
  "Fernando Tatis Jr":  [95,92,98,102,99,96,90,88,85,82,88,92,96,100,97,94,90,87,83,80,85,88,92,96,93,90,86,82,78,75],
  "Caitlin Clark":      [65,68,72,75,78,82,85,88,92,95,98,102,105,108,112,115,118,122,125,128,132,135,138,142,145,148,152,155,158,162],
};

const now = Date.now();
const sources = ["ebay", "sportscardinvestor"];

const insert = db.prepare(
  "INSERT OR IGNORE INTO price_history (id, card_id, source, price, currency, fetched_at) VALUES (?, ?, ?, ?, ?, ?)"
);

const insertMany = db.transaction(() => {
  let count = 0;
  for (const card of cards) {
    const prices = basePrices[card.name];
    if (!prices) continue;
    for (let i = 0; i < 30; i++) {
      const daysAgo = 29 - i;
      const ts = Math.floor((now - daysAgo * 24 * 60 * 60 * 1000) / 1000);
      const source = sources[i % sources.length];
      const jitter = (Math.random() * 6 - 3);
      const price = Math.round((prices[i] + jitter) * 100) / 100;
      insert.run(randomUUID(), card.id, source, price, "USD", ts);
      count++;
    }
  }
  return count;
});

const inserted = insertMany();
console.log(`Inserted ${inserted} price history rows for:`, cards.map(c => c.name).join(", "));
db.close();
