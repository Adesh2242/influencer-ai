import { describe, expect, it } from "vitest";
import {
  coverageBySubRegion,
  localReachOf,
  maharashtraShare,
  regionalValue,
  subRegionOf,
  SUB_REGIONS,
} from "./regional";
import type { Creator, CreatorTier, LanguageCode } from "../types";

let seq = 0;
function creator(over: {
  languages: LanguageCode[];
  tier: CreatorTier;
  cityId?: string;
  avgViews?: number;
}): Creator {
  seq++;
  return {
    id: `c${seq}`,
    name: `Creator ${seq}`,
    handle: `c${seq}`,
    bio: "",
    homeCityId: over.cityId ?? "pune",
    languages: over.languages,
    niches: ["food"],
    topics: ["food"],
    platforms: [
      { platform: "youtube", handle: `c${seq}`, followers: 100_000, avgViews: over.avgViews ?? 50_000, engagementRate: 3, postsPerMonth: 8 },
    ],
    tier: over.tier,
    audience: {} as Creator["audience"],
    authenticity: { score: 85, dormantSubscriberPct: 7, flags: [] },
    brandSafety: { score: 80, flags: [] },
    rates: { reel: 0, story: 0, post: 0, video: null },
    collaborations: [],
    responseRate: 0.5,
    avgTurnaroundDays: 7,
    verified: false,
    gstRegistered: false,
    joinedMonthsAgo: 24,
    avatarHue: 10,
  };
}

describe("maharashtraShare", () => {
  it("rates a Marathi creator far more local than a Hindi one", () => {
    const marathi = creator({ languages: ["mr", "hi"], tier: "mid", cityId: "nashik" });
    const hindi = creator({ languages: ["hi"], tier: "mid", cityId: "mumbai" });
    expect(maharashtraShare(marathi)).toBeGreaterThan(maharashtraShare(hindi) * 2);
  });

  it("treats a large creator as more national than a small one", () => {
    const nano = creator({ languages: ["mr"], tier: "nano" });
    const mega = creator({ languages: ["mr"], tier: "mega" });
    expect(maharashtraShare(nano)).toBeGreaterThan(maharashtraShare(mega));
  });

  it("treats a Mumbai creator as less local than one in the interior", () => {
    const mumbai = creator({ languages: ["hi"], tier: "mid", cityId: "mumbai" });
    const nagpur = creator({ languages: ["hi"], tier: "mid", cityId: "nagpur" });
    expect(maharashtraShare(nagpur)).toBeGreaterThan(maharashtraShare(mumbai));
  });

  it("stays a share, never below 5% or above 95%", () => {
    const extremes = [
      creator({ languages: ["mr"], tier: "nano", cityId: "kolhapur" }),
      creator({ languages: ["en"], tier: "mega", cityId: "mumbai" }),
    ];
    for (const c of extremes) {
      expect(maharashtraShare(c)).toBeGreaterThanOrEqual(0.05);
      expect(maharashtraShare(c)).toBeLessThanOrEqual(0.95);
    }
  });
});

describe("regionalValue", () => {
  it("exposes the waste in a nationally-skewed creator", () => {
    // The real case: an English pan-India creator in Mumbai against a Marathi one.
    const national = creator({ languages: ["en"], tier: "mega", cityId: "mumbai", avgViews: 225_673 });
    const local = creator({ languages: ["mr", "hi"], tier: "mid", cityId: "nashik", avgViews: 33_985 });

    const nationalValue = regionalValue(national, 4_50_000);
    const localValue = regionalValue(local, 43_000);

    // Looks competitive nationally...
    expect(nationalValue.nationalCPM).toBeLessThan(localValue.nationalCPM * 3);
    // ...and is far worse on the only reach that counts here.
    expect(nationalValue.localCPM).toBeGreaterThan(localValue.localCPM * 5);
  });

  it("reports the waste multiple as local over national CPM", () => {
    const c = creator({ languages: ["en"], tier: "mega", cityId: "mumbai" });
    const value = regionalValue(c, 1_00_000);
    expect(value.wasteMultiple).toBeCloseTo(value.localCPM / value.nationalCPM, 1);
    expect(value.wasteMultiple).toBeGreaterThan(1);
  });

  it("copes with a creator who has no views", () => {
    const c = creator({ languages: ["mr"], tier: "nano", avgViews: 0 });
    const value = regionalValue(c, 5_000);
    expect(value.localCPM).toBe(0);
    expect(value.localViews).toBe(0);
  });
});

describe("sub-regions", () => {
  it("places the major cities in the right sub-region", () => {
    expect(subRegionOf("mumbai")).toBe("mumbai_metro");
    expect(subRegionOf("pune")).toBe("western");
    expect(subRegionOf("nagpur")).toBe("vidarbha");
    expect(subRegionOf("sambhajinagar")).toBe("marathwada");
    expect(subRegionOf("nashik")).toBe("north");
  });

  it("returns nothing for an unknown city", () => {
    expect(subRegionOf("delhi")).toBeUndefined();
    expect(subRegionOf(undefined)).toBeUndefined();
  });

  it("covers roughly the state's population across the six sub-regions", () => {
    const total = Object.values(SUB_REGIONS).reduce((sum, r) => sum + r.population, 0);
    // Maharashtra is about 12.6 crore; these are rounded projections.
    expect(total).toBeGreaterThan(10_00_00_000);
    expect(total).toBeLessThan(13_00_00_000);
  });
});

describe("coverageBySubRegion", () => {
  it("lists every sub-region, including the ones with nobody in them", () => {
    const rows = coverageBySubRegion([creator({ languages: ["mr"], tier: "mid", cityId: "pune" })]);
    expect(rows).toHaveLength(Object.keys(SUB_REGIONS).length);
    expect(rows.find((r) => r.subRegion === "konkan")?.creators).toBe(0);
  });

  it("sorts by local views so the strongest coverage reads first", () => {
    const rows = coverageBySubRegion([
      creator({ languages: ["mr"], tier: "mid", cityId: "pune", avgViews: 100_000 }),
      creator({ languages: ["mr"], tier: "nano", cityId: "nagpur", avgViews: 1_000 }),
    ]);
    expect(rows[0].subRegion).toBe("western");
  });

  it("adds up local views rather than raw views", () => {
    const c = creator({ languages: ["hi"], tier: "mega", cityId: "mumbai", avgViews: 100_000 });
    const rows = coverageBySubRegion([c]);
    const row = rows.find((r) => r.subRegion === "mumbai_metro")!;
    expect(row.localViews).toBe(localReachOf(c).localViews);
    expect(row.localViews).toBeLessThan(100_000);
  });
});

describe("every Maharashtra city resolves to a sub-region", () => {
  it("needs no hand-written fallbacks", async () => {
    const { CITIES } = await import("../data/taxonomy");
    const mh = CITIES.filter((city) => city.state === "Maharashtra");
    expect(mh.length).toBeGreaterThan(5);
    for (const city of mh) {
      expect(subRegionOf(city.id), `${city.name} has no sub-region`).toBeDefined();
    }
  });
});
