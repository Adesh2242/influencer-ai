// Text similarity for the niche score. Briefs and creators become sparse term vectors:
//   n:<niche>   niche signals, expanded from NICHE_KEYWORDS so "sunscreen" and "skincare" meet at "beauty"
//   k:<phrase>  a NICHE_KEYWORDS phrase found in the text ("street food", "sip")
//   t:<token>   any other content word, weighted low
// and are compared with cosine similarity. Place, language, platform and boilerplate words are dropped:
// they have their own score components and would otherwise be counted twice.
import {
  CITIES,
  DELIVERABLES,
  GOALS,
  LANGUAGES,
  NICHE_KEYWORDS,
  NICHES,
  PLATFORMS,
  REGIONS,
  STATES,
} from "../../data/taxonomy";
import type { Creator, Niche } from "../../types";

export interface TextProfile {
  terms: Map<string, number>;
  norm: number;
  /** NICHE_KEYWORDS phrases found, for explanations. */
  keywords: Set<string>;
}

const TOKEN_PATTERN = /[\p{L}\p{M}\p{N}]+/gu;

/** Light plural folding so "recipes" meets "recipe". Applied to briefs and creators alike. */
export function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(?:ches|shes|sses|xes|zes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !/(?:ss|us|is)$/.test(token)) return token.slice(0, -1);
  return token;
}

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const match of text.normalize("NFKC").toLowerCase().matchAll(TOKEN_PATTERN)) tokens.push(stem(match[0]));
  return tokens;
}

interface KeywordEntry {
  phrase: string;
  tokens: string[];
  niches: Niche[];
  /** Keywords shared by several niches say less about any one of them. */
  weight: number;
}

const KEYWORDS_BY_PHRASE = new Map<string, KeywordEntry>();
for (const niche of NICHES) {
  for (const phrase of NICHE_KEYWORDS[niche]) {
    const entry = KEYWORDS_BY_PHRASE.get(phrase) ?? { phrase, tokens: tokenize(phrase), niches: [], weight: 1 };
    if (!entry.niches.includes(niche)) entry.niches.push(niche);
    KEYWORDS_BY_PHRASE.set(phrase, entry);
  }
}
for (const entry of KEYWORDS_BY_PHRASE.values()) entry.weight = entry.niches.length === 1 ? 1 : entry.niches.length === 2 ? 0.75 : 0.6;

/** Candidate keywords by first token, longest first so "street food" wins over "food". */
const KEYWORDS_BY_FIRST_TOKEN = new Map<string, KeywordEntry[]>();
for (const entry of KEYWORDS_BY_PHRASE.values()) {
  if (entry.tokens.length === 0) continue;
  const list = KEYWORDS_BY_FIRST_TOKEN.get(entry.tokens[0]) ?? [];
  list.push(entry);
  KEYWORDS_BY_FIRST_TOKEN.set(entry.tokens[0], list);
}
for (const list of KEYWORDS_BY_FIRST_TOKEN.values()) list.sort((a, b) => b.tokens.length - a.tokens.length);

const STOPWORDS = new Set(
  [
    // English
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "for", "from", "has", "have", "in", "into",
    "is", "it", "its", "of", "on", "or", "our", "ours", "so", "that", "the", "their", "them", "they", "this", "to",
    "us", "was", "we", "who", "will", "with", "you", "your", "all", "any", "also", "each", "more", "most", "very",
    "just", "like", "about", "over", "under", "per", "than", "then", "there", "these", "those", "what", "when",
    "which", "while", "would", "should", "could", "want", "need", "needs", "looking", "please", "ideally", "around",
    "across", "within", "only", "both", "other", "new", "every", "week", "weeks", "month", "months", "day", "days",
    "year", "years", "time", "make", "making", "get", "help", "help", "helps", "share", "sharing", "show", "showing",
    // Hinglish connectors
    "hai", "hain", "ka", "ki", "ke", "ko", "se", "mein", "me", "aur", "ya", "bhi", "jo", "hum", "hume", "humein",
    "chahiye", "wale", "wali", "liye", "kar", "karo", "karein", "karna", "ek", "yeh", "ye", "woh", "nahi", "acha",
    // Campaign boilerplate
    "brand", "brands", "campaign", "campaigns", "creator", "creators", "influencer", "influencers", "content",
    "post", "posts", "based", "budget", "lakh", "lakhs", "crore", "crores", "rs", "inr", "rupee", "rupees", "target",
    "targeting", "audience", "audiences", "launch", "launching", "product", "products", "people", "user", "users",
    "women", "woman", "men", "man", "female", "male", "girl", "boy", "age", "aged", "tier", "city", "cities", "town",
    "towns", "region", "regions", "india", "indian", "bharat", "national", "local", "followers", "follower",
    "engagement", "reach", "views", "video", "videos", "collab", "collaboration", "collaborations", "deliverable",
    "deliverables", "goal", "goals", "awareness", "sales", "install", "installs", "download", "downloads",
  ].map(stem),
);

/** Words that name a place, language, platform, format or goal: other components already score these. */
const OTHER_COMPONENT_TOKENS = new Set<string>();
const addTokens = (phrases: Iterable<string>) => {
  for (const phrase of phrases) for (const token of tokenize(phrase)) OTHER_COMPONENT_TOKENS.add(token);
};
addTokens(Object.values(LANGUAGES).flatMap((language) => [language.label, ...language.aliases]));
addTokens(CITIES.flatMap((city) => [city.name, city.id, ...city.aliases]));
addTokens(STATES.flatMap((state) => [state.name, ...state.aliases]));
addTokens(Object.values(REGIONS).flatMap((region) => [region.label, ...region.aliases]));
addTokens(Object.values(PLATFORMS).flatMap((platform) => [platform.label, ...platform.aliases]));
addTokens(Object.values(DELIVERABLES).flatMap((deliverable) => deliverable.aliases));
addTokens(Object.values(GOALS).flatMap((goal) => goal.aliases));

