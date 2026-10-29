// Rule-based brief parser: the offline fallback when AI parsing is unavailable, and the first pass
// for instant feedback. Pure string work, no network or browser APIs, never throws.
//
// Approach: normalise the text, then detect fields in a fixed order. Each stage blanks out ("masks")
// the spans it consumed in a working copy so later stages do not misread them: money amounts are
// masked before ages and counts are read, state names before languages ("Tamil Nadu" is a place,
// not a language request), "no fake followers" before goals, and so on.
import type {
  AgeBand,
  CampaignBrief,
  CampaignGoal,
  CityTier,
  CreatorTier,
  Deliverable,
  Gender,
  LanguageCode,
  Niche,
  ParsedBrief,
  Platform,
  Region,
} from "../../types";
import {
  CITIES,
  CITY_TIER_ALIASES,
  CITY_TIER_LIST,
  CREATOR_TIERS,
  CREATOR_TIER_LIST,
  DELIVERABLES,
  DELIVERABLE_LIST,
  GOALS,
  HINDI_BELT_ALIASES,
  LANGUAGES,
  LANGUAGE_CODES,
  NICHES,
  NICHE_KEYWORDS,
  PAN_INDIA_ALIASES,
  PLATFORMS,
  PLATFORM_LIST,
  REGIONS,
  REGION_LIST,
  STATES,
} from "../../data/taxonomy";
import { formatINR } from "../format";

const MAX_DESCRIPTION = 2000;
const FIELD_ORDER: (keyof CampaignBrief)[] = [
  "brandName",
  "productCategory",
  "goal",
  "niches",
  "languages",
  "platforms",
  "deliverable",
  "targetGender",
  "targetAges",
  "targetTiers",
  "targetRegions",
  "targetCityIds",
  "creatorTiers",
  "budgetINR",
  "creatorsWanted",
  "minAuthenticity",
  "minEngagementRate",
  "excludeBrands",
];

// ---------------------------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------------------------

const regexCache = new Map<string, RegExp>();
const WORD_CHAR_RE = /[\p{L}\p{M}\p{N}_]/u;

