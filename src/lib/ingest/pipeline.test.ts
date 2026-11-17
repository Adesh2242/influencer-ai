import { describe, expect, it } from "vitest";
import { allSeedQueries, buildSeedQueries } from "./pipeline";

describe("seed queries", () => {
  it("pairs every place with every niche, so one run cannot exhaust them", () => {
    const all = allSeedQueries();
    expect(all.length).toBeGreaterThan(400);
    expect(all).toContain("Pune food vlog");
    expect(all).toContain("Kolhapur farming");
  });

  it("gives a different slice for a different offset", () => {
    const first = buildSeedQueries(40, 0);
    const second = buildSeedQueries(40, 40);
    expect(first).toHaveLength(40);
    expect(second).toHaveLength(40);
    expect(first).not.toEqual(second);
    expect(first.filter((q) => second.includes(q))).toHaveLength(0);
  });

  it("wraps around at the end of the cycle instead of returning a short list", () => {
    const total = allSeedQueries().length;
    const wrapped = buildSeedQueries(40, total - 10);
    expect(wrapped).toHaveLength(40);
    expect(new Set(wrapped).size).toBe(40);
  });

  it("returns everything when asked for more than exists", () => {
    expect(buildSeedQueries(10_000, 7)).toEqual(allSeedQueries());
  });
});
