import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_FALLBACK_NOTE, parseBrief } from "./client";

const TEXT = "Skincare launch for women 18-34 in Chennai, budget ₹3 lakh";

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("parseBrief", () => {
  it("returns the AI result on success", async () => {
    const parsed = { brief: { brandName: "Glowleaf", niches: ["beauty"] }, source: "ai", notes: [], detectedFields: ["brandName", "niches"] };
    const fetchMock = respond(200, { parsed });
    vi.stubGlobal("fetch", fetchMock);
    await expect(parseBrief(TEXT)).resolves.toEqual(parsed);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/parse-brief");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ text: TEXT });
  });

  it.each([
    ["404 under vite dev", respond(404, { error: "not_found" })],
    ["503 without a key", respond(503, { error: "ai_unavailable" })],
    ["malformed body", respond(200, { parsed: { brief: { niches: ["astrophysics"] } } })],
    ["network error", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch")))],
  ])("falls back to the rules parser on %s", async (_label, fetchMock) => {
    vi.stubGlobal("fetch", fetchMock);
    const result = await parseBrief(TEXT);
    expect(result.source).toBe("rules");
    expect(result.notes[0]).toBe(AI_FALLBACK_NOTE);
    expect(result.brief.budgetINR).toBe(300_000);
    expect(result.brief.targetCityIds).toEqual(["chennai"]);
  });

  it("falls back after the 25 second timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))),
      ),
    );
    const pending = parseBrief(TEXT);
    await vi.advanceTimersByTimeAsync(25_000);
    const result = await pending;
    expect(result.source).toBe("rules");
    expect(result.notes[0]).toBe(AI_FALLBACK_NOTE);
  });

  it("rethrows when the caller aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))),
      ),
    );
    const controller = new AbortController();
    const pending = parseBrief(TEXT, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("skips the network for empty text", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(parseBrief("  ")).resolves.toEqual({ brief: {}, source: "rules", notes: [], detectedFields: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
