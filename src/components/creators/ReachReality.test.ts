import { describe, expect, it } from "vitest";
import { reachCheck } from "./ReachReality";
import type { Creator, CreatorTier } from "@/types";

let seq = 0;
function creator(followers: number, avgViews: number, tier: CreatorTier = "mid"): Creator {
  seq++;
  return {
    id: `c${seq}`,
    name: `Creator ${seq}`,
    handle: `c${seq}`,
    bio: "",
    homeCityId: "pune",
    languages: ["mr", "hi"],
    niches: ["food"],
    topics: ["food"],
    platforms: [{ platform: "youtube", handle: `c${seq}`, followers, avgViews, engagementRate: 3, postsPerMonth: 8 }],
    tier,
    audience: {} as Creator["audience"],
    authenticity: { score: 85, dormantSubscriberPct: 7, flags: [] },
    brandSafety: { score: 80, flags: [] },
    rates: { reel: 10_000, story: 2_000, post: 5_000, video: 20_000 },
    collaborations: [],
    responseRate: 0.5,
    avgTurnaroundDays: 7,
    verified: false,
    gstRegistered: false,
    joinedMonthsAgo: 24,
    avatarHue: 10,
  };
}

describe("reachCheck", () => {
  it("calls out a channel whose audience barely turns up", () => {
    // The real case: 2.01M subscribers, 3,510 median views.
    const check = reachCheck(creator(2_010_000, 3_510, "mega"));
    expect(check.verdict).toBe("hollow");
    expect(check.showUpRate).toBeLessThan(0.01);
  });

  it("flags a soft channel between one and three percent", () => {
    expect(reachCheck(creator(1_000_000, 20_000, "mega")).verdict).toBe("soft");
  });

  it("leaves a healthy channel alone", () => {
    expect(reachCheck(creator(100_000, 40_000)).verdict).toBe("healthy");
  });

  it("does not judge small channels, where one quiet month looks like a pattern", () => {
    expect(reachCheck(creator(2_000, 10, "nano")).verdict).toBe("healthy");
  });

  it("reports the Maharashtra slice alongside the raw views", () => {
    const check = reachCheck(creator(150_000, 40_000));
    expect(check.localViews).toBeLessThanOrEqual(check.views);
    expect(check.localShare).toBeGreaterThan(0);
    expect(check.localShare).toBeLessThanOrEqual(1);
  });

  it("copes with a creator who has no followers recorded", () => {
    const check = reachCheck(creator(0, 0, "nano"));
    expect(check.showUpRate).toBe(0);
    expect(check.verdict).toBe("healthy");
  });
});
