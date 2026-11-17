// Marks where every number on an ingested creator came from, so the UI can keep a visible line
// between what a platform reported and what this app worked out. The brief asked for real figures;
// several fields in the Creator model cannot be real from any free source, and silently mixing the
// two would make the whole profile untrustworthy.

/**
 * measured  - returned by the platform API as-is (subscriber count, view count).
 * derived   - arithmetic on measured values (engagement rate, average views, posting cadence).
 * estimated - modelled from reach by a documented formula. Nobody observed this (rate cards,
 *             audience demographics, authenticity). Always labelled in the UI.
 */
export type Provenance = "measured" | "derived" | "estimated";

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  measured: "From YouTube",
  derived: "Calculated from YouTube data",
  estimated: "Estimated — not observed",
};

/** Field-by-field provenance for an ingested creator, keyed by the Creator property path. */
export type ProvenanceMap = Record<string, Provenance>;

export interface SourceRecord {
  platform: "youtube" | "instagram";
  /** Stable platform id, e.g. a YouTube channel id. */
  externalId: string;
  url: string;
  /** ISO timestamp of the fetch, so stale rows can be refreshed. */
  fetchedAt: string;
}

/**
 * Which Creator fields can ever be real for a YouTube-sourced creator. Everything absent from the
 * measured and derived lists is estimated by definition.
 */
export const YOUTUBE_PROVENANCE: ProvenanceMap = {
  name: "measured",
  handle: "measured",
  bio: "measured",
  avatarUrl: "measured",
  "platforms.followers": "measured",
  "platforms.avgViews": "derived",
  "platforms.engagementRate": "derived",
  "platforms.postsPerMonth": "derived",
  tier: "derived",
  languages: "derived",
  niches: "derived",
  topics: "measured",
  "content.hashtags": "measured",
  "content.tags": "measured",
  "content.sponsoredRatio": "derived",
  homeCityId: "derived",
  audience: "estimated",
  authenticity: "estimated",
  brandSafety: "estimated",
  rates: "estimated",
  collaborations: "estimated",
  responseRate: "estimated",
  avgTurnaroundDays: "estimated",
  gstRegistered: "estimated",
  verified: "estimated",
};
