import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createWorker, PSM } from "tesseract.js";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { securityMetrics } from "@/lib/security-metrics";

// Known card set names (used for set detection and filtering from player name)
const KNOWN_SETS = [
  // Sports card brands
  "Prizm", "Chrome", "Mosaic", "Select", "Donruss", "Topps", "Bowman",
  "Fleer", "Upper Deck", "Panini", "Finest", "Heritage", "Stadium Club",
  "Optic", "Certified", "Absolute", "Illusions", "Immaculate", "Contenders",
  "Obsidian", "National Treasures", "Noir", "Gold Standard", "Score",
  "Leaf", "Sage", "Hoops", "Crown Royale", "Revolution", "Spectra",
  // Yu-Gi-Oh set codes
  "LOB", "MRD", "MRL", "PSV", "LON", "LOD", "MFC", "DCR", "IOC", "AST",
  "SOD", "RDS", "FET", "TLM", "EOJ", "CRV", "EEN", "SOI", "BODE",
  "Legend of Blue Eyes",
  // Pokémon sets
  "Base Set", "Jungle", "Fossil", "Team Rocket", "Gym Heroes", "Neo Genesis",
  "Skyridge", "Aquapolis", "Expedition", "Hidden Fates", "Champion's Path",
  // Magic: the Gathering
  "Alpha", "Beta", "Unlimited", "Revised", "Arabian Nights",
];

const KNOWN_SETS_UPPER = new Set(KNOWN_SETS.map((s) => s.toUpperCase()));

// Keywords that indicate sport genre
const SPORT_SIGNALS: [string, string[]][] = [
  ["basketball", ["NBA", "BASKETBALL", "HOOPS"]],
  ["baseball",   ["MLB", "BASEBALL", "BOWMAN",
                   // MLB team names (unique to baseball, no NFL/NHL/NBA overlap)
                   "YANKEES", "RED SOX", "DODGERS", "CUBS", "PADRES",
                   "PHILLIES", "ASTROS", "BRAVES", "METS", "TWINS",
                   "TIGERS", "ORIOLES", "BREWERS", "MARINERS", "ROYALS",
                   "ROCKIES", "PIRATES", "NATIONALS", "BLUE JAYS", "ATHLETICS",
                   "RAYS", "WHITE SOX", "ANGELS"]],
  ["football",   ["NFL", "FOOTBALL", "QUARTERBACK", "TOUCHDOWN",
                   // NFL team names visible on jerseys / card text (clearly football-only)
                   "BUCCANEERS", "BUCCANEER", "STEELERS", "SEAHAWKS", "BENGALS",
                   "RAVENS", "BRONCOS", "RAIDERS", "TITANS", "TEXANS",
                   "JAGUARS", "COLTS", "DOLPHINS", "CHARGERS", "COMMANDERS",
                   "PACKERS", "COWBOYS", "CHIEFS", "VIKINGS", "SAINTS",
                   "FALCONS", "PATRIOTS", "BEARS", "RAMS", "BILLS", "EAGLES"]],
  ["soccer",     ["FIFA", "SOCCER", "MLS", "PREMIER LEAGUE"]],
  ["hockey",     ["NHL", "HOCKEY", "NHLPA", "YOUNG GUNS", "O-PEE-CHEE", "OPC",
                   "CCM", "BAUER", // hockey equipment brands visible on jerseys/sticks
                   "OILERS", "MAPLE LEAFS", "CANADIENS", "CANUCKS", "BLACKHAWKS",
                   "PENGUINS", "AVALANCHE", "RED WINGS", "BRUINS", "FLYERS",
                   "RANGERS", "FLAMES", "LIGHTNING", "CAPITALS", "SENATORS",
                   "SHARKS", "PREDATORS", "WILD", "DALLAS STARS", "HURRICANES",
                   "SABRES", "BLUES", "DUCKS", "JETS", "GOLDEN KNIGHTS"]],
  ["pokemon",    ["POKÉMON", "POKEMON", "TRAINER CARD", "ENERGY CARD", "HP"]],
  ["yugioh",     ["YU-GI-OH", "YU-GI-OH!", "YUGIOH", "EFFECT MONSTER", "SPELL CARD", "TRAP CARD", "SYNCHRO", "XYZ MONSTER", "LINK MONSTER", "ATK/", "KAZUKI TAKAHASHI"]],
  ["magic",      ["MAGIC: THE GATHERING", "MAGIC THE GATHERING", "WIZARDS OF THE COAST", "PLANESWALKER"]],
];

