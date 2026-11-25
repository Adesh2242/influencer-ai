import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAMPLE_BRIEFS } from "./sampleBriefs";
import { matchCreators } from "../lib/matching/engine";
import { creators as fixtures } from "../test/creatorFixtures";
import type { Creator } from "../types";

/**
 * Every sample brief is a button on the match page, so one that returns nothing is a dead end the
 * first time anyone tries the product. Two of six did exactly that: they asked for Instagram while
 * the catalogue is entirely YouTube, so "Not on Instagram" excluded all 452 creators.
 */
describe("every sample brief returns creators", () => {
  const PATH = "/tmp/claude-0/-home-user-influencer-ai/8bc8a894-7fae-5f2d-a9f0-1a5309d8c591/scratchpad/live5.json";
  let catalogue: Creator[] = fixtures;
  try {
    catalogue = JSON.parse(readFileSync(PATH, "utf8")).creators.map((r: { creator: Creator }) => r.creator);
  } catch {
    // Fall back to fixtures when the captured catalogue isn't present.
  }

  for (const sample of SAMPLE_BRIEFS) {
    it(`${sample.id} finds someone`, () => {
      const { results } = matchCreators(sample.brief, catalogue);
      expect(results.length, `${sample.id} returned no creators`).toBeGreaterThan(0);
    });
  }

  it("never asks only for a platform the catalogue has none of", () => {
    const havePlatforms = new Set(catalogue.flatMap((c) => c.platforms.map((p) => p.platform)));
    for (const sample of SAMPLE_BRIEFS) {
      const asked = sample.brief.platforms;
      if (asked.length === 0) continue;
      expect(asked.some((p) => havePlatforms.has(p)), `${sample.id} asks only for ${asked.join("/")}`).toBe(true);
    }
  });
});
