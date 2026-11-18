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