// Words that are definitely not part of a player name
const NAME_STOP = new Set([
  "PSA", "BGS", "SGC", "CGC", "HGA", "CSG",
  "NBA", "NFL", "MLB", "NHL", "FIFA", "MLS",
  "CARD", "CARDS", "NO", "NUMBER", "SERIAL",
  "MINT", "NEAR", "GOOD", "POOR", "EXCELLENT",
  "EDITION", "SERIES", "SET", "THE", "AND", "OF", "IN",
  // Pokémon card UI elements & copyright fragments that are not card names
  "BASIC", "STAGE", "TRAINER", "ENERGY", "NINTENDO", "CREATURES", "ILLUS",
  "POKEMON", "POKÉMON",
  // Grading label series / variant descriptors that are not player names
  "FUTURE STARS", "FUTURE STAR", "AUTOGRAPH", "AUTHENTIC AUTOGRAPH",
  "ROOKIE", "ROOKIE CARD", "PROSPECT", "FUTURE",
  // Magic: The Gathering keyword abilities that appear as standalone lines
  "REACH", "FLYING", "TRAMPLE", "VIGILANCE", "LIFELINK", "DEATHTOUCH",
  "HASTE", "FLASH", "HEXPROOF", "INDESTRUCTIBLE", "SHROUD", "MENACE",
  "PROWESS", "RETRACE", "LEGENDARY", "CREATURE", "PLANESWALKER",
  "ENCHANTMENT", "ARTIFACT", "SORCERY", "INSTANT", "LAND",
  // MTG copyright / publisher words that should never be a card name
  "WIZARDS", "COAST",
  ...Array.from(KNOWN_SETS_UPPER),
]);

