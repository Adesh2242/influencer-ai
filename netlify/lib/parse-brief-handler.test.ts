import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleParseBrief, type BriefModelClient } from "./parse-brief-handler";

const OUTPUT = {
  brandName: "Glowleaf Naturals",
  productCategory: "vitamin C serum",
  goal: "awareness",
  niches: ["beauty"],
  languages: ["ta", "te"],
  platforms: ["instagram"],
  deliverable: "reel",
  targetGender: "female",
  targetAges: ["18-24", "25-34"],
  targetTiers: [],
  targetRegions: ["south"],
  targetCities: ["Madras", "Gotham"],
  creatorTiers: ["micro"],
  budgetINR: 300000,
  creatorsWanted: 8,
  minAuthenticity: 80,
  minEngagementRate: 0,
  excludeBrands: [],
  notes: ["Read 3 lakh as ₹3,00,000."],
};

function post(body: unknown, raw = false): Request {
  return new Request("https://example.test/api/parse-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

function fakeClient(create: (...args: unknown[]) => Promise<unknown>) {
  const spy = vi.fn(create);
  const client = { beta: { messages: { create: spy } } } as unknown as BriefModelClient;
  return { spy, deps: { apiKey: "test-key", createClient: () => client } };
}

const message = (text: string, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text }] });

afterEach(() => vi.restoreAllMocks());

describe("handleParseBrief", () => {
  it("rejects non-POST methods with 405 and an Allow header", async () => {
    const res = await handleParseBrief(new Request("https://example.test/api/parse-brief"), { apiKey: "k" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([
    ["bad JSON", post("{nope", true)],
    ["a non-string text", post({ text: 42 })],
    ["empty text", post({ text: "   " })],
    ["text over 4000 characters", post({ text: "a".repeat(4001) })],
  ])("returns 400 for %s", async (_label, req) => {
    const res = await handleParseBrief(req, { apiKey: "k" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_request" });
  });

  it("returns 503 when no API key is configured", async () => {
    const res = await handleParseBrief(post({ text: "Skincare launch" }), {});
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "ai_unavailable" });
  });

  it("returns the parsed brief on success", async () => {
    const { spy, deps } = fakeClient(async () => message(JSON.stringify(OUTPUT)));
    const res = await handleParseBrief(post({ text: "  Glowleaf serum launch in Madras  " }), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const { parsed } = await res.json();
    expect(parsed.source).toBe("ai");
    expect(parsed.brief).toMatchObject({
      brandName: "Glowleaf Naturals",
      description: "Glowleaf serum launch in Madras",
      targetCityIds: ["chennai"],
      budgetINR: 300000,
      creatorsWanted: 8,
    });
    expect(parsed.brief.targetTiers).toBeUndefined();
    expect(parsed.notes.join(" ")).toMatch(/Gotham/);

    const params = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(params).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 4096,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema" } },
      messages: [{ role: "user", content: "Glowleaf serum launch in Madras" }],
    });
    expect(params).not.toHaveProperty("thinking");
    expect(params).not.toHaveProperty("temperature");
  });

  it.each(["refusal", "max_tokens"])("returns 502 when the model stops with %s", async (reason) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = fakeClient(async () => message("", reason));
    const res = await handleParseBrief(post({ text: "brief" }), deps);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "ai_failed" });
  });

  it("returns 502 when the output fails validation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = fakeClient(async () => message(JSON.stringify({ ...OUTPUT, niches: ["astrophysics"] })));
    expect((await handleParseBrief(post({ text: "brief" }), deps)).status).toBe(502);
  });

  it.each([
    ["authentication", () => new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers()), 503],
    ["rate limit", () => new Anthropic.RateLimitError(429, undefined, "slow down", new Headers()), 429],
    ["timeout", () => new Anthropic.APIConnectionTimeoutError(), 504],
    ["connection", () => new Anthropic.APIConnectionError({ message: "offline" }), 504],
    ["server", () => new Anthropic.InternalServerError(500, undefined, "boom", new Headers()), 502],
    ["unknown", () => new Error("weird"), 502],
  ] as const)("maps a %s error", async (_label, makeError, status) => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = fakeClient(async () => {
      throw makeError();
    });
    const res = await handleParseBrief(post({ text: "secret campaign text" }), deps);
    expect(res.status).toBe(status);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("secret campaign text");
  });
});
