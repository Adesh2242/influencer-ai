import { describe, expect, it } from "vitest";
import { FICTIONAL_BRANDS, creators } from "./creators";
import { SAMPLE_BRIEFS } from "./sampleBriefs";
import { CITY_BY_ID } from "./taxonomy";
import { matchCreators } from "../lib/matching/engine";

describe("sample briefs", () => {
  it("has 5-6 briefs with unique ids and complete structured briefs", () => {
    expect(SAMPLE_BRIEFS.length).toBeGreaterThanOrEqual(5);
    expect(SAMPLE_BRIEFS.length).toBeLessThanOrEqual(6);
    expect(new Set(SAMPLE_BRIEFS.map((s) => s.id)).size).toBe(SAMPLE_BRIEFS.length);
    for (const { id, title, text, brief } of SAMPLE_BRIEFS) {
      expect(title.length, id).toBeGreaterThan(5);
      expect(brief.description).toBe(text);
      expect(brief.brandName, id).not.toBe("");
      expect(text, id).toContain(brief.brandName);
      expect(brief.niches.length, id).toBeGreaterThan(0);
      expect(brief.platforms.length, id).toBeGreaterThan(0);
      expect(brief.budgetINR, id).toBeGreaterThan(0);
      expect(brief.creatorsWanted, id).toBeGreaterThan(0);
      for (const cityId of brief.targetCityIds) expect(CITY_BY_ID[cityId], cityId).toBeDefined();
    }
  });

  it("names only invented brands, with competitors from the fictional brand pool", () => {
    const pool = new Set(FICTIONAL_BRANDS.map((b) => b.name));
    for (const { id, text, brief } of SAMPLE_BRIEFS) {
      expect(pool.has(brief.brandName), id).toBe(false);
      for (const competitor of brief.excludeBrands) {
        expect(pool.has(competitor), competitor).toBe(true);
        expect(text, id).toContain(competitor);
      }
    }
  });

  it("each yields at least 10 eligible creators on the demo dataset", () => {
    for (const { id, brief } of SAMPLE_BRIEFS) {
      expect(matchCreators(brief, creators).results.length, id).toBeGreaterThanOrEqual(10);
    }
  });
});
