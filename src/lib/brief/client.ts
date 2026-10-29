// Browser client for /api/parse-brief. Any failure (no function under `vite dev`, no API key, a
// timeout, a malformed reply) falls back to the local rules parser, so the brief flow always works.
import type { ParsedBrief } from "../../types";
import { parseBriefWithRules } from "./rules";
import { parsedBriefSchema } from "./schema";

const ENDPOINT = "/api/parse-brief";
const TIMEOUT_MS = 25_000;
const MAX_AI_LENGTH = 4000;

export const AI_FALLBACK_NOTE = "AI parsing isn't available right now, so the built-in parser read your brief.";

function withNote(parsed: ParsedBrief, note: string): ParsedBrief {
  return { ...parsed, notes: [note, ...parsed.notes] };
}

function abortError(): DOMException {
  return new DOMException("The brief parse was cancelled.", "AbortError");
}

/** Parses a free-text brief with Claude via /api/parse-brief, falling back to the local rules parser. */
export async function parseBrief(text: string, options: { signal?: AbortSignal } = {}): Promise<ParsedBrief> {
  const { signal } = options;
  if (signal?.aborted) throw abortError();

  const trimmed = text.trim();
  if (!trimmed) return parseBriefWithRules(text);
  if (trimmed.length > MAX_AI_LENGTH) {
    return withNote(parseBriefWithRules(text), "Briefs over 4,000 characters are read by the built-in parser.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener("abort", onCallerAbort, { once: true });

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ text: trimmed }),
      signal: controller.signal,
    });
    if (response.ok) {
      const body: unknown = await response.json();
      const result = parsedBriefSchema.safeParse((body as { parsed?: unknown } | null)?.parsed);
      if (result.success) return result.data as ParsedBrief;
    }
  } catch {
    // Handled below: a caller abort rethrows, everything else falls back.
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }

  if (signal?.aborted) throw abortError();
  return withNote(parseBriefWithRules(text), AI_FALLBACK_NOTE);
}