function isWordChar(ch: string | undefined, extra = ""): boolean {
  return ch !== undefined && ch !== "" && (WORD_CHAR_RE.test(ch) || extra.includes(ch));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Phrase regexes stay plain (no Unicode property classes) because hundreds are compiled on the first
// parse, and V8 compiles \p{...} lookbehinds slowly; word boundaries are checked by hand instead.
/** Lowercase phrase regex. Spaces and hyphens inside the phrase are interchangeable. */
function phraseRegex(phrase: string, plural = false): RegExp {
  const key = `${plural ? "p" : "s"}:${phrase}`;
  let re = regexCache.get(key);
  if (!re) {
    const body = phrase
      .trim()
      .toLowerCase()
      .split(/[\s-]+/)
      .map(escapeRegex)
      .join("[\\s-]*");
    re = new RegExp(`${body}${plural ? "(?:e?s)?" : ""}`, "g");
    regexCache.set(key, re);
  }
  return re;
}

interface Hit {
  index: number;
  length: number;
}

/** Whole-word hits of a regex; `extra` lists characters that also count as part of a word. */
function wordHits(text: string, re: RegExp, extra = "", firstOnly = false): Hit[] {
  const hits: Hit[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    if (m[0].length > 0 && !isWordChar(text[m.index - 1], extra) && !isWordChar(text[end], extra)) {
      hits.push({ index: m.index, length: m[0].length });
      if (firstOnly) break;
      re.lastIndex = end;
    } else {
      re.lastIndex = m.index + 1;
    }
  }
  return hits;
}

function findPhrase(text: string, phrase: string, plural = false): Hit | null {
  return wordHits(text, phraseRegex(phrase, plural), "", true)[0] ?? null;
}

/** Earliest hit of any phrase (longest wins on a tie). */
function findAny(text: string, phrases: readonly string[], plural = false): Hit | null {
  let best: Hit | null = null;
  for (const phrase of phrases) {
    const hit = findPhrase(text, phrase, plural);
    if (hit && (!best || hit.index < best.index || (hit.index === best.index && hit.length > best.length))) best = hit;
  }
  return best;
}

/** Case-sensitive whole-word search for a literal ("UP", "Gaya") in the original-case text. */
function findLiteral(text: string, literal: string, extra = ""): Hit | null {
  const key = `l:${literal}`;
  let re = regexCache.get(key);
  if (!re) {
    re = new RegExp(escapeRegex(literal), "g");
    regexCache.set(key, re);
  }
  return wordHits(text, re, extra, true)[0] ?? null;
}

/** Replaces every match with spaces of the same length, so indices stay aligned with the source. */
function blank(text: string, re: RegExp): string {
  re.lastIndex = 0;
  return text.replace(re, (m) => " ".repeat(m.length));
}

function blankPhrases(text: string, phrases: readonly string[], plural = false): string {
  let out = text;
  for (const phrase of phrases) {
    for (const hit of wordHits(out, phraseRegex(phrase, plural))) out = blankSpan(out, hit.index, hit.length);
  }
  return out;
}

function blankSpan(text: string, index: number, length: number): string {
  return text.slice(0, index) + " ".repeat(length) + text.slice(index + length);
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function listText(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------------------------------------
// Parser state
// ---------------------------------------------------------------------------------------------

interface Ctx {
  /** Normalised text with original casing. */
  orig: string;
  /** Lowercased working copy; consumed spans are blanked out. */
  work: string;
  brief: Partial<CampaignBrief>;
  notes: string[];
  /** A per-creator fee waits here until the creator count is known. */
  perCreator?: Amount;
  hindiBelt: boolean;
}

function normalise(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[‘’′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[   ]/g, " ");
}

/** Extracts structured brief fields from free text without any network call. */
export function parseBriefWithRules(text: string): ParsedBrief {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return { brief: {}, source: "rules", notes: [], detectedFields: [] };
  const description = trimmed.slice(0, MAX_DESCRIPTION);

  try {
    const orig = normalise(trimmed);
    const lower = orig.toLowerCase();
    // toLowerCase can change the length of a few exotic characters; keep indices aligned or bail out
    // of the index-sensitive stages by working on the lowercased text alone.
    const ctx: Ctx = { orig: lower.length === orig.length ? orig : lower, work: lower, brief: {}, notes: [], hindiBelt: false };

    detectMoney(ctx);
    detectCreatorCount(ctx);
    applyPerCreatorBudget(ctx);
    detectAuthenticity(ctx);
    detectEngagementFloor(ctx);
    detectExcludedBrands(ctx);
    detectBrandName(ctx);
    detectGeo(ctx);
    detectLanguages(ctx);
    detectPlatformsAndDeliverable(ctx);
    detectGoal(ctx);
    detectGender(ctx);
    detectAges(ctx);
    detectCreatorTiers(ctx);
    detectNiches(ctx);

    const detectedFields = FIELD_ORDER.filter((key) => ctx.brief[key] !== undefined);
    if (detectedFields.length === 0) {
      ctx.notes.push("No campaign details were recognised, so please fill in the form fields yourself.");
    }
    return { brief: { ...ctx.brief, description }, source: "rules", notes: uniq(ctx.notes), detectedFields };
  } catch {
    return {
      brief: { description },
      source: "rules",
      notes: ["The built-in parser could not read this brief, so please fill in the form fields yourself."],
      detectedFields: [],
    };
  }
}

// ---------------------------------------------------------------------------------------------
// Money: budgets, per-creator fees and non-INR amounts
// ---------------------------------------------------------------------------------------------

interface Amount {
  value: number;
  raw: string;
  perCreator: boolean;
  budgetContext: boolean;
  range: boolean;
}

const NUM = "\\d+(?:,\\d+)*(?:\\.\\d+)?";
const FOREIGN_RE = new RegExp(
  `(?:(?<![\\p{L}])(?:us\\$|\\$|usd|€|eur|euros?|£|gbp)\\s*${NUM}\\s*(?:k|m|mn|million)?(?![\\p{L}\\p{N}])` +
    `|(?<![\\p{L}\\p{N}.,])${NUM}\\s*(?:k|m|mn|million)?\\s*(?:usd|dollars?|euros?|eur|gbp|pounds?)(?![\\p{L}]))`,
  "gu",
);
const INR_RE = new RegExp(
  `(?<![\\p{L}\\p{N}.,₹$€£])(?:(₹|rs\\.?|inr|rupees?)\\s*)?(${NUM})(?:\\s*(?:-|to)\\s*(?:₹|rs\\.?)?\\s*(${NUM}))?` +
    `\\s*(lakhs?|lacs?|crores?|cr|l|k|thousand)?(?![\\p{L}\\p{N}])(\\s*(?:rupees|rs|inr|\\/-))?`,
  "gu",
);
const UNIT_MULTIPLIER: Record<string, number> = { lakh: 1e5, lac: 1e5, l: 1e5, crore: 1e7, cr: 1e7, k: 1e3, thousand: 1e3 };
const NON_MONEY_AFTER =
  /^\s*\+?\s*(?:followers?|subs|subscribers?|views?|impressions?|installs?|downloads?|users?|people|reach|audience|likes?|engagements?|creators?|influencers?|students?|customers?|sign[\s-]?ups?|orders?|plays?|accounts?|members?|families|households|farmers)\b/;
const PER_CREATOR_AFTER = /^\s*(?:\/\s*|per\s+|a\s+|each\s+|har\s+)(?:creators?|influencers?|head|person|creator)\b|^\s*each\b|^\s*per\s+head\b/;
const BUDGET_BEFORE = /\b(?:budget|spend|spending|kharcha|allocated|allocation|total|up\s?to|upto|max(?:imum)?|around|approx(?:imately)?)\b/;

function unitMultiplier(unit: string | undefined): number {
  if (!unit) return 1;
  const key = unit.replace(/s$/, "");
  return UNIT_MULTIPLIER[key] ?? 1;
}

function toNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function detectMoney(ctx: Ctx): void {
  FOREIGN_RE.lastIndex = 0;
  const foreign = [...ctx.work.matchAll(FOREIGN_RE)];
  if (foreign.length > 0) {
    const shown = foreign.map((m) => `"${ctx.orig.slice(m.index, m.index + m[0].length).trim()}"`).slice(0, 2);
    ctx.notes.push(`Ignored ${listText(shown)}: budgets are read in rupees only, so please enter the INR amount.`);
    ctx.work = blank(ctx.work, FOREIGN_RE);
  }

  const amounts: Amount[] = [];
  const spans: Hit[] = [];
  INR_RE.lastIndex = 0;
  for (const m of ctx.work.matchAll(INR_RE)) {
    const [whole, prefix, first, second, unit, suffix] = m;
    const start = m.index;
    const end = start + whole.length;
    const hasCurrency = Boolean(prefix || suffix?.trim());
    const multiplier = unitMultiplier(unit);
    const value = Math.round(toNumber(second ?? first) * multiplier);
    if (!Number.isFinite(value) || value <= 0 || value > 1e10) continue;

    const after = ctx.work.slice(end, end + 40);
    const before = ctx.work.slice(Math.max(0, start - 40), start);
    if (NON_MONEY_AFTER.test(after)) continue;
    const perCreator = PER_CREATOR_AFTER.test(after);
    const budgetContext = BUDGET_BEFORE.test(before) || /^\s*(?:budget|ka budget|budget hai)\b/.test(after);
    const isLakhCrore = multiplier >= 1e5;
    const isThousands = multiplier === 1e3;
    const accepted =
      hasCurrency || isLakhCrore || (isThousands && (budgetContext || perCreator)) || (multiplier === 1 && budgetContext && value >= 1000);
    if (!accepted) continue;

    amounts.push({
      value,
      raw: ctx.orig.slice(start, end).trim(),
      perCreator,
      budgetContext,
      range: Boolean(second),
    });
    spans.push({ index: start, length: whole.length });
  }
  for (const span of spans) ctx.work = blankSpan(ctx.work, span.index, span.length);

  const totals = amounts.filter((a) => !a.perCreator);
  const preferred = totals.filter((a) => a.budgetContext);
  const pool = preferred.length > 0 ? preferred : totals;
  if (pool.length > 0) {
    const chosen = pool.reduce((best, a) => (a.value > best.value ? a : best));
    ctx.brief.budgetINR = chosen.value;
    ctx.notes.push(
      chosen.range
        ? `Read "${chosen.raw}" as a budget of ${formatINR(chosen.value)}, the upper end of the range.`
        : `Read "${chosen.raw}" as a total budget of ${formatINR(chosen.value)}.`,
    );
  }
  ctx.perCreator = amounts.find((a) => a.perCreator);
}

function applyPerCreatorBudget(ctx: Ctx): void {
  const per = ctx.perCreator;
  if (!per) return;
  if (ctx.brief.budgetINR !== undefined) {
    ctx.notes.push(`Kept the total budget; the per-creator figure "${per.raw}" was noted but not added on top.`);
    return;
  }
  const count = ctx.brief.creatorsWanted;
  if (count) {
    ctx.brief.budgetINR = per.value * count;
    ctx.notes.push(
      `Worked out the budget as ${formatINR(per.value)} per creator × ${count} creators = ${formatINR(per.value * count)}.`,
    );
  } else {
    ctx.notes.push(
      `Found a per-creator budget of ${formatINR(per.value)} but no creator count, so the total budget was left for you to set.`,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Creator count
// ---------------------------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  "a dozen": 12,
  dozen: 12,
  "half a dozen": 6,
  "a couple of": 2,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  "twenty five": 25,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
  "a hundred": 100,
};
const NUMBER_WORD_ALT = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replace(/ /g, "\\s+"))
  .join("|");
const COUNT_RE = new RegExp(
  `(?<![\\p{L}\\p{N}.,₹])(\\d{1,3}|${NUMBER_WORD_ALT})(?:\\s*(?:-|to)\\s*(\\d{1,3}))?\\+?\\s+((?:[\\p{L}&/'-]+\\s+){0,3}?)` +
    `(?:\\p{L}+-)?(?:creators?|influencers?|kols?|youtubers?|instagrammers?|bloggers?|vloggers?|ambassadors?)(?![\\p{L}])`,
  "gu",
);
const COUNT_BLOCKERS = new Set(["per", "each", "with", "from", "for", "who", "than", "of", "har"]);

function detectCreatorCount(ctx: Ctx): void {
  COUNT_RE.lastIndex = 0;
  for (const m of ctx.work.matchAll(COUNT_RE)) {
    const [, first, second, between] = m;
    const words = between.trim().split(/\s+/).filter(Boolean);
    if (words.some((w) => COUNT_BLOCKERS.has(w))) continue;
    const base = /^\d/.test(first) ? Number(first) : NUMBER_WORDS[first.replace(/\s+/g, " ")];
    const value = second ? Number(second) : base;
    if (!value || value < 1 || value > 200) continue;
    ctx.brief.creatorsWanted = value;
    if (second) ctx.notes.push(`Read "${first}-${second}" creators as ${value}, the upper end of the range.`);
    ctx.work = blankSpan(ctx.work, m.index, first.length);
    return;
  }
}

// ---------------------------------------------------------------------------------------------
// Quality filters
// ---------------------------------------------------------------------------------------------

const AUTHENTICITY_RE =
  /(?:\b(?:no|zero|avoid|without|not|nahi|nahin|bina)\s+(?:any\s+)?(?:fake|bot|bots|bought|purchased|paid|inflated)(?:\s+(?:followers?|engagement|likes|accounts|audience|views))?\b|\b(?:fake|bot)\s+(?:followers?|engagement)\s+(?:nahi|nahin|not allowed|bilkul nahi)\b|\b(?:genuine|authentic|real|organic)\s+(?:followers?|audiences?|engagement|creators?|influencers?)\b|\bhigh[\s-]authenticity\b)/g;

function detectAuthenticity(ctx: Ctx): void {
  AUTHENTICITY_RE.lastIndex = 0;
  if (!AUTHENTICITY_RE.test(ctx.work)) return;
  ctx.brief.minAuthenticity = 80;
  ctx.notes.push("Raised the minimum authenticity score to 80 because the brief asks for genuine followers.");
  ctx.work = blank(ctx.work, AUTHENTICITY_RE);
}

const ER_RES = [
  /\b(?:engagement rate|engagement|er)\s*(?:of|above|over|at least|atleast|minimum|min\.?|more than|>=?|ke upar|should be)?\s*(?:of\s*)?(\d{1,2}(?:\.\d+)?)\s*%\s*\+?/g,
  /\b(?:above|over|at least|atleast|minimum|min\.?|more than|>=?)\s*(\d{1,2}(?:\.\d+)?)\s*%\s*\+?\s*(?:engagement(?: rate)?|er)\b/g,
  /(?<![\d.])(\d{1,2}(?:\.\d+)?)\s*%\s*\+\s*(?:engagement(?: rate)?|er)\b/g,
];

function detectEngagementFloor(ctx: Ctx): void {
  for (const re of ER_RES) {
    re.lastIndex = 0;
    const m = re.exec(ctx.work);
    if (!m) continue;
    const value = Number(m[1]);
    if (value > 0 && value <= 20) {
      ctx.brief.minEngagementRate = value;
      ctx.notes.push(`Set a minimum engagement rate of ${value}%.`);
    }
    ctx.work = blankSpan(ctx.work, m.index, m[0].length);
    return;
  }
}

// ---------------------------------------------------------------------------------------------
// Brands: competitors to exclude and the brand's own name
// ---------------------------------------------------------------------------------------------

const EXCLUDE_RES = [
  /\b(?:avoid|exclude|skip|no|not|without|don't want|do not want)\s+(?:any\s+)?(?:creators?|influencers?|people|those|anyone|one)?\s*(?:who\s+(?:have\s+|has\s+)?(?:recently\s+|already\s+)?|that\s+(?:have\s+|has\s+)?|having\s+)?(?:worked|work|working|collaborated|collabed|partnered|promoted|done\s+(?:paid\s+)?(?:posts?|collabs?|campaigns?))\s+(?:with|for)\s+([^.;\n!?]+)/giu,
  /\bcompetitors?(?:\s+brands?)?\s*(?:are|include|includes|like|such as|e\.g\.|i\.e\.)?\s*[:(-]?\s*([^.;\n!?)]+)/giu,
];
const EXCLUDE_TRAILING = /\s+(?:in|within|over|during|recently|since|last|ke|etc|from|before|ever|as|because|so|who|which|or similar)\b.*$/iu;

function detectExcludedBrands(ctx: Ctx): void {
  const found: string[] = [];
  for (const re of EXCLUDE_RES) {
    re.lastIndex = 0;
    for (const m of ctx.orig.matchAll(re)) {
      const items = m[1]
        .split(/,|\/|;|&|\s+(?:and|or|aur)\s+/iu)
        .map((item) =>
          item
            .replace(EXCLUDE_TRAILING, "")
            .replace(/^["'\s]+|["'\s.!]+$/g, "")
            .replace(/'s$/, "")
            .trim(),
        )
        .filter((item) => item.length >= 2 && item.length <= 40 && item.split(/\s+/).length <= 4 && /^[\p{Lu}\p{N}]/u.test(item));
      if (items.length === 0) continue;
      found.push(...items);
      ctx.work = blankSpan(ctx.work, m.index, m[0].length);
    }
  }
  const unique: string[] = [];
  for (const brand of found) {
    if (!unique.some((u) => u.toLowerCase() === brand.toLowerCase())) unique.push(brand);
  }
  if (unique.length > 0) {
    ctx.brief.excludeBrands = unique.slice(0, 10);
    ctx.notes.push(`Creators who worked with ${listText(unique.slice(0, 10))} in the last 6 months will be excluded.`);
  }
}

let stopWordCache: Set<string> | null = null;

/** Words that start phrases like "for Diwali" or "for Tamil creators" and are never a brand name. */
function brandStopWords(): Set<string> {
  if (stopWordCache) return stopWordCache;
  const words = new Set<string>([
    "a", "an", "the", "our", "my", "this", "that", "these", "next", "new", "all", "any", "both", "some", "more",
    "india", "indian", "bharat", "gen", "tier", "women", "men", "girls", "boys", "moms", "dads", "kids", "students",
    "diwali", "holi", "navratri", "durga", "onam", "pongal", "eid", "christmas", "rakhi", "raksha", "ganesh", "festive",
    "festival", "summer", "winter", "monsoon", "launch", "brand", "campaign", "creators", "influencers", "q1", "q2",
    "q3", "q4", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october",
    "november", "december", "jee", "neet", "upsc", "ugc", "ev", "upi", "d2c", "reels", "shorts", "stories", "videos",
    "awareness", "installs", "sales", "south", "north", "east", "west", "central", "northeast", "metro", "metros",
    "hindi", "english", "hinglish", "regional", "young", "working", "college", "first-time", "first", "both",
  ]);
  const add = (phrase: string) => {
    for (const w of phrase.toLowerCase().split(/[\s-]+/)) if (w) words.add(w);
  };
  for (const code of LANGUAGE_CODES) LANGUAGES[code].aliases.concat(LANGUAGES[code].label).forEach(add);
  for (const p of PLATFORM_LIST) PLATFORMS[p].aliases.concat(PLATFORMS[p].label).forEach(add);
  for (const c of CITIES) [c.name, ...c.aliases].forEach(add);
  for (const s of STATES) [s.name, ...s.aliases].forEach(add);
  for (const n of NICHES) NICHE_KEYWORDS[n].forEach(add);
  for (const t of CREATOR_TIER_LIST) CREATOR_TIERS[t].aliases.forEach(add);
  stopWordCache = words;
  return words;
}

const BRAND_NAME_TOKEN = "\\p{Lu}[\\p{L}\\p{N}&'.-]*";
const BRAND_NAME_NEXT = "[\\p{Lu}\\p{N}][\\p{L}\\p{N}&'.-]*";
const BRAND_RES = [
  /\bbrand(?:\s+name)?\s*(?:is|:|-)\s*["']?([^\n,.;:!?"()]{2,60})/iu,
  new RegExp(`\\b(?:[Ww]e\\s+are|[Ww]e're|[Tt]his\\s+is|[Hh]um)\\s+["']?(${BRAND_NAME_TOKEN}(?:\\s+${BRAND_NAME_NEXT}){0,3})`, "u"),
  new RegExp(`\\b(?:[Ff]or|[Ll]aunching|[Pp]romote|[Pp]romoting)\\s+["']?(${BRAND_NAME_TOKEN}(?:\\s+${BRAND_NAME_NEXT}){0,3})`, "gu"),
];

function cleanBrand(candidate: string): string | null {
  const stop = brandStopWords();
  const words = candidate
    .replace(/'s$|'$/u, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4);
  if (words.length === 0 || !/^\p{Lu}/u.test(words[0]) || stop.has(words[0].toLowerCase())) return null;
  while (words.length > 1 && stop.has(words[words.length - 1].toLowerCase().replace(/'s$|'$/u, ""))) words.pop();
  const name = words.join(" ").replace(/'s$|'$|[.-]+$/u, "").trim();
  return name.length >= 2 && name.length <= 60 ? name : null;
}

function detectBrandName(ctx: Ctx): void {
  const [labelled, selfIntro, forX] = BRAND_RES;
  const labelMatch = labelled.exec(ctx.orig);
  if (labelMatch) {
    const name = cleanBrand(labelMatch[1].trim().split(/\s+/).slice(0, 4).join(" "));
    if (name) {
      ctx.brief.brandName = name;
      return;
    }
  }
  const introMatch = selfIntro.exec(ctx.orig);
  const intro = introMatch ? cleanBrand(introMatch[1]) : null;
  if (intro) {
    ctx.brief.brandName = intro;
    return;
  }
  forX.lastIndex = 0;
  const excluded = new Set((ctx.brief.excludeBrands ?? []).map((b) => b.toLowerCase()));
  for (const m of ctx.orig.matchAll(forX)) {
    const name = cleanBrand(m[1]);
    if (name && !excluded.has(name.toLowerCase())) {
      ctx.brief.brandName = name;
      ctx.notes.push(`Guessed the brand name "${name}" from the text.`);
      return;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------------------------

const TIER_WORD: Record<string, CityTier> = { "1": 1, "2": 2, "3": 3, i: 1, ii: 2, iii: 3, one: 1, two: 2, three: 3 };
const TIER_TOKEN = "(?:1|2|3|iii|ii|i|one|two|three)(?![\\p{L}\\p{N}])";
const TIER_RE = new RegExp(
  `(?<![\\p{L}])tier[\\s-]*(${TIER_TOKEN})((?:\\s*(?:\\/|,|&|and|or|aur|-|\\+)\\s*(?:tier[\\s-]*)?${TIER_TOKEN})*)`,
  "gu",
);
const SMALL_TOWN_EXTRAS = ["chhote shehar", "chhote shehron", "chote sheher", "chote shehron", "chhote sheher"];
// Common words or first names that are also city names: only match them when capitalised.
const CASE_SENSITIVE_CITY_TERMS = new Set(["gaya", "anand", "kashi"]);

function addRegions(ctx: Ctx, regions: Region[]): void {
  ctx.brief.targetRegions = uniq([...(ctx.brief.targetRegions ?? []), ...regions]);
}

function addTiers(ctx: Ctx, tiers: CityTier[]): void {
  ctx.brief.targetTiers = uniq([...(ctx.brief.targetTiers ?? []), ...tiers]).sort();
}

function detectGeo(ctx: Ctx): void {
  const panIndia = findAny(ctx.work, PAN_INDIA_ALIASES) !== null;
  ctx.work = blankPhrases(ctx.work, PAN_INDIA_ALIASES);

  // City tiers
  const nonMetro = ["non metro", "non metros", "nonmetro"];
  if (findAny(ctx.work, nonMetro)) {
    addTiers(ctx, [2, 3]);
    ctx.work = blankPhrases(ctx.work, nonMetro);
  }
  if (findPhrase(ctx.work, "bharat")) {
    addTiers(ctx, [2, 3]);
    ctx.notes.push('Read "Bharat" as tier-2 and tier-3 cities.');
    ctx.work = blankPhrases(ctx.work, ["bharat"]);
  }
  TIER_RE.lastIndex = 0;
  for (const m of ctx.work.matchAll(TIER_RE)) {
    const tokens = [m[1], ...(m[2].replace(/tier/g, " ").match(/\b(?:iii|ii|i|one|two|three|1|2|3)\b/g) ?? [])];
    addTiers(ctx, tokens.map((t) => TIER_WORD[t]).filter((t): t is CityTier => t !== undefined));
  }
  ctx.work = blank(ctx.work, TIER_RE);
  for (const tier of CITY_TIER_LIST) {
    const aliases = CITY_TIER_ALIASES[tier].filter((a) => !a.startsWith("tier"));
    const extras = tier === 3 ? SMALL_TOWN_EXTRAS : [];
    if (findAny(ctx.work, [...aliases, ...extras])) addTiers(ctx, [tier]);
  }

  // Regions
  const hindiBelt = findAny(ctx.work, HINDI_BELT_ALIASES) !== null;
  if (hindiBelt) {
    addRegions(ctx, ["north", "central"]);
    ctx.notes.push("Read the Hindi belt as the North and Central regions.");
    ctx.work = blankPhrases(ctx.work, HINDI_BELT_ALIASES);
    ctx.hindiBelt = true;
  }
  const regionExtras: Partial<Record<Region, string[]>> = {
    south: ["southern states", "south indian states", "down south"],
    north: ["northern states", "north indian states"],
    east: ["eastern states"],
    west: ["western states"],
  };
  // Northeast first so "north east India" is not also read as East.
  const regionOrder: Region[] = ["northeast", ...REGION_LIST.filter((r) => r !== "northeast")];
  for (const region of regionOrder) {
    const phrases = [...REGIONS[region].aliases, ...(regionExtras[region] ?? [])];
    if (findAny(ctx.work, phrases)) {
      addRegions(ctx, [region]);
      ctx.work = blankPhrases(ctx.work, phrases);
    }
  }

  // States add their region. Phrases that are also city names (Delhi, Puducherry) count as cities.
  const cityTerms = new Set(CITIES.flatMap((c) => [c.name.toLowerCase(), ...c.aliases]));
  const states: { name: string; region: Region; index: number }[] = [];
  for (const state of STATES) {
    const phrases = uniq([state.name.toLowerCase(), ...state.aliases]).filter((p) => !cityTerms.has(p));
    let hit = findAny(ctx.work, phrases);
    if (!hit) {
      for (const abbr of state.abbr) {
        // "UK" reads as the United Kingdom far more often than Uttarakhand.
        if (abbr === "UK") continue;
        hit = findLiteral(ctx.orig, abbr, "&");
        if (hit) break;
      }
    }
    if (hit) {
      states.push({ name: state.name, region: state.region, index: hit.index });
      ctx.work = blankPhrases(ctx.work, phrases);
    }
  }
  if (states.length > 0) {
    states.sort((a, b) => a.index - b.index);
    const regions = uniq(states.map((s) => s.region));
    addRegions(ctx, regions);
    ctx.notes.push(
      `Mapped ${listText(states.map((s) => s.name))} to the ${listText(regions.map((r) => REGIONS[r].label))} region${regions.length > 1 ? "s" : ""}.`,
    );
  }

  // Cities
  const cityHits: { id: string; index: number }[] = [];
  for (const city of CITIES) {
    let best: Hit | null = null;
    for (const term of [city.name.toLowerCase(), ...city.aliases]) {
      let hit: Hit | null;
      if (CASE_SENSITIVE_CITY_TERMS.has(term)) {
        hit = findLiteral(ctx.orig, term[0].toUpperCase() + term.slice(1));
      } else {
        hit = findPhrase(ctx.work, term);
      }
      if (hit && (!best || hit.index < best.index)) best = hit;
    }
    if (best) {
      cityHits.push({ id: city.id, index: best.index });
      ctx.work = blankPhrases(ctx.work, [city.name.toLowerCase(), ...city.aliases.filter((a) => !CASE_SENSITIVE_CITY_TERMS.has(a))]);
    }
  }
  if (cityHits.length > 0) {
    ctx.brief.targetCityIds = cityHits.sort((a, b) => a.index - b.index).map((c) => c.id);
  }

  if (panIndia) {
    const hasGeo = Boolean(ctx.brief.targetRegions || ctx.brief.targetCityIds || ctx.brief.targetTiers);
    ctx.notes.push(
      hasGeo
        ? "The brief says pan-India but also names specific places; kept the specific targets."
        : "Pan-India: no regional filter applied.",
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Languages, platforms, deliverable, goal
// ---------------------------------------------------------------------------------------------

function detectLanguages(ctx: Ctx): void {
  // Course topics, not audience languages.
  const work = blankPhrases(ctx.work, ["spoken english", "english speaking", "english-speaking course", "english medium"]);
  const hits: { code: LanguageCode; index: number }[] = [];
  for (const code of LANGUAGE_CODES) {
    const hit = findAny(work, LANGUAGES[code].aliases);
    if (hit) hits.push({ code, index: hit.index });
  }
  if (findPhrase(work, "hinglish")) ctx.notes.push('Read "Hinglish" as Hindi + English.');
  if (hits.length > 0) {
    ctx.brief.languages = hits.sort((a, b) => a.index - b.index).map((h) => h.code);
  } else if (ctx.hindiBelt) {
    ctx.brief.languages = ["hi"];
    ctx.notes.push("Suggested Hindi for the Hindi belt; change it if you need other languages.");
  }
  if (findAny(work, ["regional languages", "regional language", "vernacular", "bhasha"]) && hits.length === 0) {
    ctx.notes.push("The brief mentions regional languages: pick the specific languages to filter creators.");
  }
}

function detectPlatformsAndDeliverable(ctx: Ctx): void {
  const platformHits: { platform: Platform; index: number }[] = [];
  for (const platform of PLATFORM_LIST) {
    const hit = findAny(ctx.work, PLATFORMS[platform].aliases);
    if (hit) platformHits.push({ platform, index: hit.index });
  }
  if (platformHits.length > 0) {
    ctx.brief.platforms = platformHits.sort((a, b) => a.index - b.index).map((h) => h.platform);
  }

  // "post-Diwali" or "post-launch" is a time, not a deliverable.
  const work = ctx.work.replace(/\bpost-(?=\p{L})/gu, "     ");
  let best: { deliverable: Deliverable; hit: Hit } | null = null;
  for (const deliverable of DELIVERABLE_LIST) {
    const hit = findAny(work, DELIVERABLES[deliverable].aliases, true);
    if (hit && (!best || hit.index < best.hit.index || (hit.index === best.hit.index && hit.length > best.hit.length))) {
      best = { deliverable, hit };
    }
  }
  if (best) {
    ctx.brief.deliverable = best.deliverable;
  } else if (ctx.brief.platforms?.includes("youtube") && findPhrase(ctx.work, "video", true)) {
    ctx.brief.deliverable = "video";
    ctx.notes.push("Read YouTube videos as a long-form YouTube integration.");
  }
}

// Most specific first: a brief that mentions both a launch and installs is an install campaign.
const GOAL_PRIORITY: CampaignGoal[] = ["ugc", "app_installs", "conversions", "consideration", "awareness"];

function detectGoal(ctx: Ctx): void {
  const work = ctx.work
    .replace(/\d[\d,.]*\s*(?:k|l|lakh|m|million)?\s*\+?\s*followers/g, (m) => " ".repeat(m.length))
    .replace(/\b(?:good|high|strong|great|genuine|real|organic|authentic|decent|solid)\s+engagement\b/g, (m) => " ".repeat(m.length))
    .replace(/\breach\s+out\b/g, "         ");
  for (const goal of GOAL_PRIORITY) {
    if (findAny(work, GOALS[goal].aliases)) {
      ctx.brief.goal = goal;
      return;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Audience: gender and ages
// ---------------------------------------------------------------------------------------------

const GENDER_TERMS: Record<Gender, string[]> = {
  female: [
    "women", "woman", "female", "females", "girls", "girl", "ladies", "moms", "mums", "mothers", "mommies", "homemakers",
    "housewives", "brides", "ladkiyan", "ladkiyon", "mahila", "mahilaon", "mahilayen", "auraton", "aurat",
  ],
  male: ["men", "male", "males", "boys", "guys", "dads", "fathers", "gents", "grooms", "ladke", "ladkon", "purush"],
};

function detectGender(ctx: Ctx): void {
  if (findAny(ctx.work, ["unisex", "all genders", "both genders", "men and women", "women and men"])) {
    ctx.brief.targetGender = "any";
    return;
  }
  const female = findAny(ctx.work, GENDER_TERMS.female) !== null;
  const male = findAny(ctx.work, GENDER_TERMS.male) !== null;
  if (female && male) {
    ctx.brief.targetGender = "any";
    ctx.notes.push("Both women and men are mentioned, so gender is left open.");
  } else if (female) {
    ctx.brief.targetGender = "female";
  } else if (male) {
    ctx.brief.targetGender = "male";
  }
}

const BAND_RANGES: Record<AgeBand, [number, number]> = {
  "13-17": [13, 17],
  "18-24": [18, 24],
  "25-34": [25, 34],
  "35-44": [35, 44],
  "45+": [45, 120],
};
const AGE_RANGE_RE =
  /(?<![\d.,])(\d{2})\s*(?:-|to|se|–)\s*(\d{2})(?![\d%])(?!\s*(?:k|l|lakh|lakhs|cr|crore|%|days?|months?|mins?|minutes?|seconds?|secs?|hours?|hrs?|creators?|influencers?|reels?|posts?|videos?|stories)\b)/g;
const AGE_PLUS_RE =
  /\b(?:aged?|ages|age group)\s*(\d{2})\s*\+|(?<![\d.,])(\d{2})\s*\+\s*(?:age|aged|years?|yrs?|women|men|girls|boys|audience|adults?)\b/g;
const AGE_PHRASES: { phrases: string[]; bands: AgeBand[]; note: string }[] = [
  { phrases: ["gen z", "genz", "gen-z"], bands: ["18-24"], note: 'Read "Gen Z" as ages 18-24.' },
  { phrases: ["millennials", "millennial"], bands: ["25-34", "35-44"], note: 'Read "millennials" as ages 25-44.' },
  {
    phrases: ["college students", "college goers", "college-goers", "college going", "college-going"],
    bands: ["18-24"],
    note: 'Read "college students" as ages 18-24.',
  },
  {
    phrases: ["working professionals", "young professionals", "salaried professionals"],
    bands: ["25-34", "35-44"],
    note: 'Read "working professionals" as ages 25-44.',
  },
  { phrases: ["teens", "teenagers"], bands: ["13-17"], note: 'Read "teens" as ages 13-17.' },
  { phrases: ["youth", "young adults"], bands: ["18-24"], note: 'Read "youth" as ages 18-24.' },
];

function bandsForRange(low: number, high: number): AgeBand[] {
  return (Object.keys(BAND_RANGES) as AgeBand[]).filter((band) => {
    const [min, max] = BAND_RANGES[band];
    return low <= max && high >= min;
  });
}

function detectAges(ctx: Ctx): void {
  const bands = new Set<AgeBand>();
  AGE_RANGE_RE.lastIndex = 0;
  for (const m of ctx.work.matchAll(AGE_RANGE_RE)) {
    const low = Number(m[1]);
    const high = Number(m[2]);
    if (low < 13 || high > 80 || low >= high) continue;
    const mapped = bandsForRange(low, high);
    mapped.forEach((b) => bands.add(b));
    const aligned = BAND_RANGES[mapped[0]][0] === low && BAND_RANGES[mapped[mapped.length - 1]][1] === high;
    if (!aligned) ctx.notes.push(`Mapped ages ${low}-${high} to the ${listText(mapped)} age bands.`);
  }
  AGE_PLUS_RE.lastIndex = 0;
  for (const m of ctx.work.matchAll(AGE_PLUS_RE)) {
    const low = Number(m[1] ?? m[2]);
    if (low < 13 || low > 80) continue;
    bandsForRange(low, 120).forEach((b) => bands.add(b));
  }
  for (const { phrases, bands: phraseBands, note } of AGE_PHRASES) {
    if (findAny(ctx.work, phrases)) {
      phraseBands.forEach((b) => bands.add(b));
      ctx.notes.push(note);
    }
  }
  if (bands.size > 0) {
    ctx.brief.targetAges = (Object.keys(BAND_RANGES) as AgeBand[]).filter((b) => bands.has(b));
  }
}

// ---------------------------------------------------------------------------------------------
// Creator tiers and niches
// ---------------------------------------------------------------------------------------------

function detectCreatorTiers(ctx: Ctx): void {
  const tiers: CreatorTier[] = CREATOR_TIER_LIST.filter((tier) => findAny(ctx.work, CREATOR_TIERS[tier].aliases, true));
  if (tiers.length > 0) ctx.brief.creatorTiers = tiers;
}

// Keywords too generic to establish a niche on their own ("app", "Diwali", "students").
const WEAK_KEYWORDS = new Set([
  "app", "ai", "cat", "gate", "home", "money", "phone", "style", "glow", "nail", "school", "jobs", "college", "students",
  "student", "family", "living", "relatable", "reviews", "celebrity", "festival", "festive", "diwali", "navratri",
  "pongal", "onam", "eid", "durga puja", "puja", "pooja", "culture", "tradition", "rural", "village", "gold", "tax", "learning", "mom",
  "moms", "mother", "dad", "kids", "children", "parents", "d2c", "ev", "evs", "kitchen", "sleep", "trip", "drinks",
  "song", "songs", "music", "movie", "movies", "watches", "bags", "accessories", "savings", "dance", "sport", "career",
]);
const WEAK_WEIGHT = 0.35;
const MAX_NICHES = 3;

function detectNiches(ctx: Ctx): void {
  const scored: { niche: Niche; score: number; index: number }[] = [];
  let product: { term: string; index: number; length: number } | null = null;
  for (const niche of NICHES) {
    let score = 0;
    let first = Infinity;
    for (const keyword of NICHE_KEYWORDS[niche]) {
      const hit = findPhrase(ctx.work, keyword, true);
      if (!hit) continue;
      const weak = WEAK_KEYWORDS.has(keyword);
      score += weak ? WEAK_WEIGHT : 1;
      first = Math.min(first, hit.index);
      if (!weak && (!product || hit.index < product.index || (hit.index === product.index && hit.length > product.length))) {
        product = { term: keyword, index: hit.index, length: hit.length };
      }
    }
    if (score >= 1) scored.push({ niche, score, index: first });
  }
  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    ctx.brief.niches = scored.slice(0, MAX_NICHES).map((s) => s.niche);
  }
  if (product) ctx.brief.productCategory = product.term;
}
