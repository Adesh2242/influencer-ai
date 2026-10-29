import { describe, expect, it } from "vitest";
import type { ScoreWeights } from "@/types";
import { formatWeight, scoreKeys, weightShares } from "./weights";

const WEIGHTS: ScoreWeights = {
  niche: 0.24,
  audience: 0.16,
  language: 0.12,
  geo: 0.1,
  engagement: 0.12,
  authenticity: 0.1,
  budget: 0.1,
  platform: 0.06,
};

function sum(values: (number | null)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

describe("weightShares", () => {
  it("keeps the weights' own key order", () => {
    expect(scoreKeys(WEIGHTS)).toEqual(["niche", "audience", "language", "geo", "engagement", "authenticity", "budget", "platform"]);
  });

  it("returns shares that add up to 1", () => {
    expect(sum(Object.values(weightShares(WEIGHTS)))).toBeCloseTo(1);
  });

  it("re-normalises the remaining weights when criteria are skipped", () => {
    const shares = weightShares(WEIGHTS, ["geo", "budget"]);
    expect(shares.geo).toBeNull();
    expect(shares.budget).toBeNull();
    expect(shares.niche).toBeCloseTo(0.3);
    expect(shares.authenticity).toBeCloseTo(0.125);
    expect(sum(Object.values(shares))).toBeCloseTo(1);
  });

  it("handles weights that don't sum to 1 and an all-skipped brief", () => {
    const doubled = Object.fromEntries(Object.entries(WEIGHTS).map(([key, value]) => [key, value * 2])) as ScoreWeights;
    expect(weightShares(doubled).niche).toBeCloseTo(0.24);
    expect(Object.values(weightShares(WEIGHTS, scoreKeys(WEIGHTS))).every((share) => share === null)).toBe(true);
  });
});

describe("formatWeight", () => {
  it("formats shares as percentages with at most one decimal", () => {
    expect(formatWeight(0.24)).toBe("24%");
    expect(formatWeight(0.125)).toBe("12.5%");
    expect(formatWeight(1 / 3)).toBe("33.3%");
    expect(formatWeight(0)).toBe("0%");
  });
});
