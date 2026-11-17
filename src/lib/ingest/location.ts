// Decides whether a creator is based in Maharashtra from the words on their channel.
//
// No platform API returns an Indian state. YouTube's snippet.country is "IN" at best, and Instagram
// returns nothing at all, so the state has to be read out of the creator's own self-description.
// That is a guess, and the verdict carries both a confidence and the evidence behind it so the UI
// can show a brand why a creator was placed in Maharashtra rather than asserting it silently.
import {
  DEVANAGARI,
  LOCATION_MARKERS,
  MARATHI_MARKERS,
  MH_PLACES,
  MH_STATE_ALIASES,
  type MhPlace,
} from "../../data/maharashtra";

/**
 * strong  - the creator states where they are ("based in Pune", "📍Nagpur", "Thane, India").
 * likely  - a Maharashtra place appears in their own bio, without a phrase framing it as home.
 * weak    - only their video titles mention the place; they may just have filmed there.
 * none    - nothing found.
 */
export type LocationConfidence = "strong" | "likely" | "weak" | "none";

export interface LocationVerdict {
  inMaharashtra: boolean;
  confidence: LocationConfidence;
  /** The most specific Maharashtra place found, when one was. */
  place?: MhPlace;
  /** Matching city id from data/taxonomy.ts, when the place maps to a known city. */
  cityId?: string;
  /** Short quotes showing what the verdict was based on, for display next to the creator. */
  evidence: string[];
  /** Marathi-language signals in the channel's own text. A language signal, not a location one. */
  marathiContent: boolean;
}

export interface LocationInput {
  /** Channel title. */
  title: string;
  /** Channel description, which is where creators usually put a city. */
  description: string;
  /** brandingSettings.channel.keywords, when the API returns it. */
  keywords?: string;
  /** Recent video titles. Weak evidence: a Mumbai video does not make a Mumbai creator. */
  videoTitles?: string[];
  /** snippet.country. A country other than IN rules Maharashtra out. */
  country?: string;
}

const RANK: Record<LocationConfidence, number> = { none: 0, weak: 1, likely: 2, strong: 3 };

/** Characters that sit next to a place name without being part of it. */
const BOUNDARY = "[^\\p{L}\\p{N}]";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds `needle` as a whole word. Unicode-aware so Devanagari spellings match: JavaScript's \b only
 * understands ASCII word characters and would treat every Devanagari string as unbounded.
 */
function findWord(haystack: string, needle: string): number {
  const pattern = new RegExp(`(?:^|${BOUNDARY})(${escapeRegex(needle)})(?:$|${BOUNDARY})`, "iu");
  const match = pattern.exec(haystack);
  return match ? match.index : -1;
}

/** True when a location marker, a pin emoji or a "City, India" pattern sits around the match. */
function hasLocationFraming(text: string, at: number, needle: string): boolean {
  const before = text.slice(Math.max(0, at - 36), at + needle.length).toLowerCase();
  const after = text.slice(at, Math.min(text.length, at + needle.length + 24)).toLowerCase();

  if (/[📍🏠🏡🇮🇳]/u.test(before)) return true;
  if (LOCATION_MARKERS.some((marker) => before.includes(marker))) return true;
  // "Pune, India" / "Thane, Maharashtra" / "Nagpur, MH"
  if (/,\s*(india|maharashtra|mh|भारत|महाराष्ट्र)/i.test(after)) return true;
  return false;
}

interface Hit {
  place?: MhPlace;
  confidence: LocationConfidence;
  evidence: string;
  specificity: number;
}

/** Trims a window of text around a match for display as evidence. */
function quote(text: string, at: number, length: number): string {
  const start = Math.max(0, at - 24);
  const end = Math.min(text.length, at + length + 24);
  const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${snippet}${end < text.length ? "…" : ""}`;
}

function scan(text: string, source: "bio" | "videos", hits: Hit[]): void {
  if (!text) return;

  for (const place of MH_PLACES) {
    const names = [place.name.toLowerCase(), ...place.aliases];
    for (const name of names) {
      const at = findWord(text, name);
      if (at < 0) continue;

      const framed = hasLocationFraming(text, at, name);
      // An ambiguous name ("Mira", "Bhandara") is only evidence when something frames it as a place.
      if (place.ambiguous && !framed) continue;

      const confidence: LocationConfidence = source === "videos" ? "weak" : framed ? "strong" : "likely";
      hits.push({
        place,
        confidence,
        evidence: `${source === "videos" ? "Video title" : "Bio"}: "${quote(text, at, name.length)}"`,
        // Prefer the longest matched spelling, so "Navi Mumbai" wins over "Mumbai".
        specificity: name.length,
      });
      break;
    }
  }

  for (const alias of MH_STATE_ALIASES) {
    const at = findWord(text, alias);
    if (at < 0) continue;
    const framed = hasLocationFraming(text, at, alias);
    hits.push({
      confidence: source === "videos" ? "weak" : framed ? "strong" : "likely",
      evidence: `${source === "videos" ? "Video title" : "Bio"}: "${quote(text, at, alias.length)}"`,
      specificity: 0,
    });
    break;
  }
}

/** True when the text carries letters or words that occur in Marathi but not in Hindi. */
export function looksMarathi(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (!DEVANAGARI.test(text) && !lower.includes("marathi")) return false;
  return MARATHI_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}

export function detectMaharashtra(input: LocationInput): LocationVerdict {
  const bio = [input.title, input.description, input.keywords ?? ""].join("\n");
  const videos = (input.videoTitles ?? []).join("\n");

  const marathiContent = looksMarathi(bio) || looksMarathi(videos);

  // A channel that declares a country other than India is not based in Maharashtra, whatever its
  // bio mentions. An absent country tells us nothing: most channels never set it.
  if (input.country && input.country.toUpperCase() !== "IN") {
    return {
      inMaharashtra: false,
      confidence: "none",
      evidence: [`Channel country is ${input.country.toUpperCase()}, not IN`],
      marathiContent,
    };
  }

  const hits: Hit[] = [];
  scan(bio, "bio", hits);
  scan(videos, "videos", hits);

  if (hits.length === 0) {
    return { inMaharashtra: false, confidence: "none", evidence: [], marathiContent };
  }

  hits.sort((a, b) => RANK[b.confidence] - RANK[a.confidence] || b.specificity - a.specificity);
  const best = hits[0];

  return {
    inMaharashtra: true,
    confidence: best.confidence,
    place: best.place,
    cityId: best.place?.cityId,
    // Keep a few supporting quotes, strongest first, without repeating the same sentence.
    evidence: [...new Set(hits.map((hit) => hit.evidence))].slice(0, 4),
    marathiContent,
  };
}
