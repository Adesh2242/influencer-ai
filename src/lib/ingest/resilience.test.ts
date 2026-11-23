import { afterEach, describe, expect, it, vi } from "vitest";
import { ingestMaharashtra } from "./pipeline";
import * as youtube from "./youtube";

/**
 * A run of several hundred creators has now been lost whole three times to one bad record: an
 * emoji Postgres refused, a column that was never added, and — on 20 November — a creator who
 * deleted their channel between discovery and enrichment, whose uploads playlist 404'd and took
 * the entire ingest with it.
 *
 * These cover the fetch side. The database side is covered by the savepoint behaviour in db.ts.
 */
function channel(id: string): youtube.YouTubeChannel {
  return {
    id,
    title: `Creator ${id}`,
    description: "Marathi food vlogs, based in Pune.",
    customUrl: `@${id}`,
    country: "IN",
    publishedAt: "2022-01-01T00:00:00Z",
    subscriberCount: 50_000,
    hiddenSubscriberCount: false,
    videoCount: 100,
    viewCount: 1_000_000,
    uploadsPlaylistId: `UU${id}`,
    topicCategories: [],
  };
}

function video(id: string): youtube.YouTubeVideo {
  return {
    id,
    title: "Misal recipe #punefood",
    description: "",
    publishedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    viewCount: 20_000,
    likeCount: 800,
    commentCount: 90,
    tags: ["pune food"],
    hasPaidProductPlacement: false,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("one bad channel does not end the run", () => {
  it("skips a channel whose uploads playlist has gone, and keeps the rest", async () => {
    vi.spyOn(youtube, "searchChannels").mockResolvedValue(["good1", "dead", "good2"]);
    vi.spyOn(youtube, "getChannels").mockResolvedValue([channel("good1"), channel("dead"), channel("good2")]);
    vi.spyOn(youtube, "getRecentVideoIds").mockImplementation(async (playlistId: string) => {
      if (playlistId === "UUdead") {
        throw new Error("YouTube playlistItems failed: 404 The playlist identified with the request's playlistId parameter cannot be found.");
      }
      return ["v1", "v2", "v3", "v4", "v5"];
    });
    vi.spyOn(youtube, "getVideos").mockImplementation(async (ids: string[]) => ids.map(video));

    const report = await ingestMaharashtra({ maxQueries: 1, minSubscribers: 1_000 });

    expect(report.creators).toHaveLength(2);
    expect(report.creators.map((c) => c.source.externalId).sort()).toEqual(["good1", "good2"]);
    expect(report.rejections["channel or uploads playlist gone (404)"]).toBe(1);
  });

  it("still stops the run when the quota is genuinely gone", async () => {
    vi.spyOn(youtube, "searchChannels").mockResolvedValue(["a", "b"]);
    vi.spyOn(youtube, "getChannels").mockResolvedValue([channel("a"), channel("b")]);
    vi.spyOn(youtube, "getRecentVideoIds").mockRejectedValue(new youtube.QuotaExceededError());

    const report = await ingestMaharashtra({ maxQueries: 1, minSubscribers: 1_000 });

    expect(report.creators).toHaveLength(0);
    expect(report.quotaExhausted).toBe(true);
  });

  it("survives a search query YouTube refuses", async () => {
    let call = 0;
    vi.spyOn(youtube, "searchChannels").mockImplementation(async () => {
      call++;
      if (call === 1) throw new Error("YouTube search failed: 400 Invalid request");
      return ["good1"];
    });
    vi.spyOn(youtube, "getChannels").mockResolvedValue([channel("good1")]);
    vi.spyOn(youtube, "getRecentVideoIds").mockResolvedValue(["v1", "v2", "v3", "v4", "v5"]);
    vi.spyOn(youtube, "getVideos").mockImplementation(async (ids: string[]) => ids.map(video));

    const report = await ingestMaharashtra({ maxQueries: 2, minSubscribers: 1_000 });

    expect(report.creators).toHaveLength(1);
    expect(Object.keys(report.rejections).some((k) => k.startsWith("search failed"))).toBe(true);
  });

  it("loses one batch, not every candidate, when a channel lookup is refused", async () => {
    vi.spyOn(youtube, "searchChannels").mockResolvedValue(["x"]);
    vi.spyOn(youtube, "getChannels").mockRejectedValue(new Error("YouTube channels failed: 403 Forbidden"));

    const report = await ingestMaharashtra({ maxQueries: 1, minSubscribers: 1_000 });

    expect(report.creators).toHaveLength(0);
    expect(Object.keys(report.rejections).some((k) => k.startsWith("channel lookup failed"))).toBe(true);
  });
});

describe("the follower floor at ingestion", () => {
  it("rejects a channel below the floor and says which floor", async () => {
    const small = { ...channel("small"), subscriberCount: 4_000 };
    vi.spyOn(youtube, "searchChannels").mockResolvedValue(["small"]);
    vi.spyOn(youtube, "getChannels").mockResolvedValue([small]);

    const report = await ingestMaharashtra({ maxQueries: 1 });

    expect(report.creators).toHaveLength(0);
    expect(report.rejections["under 10000 subscribers"]).toBe(1);
  });

  it("keeps a channel on the line", async () => {
    const onLine = { ...channel("ten"), subscriberCount: 10_000 };
    vi.spyOn(youtube, "searchChannels").mockResolvedValue(["ten"]);
    vi.spyOn(youtube, "getChannels").mockResolvedValue([onLine]);
    vi.spyOn(youtube, "getRecentVideoIds").mockResolvedValue(["v1", "v2", "v3", "v4", "v5"]);
    vi.spyOn(youtube, "getVideos").mockImplementation(async (ids: string[]) => ids.map(video));

    const report = await ingestMaharashtra({ maxQueries: 1 });
    expect(report.creators).toHaveLength(1);
  });
});
