import { describe, expect, it } from "vitest";
import { findLookalikes, growthFrom, jaccard, reachFlags, topicCoOccurrence, type Snapshot } from "./analytics";
import type { Creator } from "../types";

function creator(id: string, topics: string[], over: Partial<Creator> = {}): Creator {
  return {
    id,
    name: id,
    handle: id,
    bio: "",
    homeCityId: "pune",
    languages: ["mr"],
    niches: ["food"],
    topics,
    platforms: [{ platform: "youtube", handle: id, followers: 50_000, avgViews: 10_000, engagementRate: 3, postsPerMonth: 8 }],
    tier: "micro",
    audience: {} as Creator["audience"],
    authenticity: { score: 85, dormantSubscriberPct: 7, flags: [] },
    brandSafety: { score: 80, flags: [] },
    rates: { reel: 5000, story: 2000, post: 3500, video: 9000 },
    collaborations: [],
    responseRate: 0.5,
    avgTurnaroundDays: 7,
    verified: false,
    gstRegistered: false,
    joinedMonthsAgo: 24,
    avatarHue: 10,
    ...over,
  };
}

describe("jaccard", () => {
  it("is 1 for identical sets and 0 for disjoint ones", () => {
    expect(jaccard(["a", "b"], ["b", "a"])).toBe(1);
    expect(jaccard(["a"], ["b"])).toBe(0);
  });

  it("ignores case and handles empty input", () => {
    expect(jaccard(["Pune"], ["pune"])).toBe(1);
    expect(jaccard([], ["a"])).toBe(0);
  });

  it("does not reward a creator for tagging everything", () => {
    const focused = jaccard(["misal", "pune"], ["misal", "pune"]);
    const spammy = jaccard(["misal", "pune"], ["misal", "pune", "a", "b", "c", "d", "e", "f"]);
    expect(focused).toBeGreaterThan(spammy);
  });
});

describe("findLookalikes", () => {
  const target = creator("target", ["misalpav", "punefood", "streetfood"]);
  const pool = [
    creator("close", ["misalpav", "punefood", "vadapav"]),
    creator("far", ["makeup", "skincare"]),
    creator("partial", ["streetfood", "delhifood"]),
    target,
  ];

  it("ranks the most similar creator first and never returns the target", () => {
    const results = findLookalikes(target, pool);
    expect(results[0].creator.id).toBe("close");
    expect(results.map((r) => r.creator.id)).not.toContain("target");
  });

  it("drops creators with nothing in common", () => {
    expect(findLookalikes(target, pool).map((r) => r.creator.id)).not.toContain("far");
  });

  it("says which topics matched, so the UI can explain itself", () => {
    const [top] = findLookalikes(target, pool);
    expect(top.sharedTopics.sort()).toEqual(["misalpav", "punefood"]);
  });

  it("breaks ties on reach", () => {
    const big = creator("big", ["misalpav"], {
      platforms: [{ platform: "youtube", handle: "big", followers: 900_000, avgViews: 1, engagementRate: 1, postsPerMonth: 1 }],
    });
    const small = creator("small", ["misalpav"]);
    const results = findLookalikes(creator("t2", ["misalpav"]), [small, big]);
    expect(results[0].creator.id).toBe("big");
  });
});

describe("topicCoOccurrence", () => {
  it("finds tags that travel together and ignores one-off pairs", () => {
    const pairs = topicCoOccurrence([
      { id: "1", name: "1", topics: ["misal", "pune"] },
      { id: "2", name: "2", topics: ["misal", "pune"] },
      { id: "3", name: "3", topics: ["misal", "pune"] },
      { id: "4", name: "4", topics: ["solo", "oneoff"] },
    ]);
    expect(pairs[0]).toMatchObject({ a: "misal", b: "pune", support: 3 });
    expect(pairs.some((p) => p.a === "oneoff" || p.b === "oneoff")).toBe(false);
  });

  it("reports confidence as the share of a's creators that also use b", () => {
    const pairs = topicCoOccurrence([
      { id: "1", name: "1", topics: ["food", "pune"] },
      { id: "2", name: "2", topics: ["food", "pune"] },
      { id: "3", name: "3", topics: ["food", "mumbai"] },
      { id: "4", name: "4", topics: ["food", "mumbai"] },
    ]);
    const foodPune = pairs.find((p) => p.a === "food" && p.b === "pune");
    expect(foodPune?.confidence).toBeCloseTo(0.5, 2);
  });
});

describe("growthFrom", () => {
  const snap = (daysAgo: number, followers: number, engagementRate = 3): Snapshot => ({
    capturedAt: new Date(Date.parse("2026-11-17T00:00:00Z") - daysAgo * 86_400_000).toISOString(),
    followers,
    avgViews: 1000,
    engagementRate,
  });

  it("needs two snapshots", () => {
    expect(growthFrom([snap(0, 1000)]).label).toBe("unknown");
    expect(growthFrom([]).label).toBe("unknown");
  });

  it("does not extrapolate a sub-day window into a monthly figure", () => {
    expect(growthFrom([snap(0.2, 1000), snap(0, 1100)]).label).toBe("unknown");
  });

  it("labels a fast riser as surging", () => {
    const trend = growthFrom([snap(30, 100_000), snap(0, 130_000)]);
    expect(trend.label).toBe("surging");
    expect(trend.followersPerMonth).toBe(30_000);
    expect(trend.followersPctChange).toBeCloseTo(30, 0);
  });

  it("labels a shrinking channel as declining", () => {
    expect(growthFrom([snap(30, 100_000), snap(0, 90_000)]).label).toBe("declining");
  });

  it("labels a flat channel as steady and tracks engagement drift", () => {
    const trend = growthFrom([snap(30, 100_000, 4), snap(0, 100_500, 2.5)]);
    expect(trend.label).toBe("steady");
    expect(trend.engagementDelta).toBeCloseTo(-1.5, 2);
  });
});

describe("reachFlags", () => {
  it("raises a critical flag when views are a fraction of subscribers", () => {
    const inflated = creator("inflated", ["x"], {
      platforms: [{ platform: "youtube", handle: "i", followers: 2_010_000, avgViews: 3_510, engagementRate: 0.9, postsPerMonth: 5 }],
    });
    const flags = reachFlags(inflated);
    expect(flags[0].severity).toBe("critical");
    expect(flags[0].message).toContain("% of subscribers");
  });

  it("stays quiet for a healthy creator", () => {
    expect(reachFlags(creator("ok", ["x"]))).toEqual([]);
  });

  it("escalates on a low authenticity estimate", () => {
    const shaky = creator("shaky", ["x"], { authenticity: { score: 40, dormantSubscriberPct: 27, flags: ["Almost no comments"] } });
    const flags = reachFlags(shaky);
    expect(flags.some((f) => f.severity === "critical")).toBe(true);
    expect(flags.some((f) => f.message === "Almost no comments")).toBe(true);
  });
});