function parseCardOcr(rawText: string) {
  const upper = rawText.toUpperCase();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Year (1950–2029)
  const yearMatch = rawText.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // Card number: #136, No. 136, 136/350
  const cardNumMatch =
    rawText.match(/(?:#|No\.?\s*)(\d{1,4})\b/i) ??
    rawText.match(/\b(\d{1,4})\s*\/\s*\d{2,4}\b/);
  const cardNumber = cardNumMatch ? cardNumMatch[1] : null;

  // Grade company + value: try adjacent ("PSA 10") first, then find each independently.
  // On graded slabs the company name and numeric grade are often on different OCR lines.
  const gradeAdjacentMatch = rawText.match(
    /\b(PSA|BGS|SGC|CGC|HGA|CSG)\s*(\d{1,2}(?:\.\d)?|AUTHENTIC|AUTH)\b/i
  );
  const gradeCompanyMatch = gradeAdjacentMatch ?? rawText.match(/\b(PSA|BGS|SGC|CGC|HGA|CSG)\b/i);
  // GEM MT is PSA-exclusive — infer if the PSA logo wasn't read as plain text by OCR
  const gradeCompany = gradeCompanyMatch
    ? gradeCompanyMatch[1].toUpperCase()
    : upper.includes("GEM MT") ? "PSA" : null;
  const gradeValue = gradeAdjacentMatch
    ? (gradeAdjacentMatch[2].toUpperCase().startsWith("AUTH") ? "Authentic" : gradeAdjacentMatch[2])
    : gradeCompany
      ? (rawText.match(/\bGEM\s*MT\s*(\d{1,2}(?:\.\d)?)/i)?.[1] ??
         rawText.match(/\b(10|[1-9](?:\.[05])?)\s*$/m)?.[1] ??
         null)
      : null;

  // Set name — scan for known set keywords first
  let setName: string | null = null;
  for (const s of KNOWN_SETS) {
    if (upper.includes(s.toUpperCase())) { setName = s; break; }
  }

  // Variant / parallel — sports parallels + TCG editions & rarities
  const variantKeywords = [
    // Sports card parallels
    "Refractor", "Prizm", "Silver", "Gold", "Platinum", "Autograph",
    "Auto", "Patch", "Relic", "Jersey", "Rookie", "Holo", "Insert",
    "Short Print", "SP", "Parallel", "Rainbow", "Atomic", "Xfractor",
    // TCG editions & rarities (longer strings first to prevent partial sub-matches)
    "1st Edition", "First Edition", "Unlimited Edition", "Limited Edition",
    "Ultra Rare", "Secret Rare", "Super Rare", "Shadowless",
    "1st Ed",
  ];
  let variant: string | null = null;
  for (const v of variantKeywords) {
    if (upper.includes(v.toUpperCase())) { variant = v; break; }
  }

  // Sport genre
  let sportGenre = "other";
  for (const [sport, signals] of SPORT_SIGNALS) {
    if (signals.some((sig) => upper.includes(sig))) { sportGenre = sport; break; }
  }

  // Pokémon card: name is printed immediately before "HP [number]"
  // Try same-line first ("Bulbasaur HP80"), then look at the line before a standalone "HP \d+"
  let hpName: string | null = null;
  // Allow up to 8 non-letter chars between name and "HP" — Pokémon cards have an
  // energy-type icon (e.g. 🌿) between the card name and the HP value that OCR may
  // render as punctuation/symbols rather than whitespace.
  const hpSameLine = rawText.match(/\b([A-Z][A-Za-z][A-Za-z.\-]+(?:\s+[A-Za-z][A-Za-z.\-]+){0,2})[^A-Za-z]{0,8}HP\s*\d+/);
  if (hpSameLine) {
    hpName = hpSameLine[1].trim();
  } else {
    const hpLineIdx = lines.findIndex((l) => /^HP\s*\d+/.test(l));
    if (hpLineIdx > 0) {
      // Look 1-2 lines back — icon may occupy its own OCR line between name and HP
      for (const offset of [1, 2]) {
        if (hpLineIdx - offset < 0) break;
        const prev = lines[hpLineIdx - offset].replace(/\s+HP.*$/, "").trim();
        if (/^[A-Z][A-Za-z]/.test(prev) && prev.length > 2 && !NAME_STOP.has(prev.toUpperCase())) {
          hpName = prev;
          break;
        }
      }
    }

    // Last resort: some cards render "HP" as a graphic icon; OCR drops it and outputs
    // just the number (e.g. "Bulbasaur\n80" instead of "Bulbasaur HP80").
    // Pokémon HP values are always multiples of 10 in the range 60–350.
    if (!hpName) {
      const hpNumIdx = lines.findIndex((l) => {
        const n = parseInt(l.trim(), 10);
        return /^\d{2,3}$/.test(l.trim()) && n >= 60 && n <= 350 && n % 10 === 0;
      });
      if (hpNumIdx > 0) {
        for (const offset of [1, 2, 3]) {
          if (hpNumIdx - offset < 0) break;
          const candidate = lines[hpNumIdx - offset].trim();
          if (
            /^[A-Z][A-Za-z]/.test(candidate) &&
            !NAME_STOP.has(candidate.toUpperCase()) &&
            candidate.length >= 3
          ) {
            hpName = candidate;
            break;
          }
        }
      }
    }
  }

  // Player / card name
  const yearStr = year ? String(year) : null;
  const nameCandidates = lines.flatMap((rawLine) => {
    // Strip leading/trailing OCR punctuation noise so '"TOM BRADY' → 'TOM BRADY'
    const line = rawLine.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z]+$/, "");
    if (!line) return [];
    if (yearStr && line.includes(yearStr)) return [];
    const words = line.split(/\s+/);
    if (words.length > 8 || words.length < 1) return [];
    if (!/^[A-Z]/.test(line)) return [];             // names always start with uppercase
    if (/^\d/.test(line)) return [];
    if (/^#/.test(line)) return [];                  // card number token like #201
    if (NAME_STOP.has(line.toUpperCase())) return [];
    // Reject lines that START WITH a known series/variant prefix but have extra OCR noise
    // appended (e.g. "FUTURE STARS a te" from label noise after "FUTURE STARS").
    if (
      [
        "FUTURE STARS", "FUTURE STAR", "AUTHENTIC AUTOGRAPH", "AUTHENTIC", "AUTOGRAPH", "ROOKIE CARD", "ROOKIE",
        // MTG type-line descriptors — always precede the card type, never a card name
        "LEGENDARY CREATURE", "LEGENDARY PLANESWALKER", "LEGENDARY ENCHANTMENT",
        "LEGENDARY ARTIFACT", "LEGENDARY LAND", "LEGENDARY",
        "CREATURE ", "ENCHANTMENT ", "SORCERY ", "INSTANT ", "ARTIFACT ",
      ].some((p) => line.toUpperCase().startsWith(p))
    ) return [];
    // Single-word all-caps abbreviation (PSA, GEM, NBA…) — not a name
    if (words.length === 1 && /^[A-Z]{1,5}$/.test(line)) return [];
    // Reject lines where every word is ≤2 letters ("rm Tr", "GE MT" style OCR garbage)
    if (words.every((w) => w.replace(/[^A-Za-z]/g, "").length <= 2)) return [];
    // Reject pure-number / punctuation lines
    if (/^[\d\/\s\/\-\.]+$/.test(line)) return [];
    // Reject card mechanic text (attack/ability descriptions)
    if (/\b(damage|weakness|retreat|resistance)\b/i.test(line)) return [];
    // Reject MTG ability trigger / condition lines — these are rules text, not names
    if (/^(Whenever|When |As long as|At the beginning|At the end|If |You may|Each )/.test(line)) return [];
    // Reject lines containing standalone digit tokens — OCR noise like "Pipi em— : 2 8 J"
    if (line.split(/\s+/).some((w) => /^\d+$/.test(w))) return [];
    // Reject illustrator credit lines: "Illus. Sabotert" → OCR misreads as "Hus. Saboteri" etc.
    // Pattern: 3+-letter word, period, space, capital letter
    if (/^[A-Za-z]{3,}\. [A-Z]/.test(line)) return [];
    return [line];
  });

  // Pokémon detection: if text contains "HP" or "POKÉMON" this is almost certainly a
  // Pokémon card. On these cards titleCase picks attack names ("Leech Seed") and
  // longest picks garbled attack text — both must be skipped.
  // Pokémon detection: fire on explicit TCG text OR the stage badge ("BASIC", "STAGE 1"…)
  // which will be present in the name-crop text even when "HP" isn't reliably read.
  // Also match "HP" immediately followed by a digit (avoids false positives from "HP" initials).
  const isPokemonCard =
    ["POKÉMON", "POKEMON"].some((s) => upper.includes(s)) ||
    /\bHP\s*\d/.test(upper) ||
    ["BASIC", "STAGE 1", "STAGE 2", "STAGE1", "STAGE2", "VMAX", "VSTAR"].some((s) => upper.includes(s));

  // Priority: 1) HP-pattern, 2) Title Case (non-Pokémon only), 3) all-caps TCG,
  //           4) longest single proper-case word (≥5 chars), 5) longest candidate (non-Pokémon)
  const titleCase = nameCandidates.find((l) => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(l));
  const allCapsTcg = nameCandidates
    .filter((l) => /^[A-Z][A-Z\-\s'\.]+[A-Z]$/.test(l) && l.length > 6)
    .sort((a, b) => {
      // Prefer multi-word names ("TOM BRADY", 2 words) over single-word team/brand names
      // ("BUCCANEER", 1 word) — player names almost always have ≥2 words
      const aw = a.split(/\s+/).length;
      const bw = b.split(/\s+/).length;
      if (bw !== aw) return bw - aw; // more words first
      return b.length - a.length;   // then longer
    })[0];
  // Use the LONGEST single-word proper-case match so "Bulbasaur" (9) beats "Sabotert" (8).
  // Also scan individual tokens from nameCandidates lines: PSM.SINGLE_BLOCK may produce a
  // line like "Bulbasaur ; 80 |" where the name is the first token, not the whole line.
  const singleProper = (() => {
    const pool: string[] = [];
    for (const line of nameCandidates) {
      if (/^[A-Z][a-z]{4,}$/.test(line)) {
        pool.push(line); // whole-line match (existing behaviour)
      } else {
        for (const tok of line.split(/\s+/)) {
          const w = tok.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
          if (/^[A-Z][a-z]{4,}$/.test(w) && !NAME_STOP.has(w.toUpperCase())) {
            pool.push(w);
          }
        }
      }
    }
    return pool.sort((a, b) => b.length - a.length)[0] ?? null;
  })();
  const longest = [...nameCandidates].sort((a, b) => b.length - a.length)[0];

  // Magic: The Gathering cards reference themselves by name in rules text.
  // Extract name from common self-reference patterns when other methods fail.
  // e.g. "Whenever Six attacks" → "Six", "When Garruk, Apex Predator enters" → "Garruk, Apex Predator"
  const mtgBodyName = (() => {
    const m = rawText.match(
      /\b(?:Whenever|When)\s+([A-Z][A-Za-z,'\s\u2013\-]{0,40}?)\s+(?:attacks?|enters?|dies?|deals?\s+damage|blocks?)\b/
    );
    if (!m) return null;
    const n = m[1].trim().replace(/,\s*$/, "");
    return n.length >= 2 ? n : null;
  })();

  const name =
    hpName ??
    // MTG cards self-reference their name in rules text ("Whenever Six attacks").
    // Check this BEFORE titleCase so OCR noise from the type line ("Legendary Bea - freefols")
    // and copyright line ("Wizards of the Coast") can't win.
    mtgBodyName ??
    (isPokemonCard ? null : titleCase) ??
    allCapsTcg ??
    singleProper ??
    (isPokemonCard ? null : longest) ??
    null;

  return { name, year, setName, cardNumber, variant, gradeCompany, gradeValue, sportGenre };
}

/**
 * Specialized parser for PSA / BGS / SGC grading label text.
 * PSA label format: "YEAR GAME SET #NUM" / "CARD NAME GRADE_LABEL" / "VARIANT GRADE_NUM"
 * The card name is extracted by finding the line containing a grade descriptor (GEM MT etc.)
 * and taking everything before it.
 */
const GRADE_DESCRIPTOR_RE = /\b(GEM\s*MT|NM[\s\-]MT\+?|MINT|NM|EX[\s\-]MT|EX|VG[\s\-]EX|VG|GOOD|FAIR|POOR)\b/i;

function parseGradingLabel(text: string) {
  const upper = text.toUpperCase();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const yearMatch = text.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  const cardNumMatch =
    text.match(/(?:#|No\.?\s*)(\d{1,4})\b/i) ??
    text.match(/\b(\d{1,4})\s*\/\s*\d{2,4}\b/);
  const cardNumber = cardNumMatch ? cardNumMatch[1] : null;

  const companyMatch = text.match(/\b(PSA|BGS|SGC|CGC|HGA|CSG)\b/i);
  // GEM MT is PSA-exclusive — infer if the PSA logo wasn't read as plain text by OCR
  const gradeCompany = companyMatch
    ? companyMatch[1].toUpperCase()
    : upper.includes("GEM MT") ? "PSA" : null;

  // Grade value: 1–10 (with optional .5) at end of a line — avoids 8-digit cert numbers
  const gradeValueMatch =
    text.match(/\b(10|[1-9](?:\.[05])?)\s*$/m) ??
    text.match(/\bGEM\s*MT\s+(\d{1,2}(?:\.\d)?)\b/i);
  const gradeValue = gradeValueMatch ? gradeValueMatch[1] : null;

  // Hoist yearLineIdx so both name fallback and variant extraction can use it
  const yearLineIdx = lines.findIndex((l) => /\b(19[5-9]\d|20[0-2]\d)\b/.test(l));

  // Card name: text on the line with grade descriptor, before the descriptor.
  // If the descriptor starts the line (column-split OCR), look at the previous line.
  let name: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = GRADE_DESCRIPTOR_RE.exec(lines[i]);
    if (!m) continue;
    if (m.index > 0) {
      const namePart = lines[i].substring(0, m.index).trim().replace(/[\s\-\.]+$/, "");
      if (namePart.length > 3 && !/^\d+$/.test(namePart) && !/^#\d+/.test(namePart)) {
        name = namePart;
        break;
      }
    } else if (i > 0) {
      // Grade descriptor is at column start — name is on the line above
      const prevLine = lines[i - 1].trim().replace(/[\s\-\.]+$/, "");
      if (
        prevLine.length > 3 &&
        !/^[\d\s]+$/.test(prevLine) &&
        !/^#\d+/.test(prevLine) &&
        !/\b(19[5-9]\d|20[0-2]\d)\b/.test(prevLine)
      ) {
        name = prevLine;
        break;
      }
    }
  }

  // Positional fallback: grading labels follow year-header → name → variant structure.
  // Try up to 8 offsets; OCR noise lines between the year and the player name mean we
  // may need to skip several lines before reaching the actual name.
  if (!name && yearLineIdx >= 0) {
    for (const offset of [1, 2, 3, 4, 5, 6, 7, 8]) {
      if (yearLineIdx + offset >= lines.length) break;
      // Strip card-number prefix like "#FS11 " → "FERNANDO TATIS JR."
      const candidate = lines[yearLineIdx + offset]
        .replace(GRADE_DESCRIPTOR_RE, "")
        .trim()
        .replace(/^#[A-Z0-9]+-?[A-Z0-9]*\s+/, "")  // strip "#FS11 " style prefix
        .replace(/[\s\-\.]+$/, "");
      if (
        candidate.length > 3 &&
        !NAME_STOP.has(candidate.toUpperCase()) &&
        !/^[\d\s]+$/.test(candidate) &&
        !/^#\d+$/.test(candidate)
      ) {
        name = candidate;
        break;
      }
    }
  }

  // Variant: label line 3 (yearLineIdx + 2) holds edition/rarity info
  // e.g. "LEGEND/BLUE EYES - 1ST ED. 10" → strip trailing grade number → find edition pattern
  let variant: string | null = null;
  if (yearLineIdx >= 0 && yearLineIdx + 2 < lines.length) {
    const varLine = lines[yearLineIdx + 2]
      .replace(/\b(10|[1-9](?:\.[05])?)\s*$/, "")
      .trim();
    const editionMatch = varLine.match(
      /\b(1ST|2ND|UNLIMITED|LIMITED|FIRST|SECOND)\s*(?:ED(?:ITION)?)?\.?\b/i
    );
    if (editionMatch) variant = editionMatch[0].trim().replace(/\.$/, "");
  }
  // Also scan full label text for TCG rarity keywords
  if (!variant) {
    const tcgRarities = ["Ultra Rare", "Secret Rare", "Super Rare", "Holo Rare", "1st Edition", "First Edition", "Unlimited Edition"];
    for (const r of tcgRarities) {
      if (upper.includes(r.toUpperCase())) { variant = r; break; }
    }
  }

  let sportGenre = "other";
  for (const [sport, signals] of SPORT_SIGNALS) {
    if (signals.some((sig) => upper.includes(sig))) { sportGenre = sport; break; }
  }

  let setName: string | null = null;
  for (const s of KNOWN_SETS) {
    if (upper.includes(s.toUpperCase())) { setName = s; break; }
  }

  return { name, year, setName, cardNumber, variant, gradeCompany, gradeValue, sportGenre };
}

/**
 * Look up a player/card name via the Wikipedia REST API to infer sport genre.
 * Used as a last resort when no sport text is OCR-readable (e.g. graded slabs).
 * Fails silently in ≤4 s so it never blocks the scan.
 */
async function inferSportFromWeb(name: string): Promise<string> {
  try {
    const signal = AbortSignal.timeout(4000);
    const headers = { "User-Agent": "Cardventory/1.0 (card-collection-app)" };

    // Wikipedia summary — fast structured result
    const titleCased = name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\s+/g, "_");
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleCased)}`,
      { signal, headers }
    );

    let text = "";
    if (summaryRes.ok) {
      const d = await summaryRes.json() as { extract?: string; description?: string };
      text = ((d.extract ?? "") + " " + (d.description ?? "")).toUpperCase();
    } else {
      // Wikipedia search fallback (handles name variations / OCR misspellings)
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=1&srprop=snippet`,
        { signal, headers }
      );
      if (searchRes.ok) {
        const d = await searchRes.json() as { query?: { search?: Array<{ snippet: string }> } };
        text = (d.query?.search?.[0]?.snippet ?? "").toUpperCase();
      }
    }

    if (!text) return "other";

    // Check existing SPORT_SIGNALS first (NBA, NFL, NHL, etc. appear in Wikipedia text)
    for (const [sport, signals] of SPORT_SIGNALS) {
      if (signals.some((sig) => text.includes(sig))) return sport;
    }
    // Wikipedia-specific sport terminology
    if (/ICE HOCKEY|HOCKEY (PLAYER|CENTRE|CENTER|FORWARD|DEFENCEMAN|GOALTENDER)/.test(text)) return "hockey";
    if (/BASKETBALL (PLAYER|CENTRE|CENTER|FORWARD|GUARD)/.test(text)) return "basketball";
    if (/BASEBALL PLAYER|PITCHER|OUTFIELDER|SHORTSTOP|FIRST BASEMAN/.test(text)) return "baseball";
    if (/AMERICAN FOOTBALL|QUARTERBACK|WIDE RECEIVER|RUNNING BACK/.test(text)) return "football";
    if (/ASSOCIATION FOOTBALL|PROFESSIONAL FOOTBALLER|SOCCER PLAYER/.test(text)) return "soccer";

    return "other";
  } catch {
    return "other"; // timeout or network error — sport detection is non-critical
  }
}

const SCAN_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const SCAN_RATE_WINDOW_MS = 60_000;       // 1 minute sliding window
const SCAN_RATE_MAX = 5;                  // max scans per user per minute
const ALLOWED_SCAN_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const scanBucket = new Map<string, number[]>(); // per-user timestamp buckets

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-user rate limiting — OCR + sharp is expensive
  const userId = session.user.id;
  const now = Date.now();
  const bucketTs = (scanBucket.get(userId) ?? []).filter(t => now - t < SCAN_RATE_WINDOW_MS);
  if (bucketTs.length >= SCAN_RATE_MAX) {
    securityMetrics.increment("scanBlocked");
    return NextResponse.json(
      { error: "Scan rate limit reached. Please wait before scanning again." },
      { status: 429 }
    );
  }
  bucketTs.push(now);
  scanBucket.set(userId, bucketTs);

  const contentType = req.headers.get("content-type") ?? "";
  let imageBuffer: Buffer;
  let mimeType = "image/jpeg";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    imageBuffer = Buffer.from(await file.arrayBuffer());
    mimeType = file.type || "image/jpeg";
  } else {
    const body = await req.json().catch(() => ({})) as { image?: string };
    if (!body.image) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    const dataUrl = body.image;
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    mimeType = dataUrl.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
    imageBuffer = Buffer.from(base64, "base64");
  }

  // Validate size and MIME before passing to sharp + Tesseract
  if (imageBuffer.length > SCAN_MAX_BYTES) {
    return NextResponse.json({ error: "Image too large. Maximum size is 15 MB." }, { status: 413 });
  }
  if (!ALLOWED_SCAN_MIMES.has(mimeType)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are supported." }, { status: 400 });
  }

  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const cacheDir = join(process.cwd(), "tessdata");
  const tmpPath = join(tmpdir(), `cv-scan-${randomUUID()}.${ext}`);
  const processedPath = join(tmpdir(), `cv-scan-${randomUUID()}-ocr.png`);
  const bodyPath = join(tmpdir(), `cv-scan-${randomUUID()}-body.png`);
  const namePath = join(tmpdir(), `cv-scan-${randomUUID()}-name.png`);

  try {
    await writeFile(tmpPath, imageBuffer);

    // Preprocess for better OCR accuracy:
    // 1. Grayscale — removes color noise from foil/holo backgrounds
    // 2. Normalise — auto-stretches contrast so faint text becomes readable
    // 3. Sharpen — crisp edges improve character recognition
    // 4. Upscale to at least 1800px tall — Tesseract accuracy scales with resolution
    const meta = await sharp(tmpPath).metadata();
    const height = meta.height ?? 0;
    const scaleFactor = height < 1800 ? Math.ceil(1800 / Math.max(height, 1)) : 1;
    await sharp(tmpPath)
      .grayscale()
      .normalise()
      .sharpen({ sigma: 1.5, m1: 1, m2: 3 })
      .resize({
        width: (meta.width ?? 600) * scaleFactor,
        height: height * scaleFactor,
        fit: "fill",
      })
      .png()
      .toFile(processedPath);

    // Label crop: built from the ORIGINAL image (tmpPath) with its own gentler pipeline.
    // Cropping the already-3× upscaled processedPath introduced stretch artifacts and
    // threshold(200) was converting the PSA logo area to an OCR-confusing black blob.
    const origLabelH = Math.max(Math.round((meta.height ?? 400) * 0.25), 80);
    const labelPath = join(tmpdir(), `cv-scan-${randomUUID()}-lbl.png`);
    const labelScale = Math.max(2, Math.ceil(600 / origLabelH)); // target ≥600px tall
    await sharp(tmpPath)
      .extract({ left: 0, top: 0, width: meta.width!, height: origLabelH })
      .grayscale()
      .normalise()
      .sharpen({ sigma: 1.0 })
      .resize({ width: (meta.width ?? 600) * labelScale, height: origLabelH * labelScale, fit: "fill" })
      .png()
      .toFile(labelPath);

    // Body crop: card face below the label — kept in colour with normalise only (no grayscale,
    // no sharpen) so that photo-embedded text like team names and equipment brands reads cleanly.
    const bodyTop = Math.max(Math.round((meta.height ?? 400) * 0.22), 60);
    const bodyH   = Math.max(Math.round((meta.height ?? 400) * 0.65), 100);
    await sharp(tmpPath)
      .extract({ left: 0, top: bodyTop, width: meta.width!, height: bodyH })
      .normalise()
      .resize({ width: (meta.width ?? 600) * 2, height: bodyH * 2, fit: "fill" })
      .png()
      .toFile(bodyPath);

    // Name crop: top 15 % of the original image, colour-preserved (normalise only).
    // The label crop covers the right area but uses grayscale+sharpen (tuned for PSA labels)
    // which distorts coloured card fonts and drops letters (e.g. "Bulbas" instead of
    // "Bulbasaur").  The body crop has the right preprocessing but starts at 22 %, missing
    // the name strip entirely.  This pass fills that gap.
    const nameH = Math.max(Math.round((meta.height ?? 400) * 0.15), 40);
    await sharp(tmpPath)
      .extract({ left: 0, top: 0, width: meta.width!, height: nameH })
      .normalise()
      .resize({ width: (meta.width ?? 600) * 3, height: nameH * 3, fit: "fill" })
      .png()
      .toFile(namePath);

    const worker = await createWorker("eng", 1, {
      cachePath: cacheDir,
      logger: () => {},
    });

    let rawText = "";
    let labelText = "";
    let bodyText = "";
    let nameText = "";
    try {
      // Pass 1 — full image, sparse text for scattered content
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const result = await worker.recognize(processedPath);
      rawText = result.data.text;

      // Pass 2 — label crop, sparse text (handles logo + multi-column label layout)
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const labelResult = await worker.recognize(labelPath);
      labelText = labelResult.data.text;

      // Pass 3 — card body (below label): colour image, normalise-only preprocessing.
      // Targets sport signals like team names (OILERS) and equipment brands (CCM, BAUER)
      // that are embedded in the card photo and harder to read in the full grayscale pass.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const bodyResult = await worker.recognize(bodyPath);
      bodyText = bodyResult.data.text;

      // Pass 4 — name crop: top 15 % of card in colour.  Designed to reliably OCR
      // Pokémon card names (coloured font) that the grayscale label crop mis-reads.
      // PSM.SINGLE_BLOCK keeps the card name on one OCR line ("Bulbasaur ; 80 |") so the
      // word-level token scan in parseCardOcr can extract it; PSM.SPARSE_TEXT fragments it
      // into "Bulb" / "a" / "ur" on separate lines, defeating the name-matching logic.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const nameResult = await worker.recognize(namePath);
      nameText = nameResult.data.text;
    } finally {
      await worker.terminate();
      unlink(labelPath).catch(() => {});
      unlink(bodyPath).catch(() => {});
      unlink(namePath).catch(() => {});
    }

    const debugLog = [
      `=== PASS1 ===\n${rawText}`,
      `=== PASS2 ===\n${labelText}`,
      `=== PASS3 ===\n${bodyText}`,
      `=== PASS4 ===\n${nameText}`,
    ].join("\n\n");
    import("fs").then(({ writeFileSync }) => {
      try { writeFileSync("/tmp/scan-debug.txt", debugLog); } catch {}
    });

    const cardFull    = parseCardOcr(rawText);
    const cardLabel   = parseGradingLabel(labelText);
    const nameCropOcr = parseCardOcr(nameText);
    const bodyGenre   = parseCardOcr(bodyText).sportGenre;

    let sportGenre = cardLabel.sportGenre !== "other" ? cardLabel.sportGenre
                   : cardFull.sportGenre  !== "other" ? cardFull.sportGenre
                   : bodyGenre;

    // Last resort: Wikipedia lookup for the player name (~1–3 s, fails silently)
    if (sportGenre === "other") {
      const mergedName = cardLabel.name ?? nameCropOcr.name ?? cardFull.name;
      if (mergedName) sportGenre = await inferSportFromWeb(mergedName);
    }

    const card = {
      name:         cardLabel.name         ?? nameCropOcr.name ?? cardFull.name,
      year:         cardLabel.year         ?? cardFull.year,
      setName:      cardLabel.setName      ?? cardFull.setName,
      cardNumber:   cardLabel.cardNumber   ?? cardFull.cardNumber,
      variant:      cardFull.variant       ?? cardLabel.variant,
      gradeCompany: cardLabel.gradeCompany ?? cardFull.gradeCompany,
      gradeValue:   cardLabel.gradeValue   ?? cardFull.gradeValue,
      sportGenre,
    };
    return NextResponse.json({ card, _raw: rawText, _labelRaw: labelText, _nameRaw: nameText, _bodyRaw: bodyText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR failed";
    console.error("[scan] OCR error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    unlink(tmpPath).catch(() => {});
    unlink(processedPath).catch(() => {});
    unlink(bodyPath).catch(() => {});
  }
}
