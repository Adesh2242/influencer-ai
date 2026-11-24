/**
 * Repairs text that JavaScript accepts but Postgres will not store.
 *
 * A JavaScript string is a sequence of UTF-16 code units, and slicing one by index can cut an
 * emoji's surrogate pair in half. The result is a lone surrogate: legal in JS, and JSON.stringify
 * emits it happily as \udXXX. Postgres then rejects the whole value with "Unicode low surrogate
 * must follow a high surrogate", which took down an ingest run of 149 creators because one bio
 * had an emoji at the wrong offset.
 */
export function wellFormed(text: string): string {
  // toWellFormed is ES2024 and present in Node 22 and current browsers; the regex is the fallback.
  const native = (text as string & { toWellFormed?: () => string }).toWellFormed;
  if (typeof native === "function") return native.call(text);
  return text.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "�",
  );
}

/**
 * Slices without leaving a half-formed character behind. Use wherever a snippet is cut out of text
 * that came from a platform, which is to say text that will contain emoji.
 */
export function safeSlice(text: string, start: number, end?: number): string {
  return wellFormed(text.slice(start, end));
}

/** Applies wellFormed to every string in a value, however deeply nested. */
export function wellFormedDeep<T>(value: T): T {
  if (typeof value === "string") return wellFormed(value) as T;
  if (Array.isArray(value)) return value.map((item) => wellFormedDeep(item)) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = wellFormedDeep(item);
    }
    return out as T;
  }
  return value;
}

/**
 * What counts as the edge of a word. Marks (\p{M}) are inside a word, not between words: Devanagari
 * joins consonants with a virama, which is a combining mark, so a class of just letters and digits
 * splits नमस्कार into "नमस्" and "कार" and then matches "कार" -- "car" -- as a whole word. That is
 * the exact bug this helper was added to fix, surviving inside the fix.
 */
const BOUNDARY = "[^\\p{L}\\p{N}\\p{M}]";

// These run inside the matching loop, over the whole catalogue, so the compiled form is kept.
// Building a RegExp per word per creator per match was enough on its own to blow the engine's
// 15 ms budget for a full-dataset match.
const wordCache = new Map<string, RegExp>();
const leadingCache = new Map<string, RegExp>();

function cached(cache: Map<string, RegExp>, needle: string, build: (escaped: string) => string): RegExp {
  let re = cache.get(needle);
  if (!re) {
    re = new RegExp(build(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "iu");
    cache.set(needle, re);
  }
  return re;
}

/**
 * Whole-word containment. Substring matching is how an ascetic monk acquired an "Auto & EVs" tag:
 * "auto" sits inside unrelated words, "car" inside "Ambedkarite", "ev" inside "achievement".
 */
export function containsWord(haystack: string, needle: string): boolean {
  return cached(wordCache, needle, (escaped) => `(?:^|${BOUNDARY})${escaped}(?:$|${BOUNDARY})`).test(haystack);
}

/** True when `needle` is the first word of `haystack` — the position an honorific occupies. */
export function startsWithWord(haystack: string, needle: string): boolean {
  return cached(leadingCache, needle, (escaped) => `^${BOUNDARY}*${escaped}(?:$|${BOUNDARY})`).test(haystack.trim());
}