const NICHE_EXPANSION_WEIGHT = 1.5;
const CONTENT_TOKEN_WEIGHT = 0.35;

function addTerm(terms: Map<string, number>, term: string, weight: number): void {
  terms.set(term, Math.max(terms.get(term) ?? 0, weight));
}

function keywordsIn(tokens: string[]): { found: Map<KeywordEntry, number>; covered: Uint8Array } {
  const found = new Map<KeywordEntry, number>();
  const covered = new Uint8Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    const candidates = KEYWORDS_BY_FIRST_TOKEN.get(tokens[i]);
    if (!candidates) continue;
    for (const entry of candidates) {
      const length = entry.tokens.length;
      let matches = i + length <= tokens.length;
      for (let j = 1; matches && j < length; j++) matches = tokens[i + j] === entry.tokens[j];
      if (!matches) continue;
      found.set(entry, (found.get(entry) ?? 0) + 1);
      covered.fill(1, i, i + length);
      i += length - 1;
      break;
    }
  }
  return { found, covered };
}

function contentTokens(tokens: string[], covered: Uint8Array): string[] {
  return tokens.filter(
    (token, i) => !covered[i] && token.length >= 3 && !/^\d+$/.test(token) && !STOPWORDS.has(token) && !OTHER_COMPONENT_TOKENS.has(token),
  );
}

function finish(terms: Map<string, number>, keywords: Set<string>): TextProfile {
  let sum = 0;
  for (const weight of terms.values()) sum += weight * weight;
  return { terms, norm: Math.sqrt(sum), keywords };
}

/** Profile of a brief's free text, or null when it says nothing about content. */
export function briefTextProfile(text: string): TextProfile | null {
  const tokens = tokenize(text);
  const { found, covered } = keywordsIn(tokens);
  const terms = new Map<string, number>();
  const keywords = new Set<string>();
  const nicheMass = new Map<Niche, number>();
  for (const entry of found.keys()) {
    addTerm(terms, `k:${entry.phrase}`, entry.weight);
    keywords.add(entry.phrase);
    for (const niche of entry.niches) nicheMass.set(niche, (nicheMass.get(niche) ?? 0) + entry.weight);
  }
  for (const [niche, mass] of nicheMass) addTerm(terms, `n:${niche}`, Math.min(2, mass) * NICHE_EXPANSION_WEIGHT);
  for (const token of contentTokens(tokens, covered)) addTerm(terms, `t:${token}`, CONTENT_TOKEN_WEIGHT);
  return terms.size > 0 ? finish(terms, keywords) : null;
}

const NICHE_POSITION_WEIGHT = [2, 1.2, 0.9];
const creatorProfiles = new WeakMap<Creator, TextProfile>();

/** Profile of a creator's niches, topics and bio. Cached per creator object. */
export function creatorTextProfile(creator: Creator): TextProfile {
  const cached = creatorProfiles.get(creator);
  if (cached) return cached;

  const terms = new Map<string, number>();
  const keywords = new Set<string>();
  const nicheMass = new Map<Niche, number>();
  creator.niches.forEach((niche, i) => nicheMass.set(niche, NICHE_POSITION_WEIGHT[i] ?? 0.8));

  const bump = (entry: KeywordEntry, weight: number) => {
    addTerm(terms, `k:${entry.phrase}`, weight);
    keywords.add(entry.phrase);
    for (const niche of entry.niches) nicheMass.set(niche, (nicheMass.get(niche) ?? 0) + 0.3 * weight);
  };
  for (const topic of creator.topics) {
    const entry = KEYWORDS_BY_PHRASE.get(topic.toLowerCase());
    if (entry) bump(entry, 1);
    else for (const token of contentTokens(tokenize(topic), new Uint8Array(0))) addTerm(terms, `t:${token}`, 0.6);
  }
  const bioTokens = tokenize(creator.bio);
  const { found, covered } = keywordsIn(bioTokens);
  for (const entry of found.keys()) bump(entry, 0.6);
  for (const token of contentTokens(bioTokens, covered)) addTerm(terms, `t:${token}`, CONTENT_TOKEN_WEIGHT);
  for (const [niche, mass] of nicheMass) addTerm(terms, `n:${niche}`, Math.min(3.2, mass) * NICHE_EXPANSION_WEIGHT * 0.66);

  const profile = finish(terms, keywords);
  creatorProfiles.set(creator, profile);
  return profile;
}

/** Cosine similarity in [0, 1]. */
export function textSimilarity(a: TextProfile, b: TextProfile): number {
  if (a.norm === 0 || b.norm === 0) return 0;
  const [small, large] = a.terms.size <= b.terms.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small.terms) {
    const other = large.terms.get(term);
    if (other !== undefined) dot += weight * other;
  }
  return Math.min(1, dot / (a.norm * b.norm));
}

/** Keyword phrases both profiles mention, most specific first. */
export function sharedKeywords(a: TextProfile, b: TextProfile, limit = 3): string[] {
  const shared: string[] = [];
  for (const phrase of a.keywords) if (b.keywords.has(phrase)) shared.push(phrase);
  return shared
    .sort((x, y) => (KEYWORDS_BY_PHRASE.get(y)?.weight ?? 0) - (KEYWORDS_BY_PHRASE.get(x)?.weight ?? 0) || x.localeCompare(y))
    .slice(0, limit);
}
