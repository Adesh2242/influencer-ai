import { describe, expect, it } from "vitest";
import { creators } from "@/test/creatorFixtures";
import { getCity } from "@/data/taxonomy";
import { activeFilterCount, DISCOVER_SORTS, EMPTY_QUERY, filterCreators, parseDiscoverQuery, sortCreators, toSearchParams } from "./query";

describe("discover URL params", () => {
  it("round-trips a query and drops defaults", () => {
    const query = { ...EMPTY_QUERY, q: "street food", niche: "food" as const, cityTier: 2 as const, minEr: 3.5, verified: true, sort: "rate" as const };
    const params = toSearchParams(query);
    expect(params.has("minAuth")).toBe(false);
    expect(parseDiscoverQuery(params)).toEqual(query);
    expect(toSearchParams(EMPTY_QUERY).toString()).toBe("");
    expect(activeFilterCount(query)).toBe(4);
  });

  it("ignores unknown or malformed values", () => {
    expect(parseDiscoverQuery(new URLSearchParams("niche=cricket&cityTier=9&minEr=abc&minAuth=500&sort=random"))).toEqual({ ...EMPTY_QUERY, minAuth: 100 });
  });
});

describe("filterCreators and sortCreators", () => {
  it("applies every filter", () => {
    const query = { ...EMPTY_QUERY, lang: "ta" as const, region: "south" as const, minAuth: 60 };
    const list = filterCreators(creators, query);
    expect(list.length).toBeGreaterThan(0);
    for (const c of list) {
      expect(c.languages).toContain("ta");
      expect(getCity(c.homeCityId)?.region).toBe("south");
      expect(c.authenticity.score).toBeGreaterThanOrEqual(60);
    }
  });

  it("searches name, handle, topics and city", () => {
    const sample = creators[0];
    const city = getCity(sample.homeCityId)?.name ?? "";
    expect(filterCreators(creators, { ...EMPTY_QUERY, q: `@${sample.handle}` })).toContain(sample);
    expect(filterCreators(creators, { ...EMPTY_QUERY, q: city.toUpperCase() })).toContain(sample);
    expect(filterCreators(creators, { ...EMPTY_QUERY, q: sample.topics[0] })).toContain(sample);
    expect(filterCreators(creators, { ...EMPTY_QUERY, q: "zzzz-no-such-creator" })).toHaveLength(0);
  });

  it("sorts by reel fee ascending and followers descending", () => {
    const byRate = sortCreators(creators, "rate").map((c) => c.rates.reel);
    expect(byRate.every((v, i) => i === 0 || byRate[i - 1] <= v)).toBe(true);
    const byFollowers = sortCreators(creators, "followers").map((c) => c.platforms[0].followers);
    expect(byFollowers.every((v, i) => i === 0 || byFollowers[i - 1] >= v)).toBe(true);
  });
});

describe("sorting a buyer can trust", () => {
  it("defaults to follower count, the way a buyer browses a catalogue", () => {
    expect(EMPTY_QUERY.sort).toBe("followers");
    expect(DISCOVER_SORTS[0].value).toBe("followers");
  });

  it("keeps the reach-based orders one click away", () => {
    const values = DISCOVER_SORTS.map((s) => s.value);
    expect(values).toEqual(expect.arrayContaining(["localReach", "reach", "value", "engagement", "rate"]));
  });

  it("ranks a hollow channel below a smaller one that delivers", () => {
    const hollow = { ...creators[0], id: "hollow", tier: "mega" as const, languages: ["en" as const] };
    hollow.platforms = [{ platform: "youtube", handle: "h", followers: 2_010_000, avgViews: 3_510, engagementRate: 0.9, postsPerMonth: 4 }];
    const solid = { ...creators[0], id: "solid", tier: "mid" as const, languages: ["mr" as const, "hi" as const] };
    solid.platforms = [{ platform: "youtube", handle: "s", followers: 150_000, avgViews: 40_000, engagementRate: 4, postsPerMonth: 8 }];

    const byLocal = sortCreators([hollow, solid], "localReach");
    expect(byLocal[0].id).toBe("solid");
    // The old default would have put the hollow channel first.
    expect(sortCreators([hollow, solid], "followers")[0].id).toBe("hollow");
  });
});
