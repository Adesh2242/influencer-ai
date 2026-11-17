import { describe, expect, it } from "vitest";
import { buildContentProfile, extractHashtags, topicsFrom } from "./content";
import type { YouTubeVideo } from "./youtube";

function video(over: Partial<YouTubeVideo> = {}): YouTubeVideo {
  return {
    id: "v1",
    title: "",
    description: "",
    publishedAt: "2026-10-01T00:00:00Z",
    viewCount: 1000,
    likeCount: 50,
    commentCount: 5,
    ...over,
  };
}

describe("extractHashtags", () => {
  it("finds Latin and Devanagari hashtags", () => {
    expect(extractHashtags("Misal pav #punefood #मराठी recipe")).toEqual(["punefood", "मराठी"]);
  });

  it("drops the tags every Short carries", () => {
    expect(extractHashtags("#shorts #viral #trending #vadapav")).toEqual(["vadapav"]);
  });

  it("returns nothing for text without hashtags", () => {
    expect(extractHashtags("no tags here")).toEqual([]);
  });
});

describe("buildContentProfile", () => {
  it("ranks hashtags by how often a creator uses them", () => {
    const videos = [
      video({ title: "#punefood #misal" }),
      video({ title: "#punefood #thali" }),
      video({ title: "#punefood" }),
    ];
    expect(buildContentProfile(videos).hashtags[0]).toBe("punefood");
  });

  it("collects video tags and skips noise", () => {
    const videos = [video({ tags: ["indian street food", "vlog", "viral", "pune"] })];
    const profile = buildContentProfile(videos);
    expect(profile.tags).toContain("indian street food");
    expect(profile.tags).not.toContain("viral");
  });

  it("reports disclosed paid placements as a share of the sample", () => {
    const videos = [
      video({ hasPaidProductPlacement: true }),
      video({ hasPaidProductPlacement: false }),
      video({}),
      video({}),
    ];
    const profile = buildContentProfile(videos);
    expect(profile.sponsoredCount).toBe(1);
    expect(profile.sponsoredRatio).toBe(0.25);
    expect(profile.sampleSize).toBe(4);
  });

  it("copes with a channel that uses neither hashtags nor tags", () => {
    const profile = buildContentProfile([video({ title: "Plain title" })]);
    expect(profile).toMatchObject({ hashtags: [], tags: [], sponsoredRatio: 0 });
  });
});

describe("topicsFrom", () => {
  it("prefers the creator's own hashtags and tags over niche labels", () => {
    const profile = buildContentProfile([video({ title: "#misalpav", tags: ["pune street food"] })]);
    expect(topicsFrom(profile, ["food"])).toEqual(["misalpav", "pune street food"]);
  });

  it("falls back to the niches when there is nothing to use", () => {
    const profile = buildContentProfile([video({ title: "Plain" })]);
    expect(topicsFrom(profile, ["food", "travel"])).toEqual(["food", "travel"]);
  });

  it("does not repeat a word that is both a hashtag and a tag", () => {
    const profile = buildContentProfile([video({ title: "#vadapav", tags: ["vadapav"] })]);
    expect(topicsFrom(profile, ["food"])).toEqual(["vadapav"]);
  });
});
