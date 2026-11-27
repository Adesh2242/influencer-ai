// Postgres storage for ingested creators and sign-up submissions.
//
// Creator records are stored whole as JSONB with the columns a query actually filters or sorts on
// lifted out alongside. The shape of a SourcedCreator is still settling, and a dozen relational
// tables would have to be migrated every time the ingestion learns something new; the lifted
// columns carry the indexes, so nothing is lost by keeping the body opaque.
import { Pool, type PoolClient } from "pg";
import type { Snapshot } from "../lib/analytics";
import { commercialStatus, statusOf } from "../lib/ingest/commercial";
import { BRAND_SAFETY_NOT_ASSESSED } from "../lib/ingest/estimate";
import { substringOnlyNiches } from "../lib/ingest/niche";
import { wellFormedDeep } from "../lib/text";
import { MIN_FOLLOWERS, MIN_SAMPLE_FOR_PRICING } from "../lib/ingest/pipeline";
import type { SourcedCreator } from "../lib/ingest/pipeline";
import type { Niche } from "../types";

let pool: Pool | undefined;

/** Lazily opened so a process that never touches the database needs no connection string. */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    pool = new Pool({
      connectionString,
      max: Number(process.env.PGPOOL_MAX ?? 5),
      // Railway's managed Postgres presents a certificate the container has no CA for.
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

export const SCHEMA = `
create table if not exists creators (
  id                  text primary key,
  platform            text         not null,
  external_id         text         not null,
  name                text         not null,
  handle              text         not null,
  city_id             text,
  location_confidence text         not null,
  marathi_content     boolean      not null default false,
  followers           bigint       not null,
  avg_views           bigint       not null,
  engagement_rate     numeric(7,2) not null,
  authenticity_score  integer      not null,
  niches              text[]       not null default '{}',
  hashtags            text[]       not null default '{}',
  video_tags          text[]       not null default '{}',
  sponsored_ratio     numeric(5,3) not null default 0,
  fetched_at          timestamptz  not null,
  record              jsonb        not null,
  unique (platform, external_id)
);
-- "create table if not exists" does nothing to a table that already exists, so a column added
-- after a deployment has run would never appear. Every column added after the first release has
-- to be stated again here as an additive alter, before any index that references it.
alter table creators add column if not exists hashtags        text[]       not null default '{}';
alter table creators add column if not exists video_tags      text[]       not null default '{}';
alter table creators add column if not exists sponsored_ratio numeric(5,3) not null default 0;
alter table creators add column if not exists bookable        boolean      not null default true;

create index if not exists creators_followers_idx  on creators (followers desc);
create index if not exists creators_city_idx       on creators (city_id);
create index if not exists creators_confidence_idx on creators (location_confidence);
create index if not exists creators_bookable_idx   on creators (bookable);
-- GIN indexes so "which creators use #punefood" is a lookup rather than a scan.
create index if not exists creators_hashtags_idx   on creators using gin (hashtags);
create index if not exists creators_video_tags_idx on creators using gin (video_tags);
create index if not exists creators_niches_idx     on creators using gin (niches);

-- One row per creator per ingest run. The creators table only ever holds the latest figures, so
-- without this there is no way to say whether a channel is growing or coasting.
create table if not exists creator_snapshots (
  id              bigserial primary key,
  creator_id      text         not null,
  captured_at     timestamptz  not null,
  followers       bigint       not null,
  avg_views       bigint       not null,
  engagement_rate numeric(7,2) not null,
  unique (creator_id, captured_at)
);
create index if not exists creator_snapshots_creator_idx on creator_snapshots (creator_id, captured_at desc);

create table if not exists form_submissions (
  id          bigserial primary key,
  form_name   text        not null,
  fields      jsonb       not null,
  received_at timestamptz not null default now()
);
create index if not exists form_submissions_received_idx on form_submissions (received_at desc);

create table if not exists ingest_runs (
  id            bigserial primary key,
  started_at    timestamptz not null,
  finished_at   timestamptz not null default now(),
  creators_seen integer     not null,
  quota_spent   integer     not null,
  report        jsonb       not null
);
`;

/** Idempotent: safe to run on every boot and at the start of every ingestion. */
export async function migrate(client?: PoolClient): Promise<void> {
  const runner = client ?? getPool();
  await runner.query(SCHEMA);
  await reconcileBookable(runner);
  await reconcileNiches(runner);
  await reconcileBrandSafety(runner);
}

/**
 * Rows stored before the bookable check existed default to true, and some of them are monasteries,
 * news desks and municipal handles — one was offered as a 90/100 match for an electric scooter
 * brief. The check cannot be expressed in SQL, so the stored names are re-read once on boot. One
 * pass over a few thousand rows, idempotent, and it only ever narrows the catalogue.
 */
async function reconcileBookable(runner: { query: Pool["query"] }): Promise<void> {
  const { rows } = await runner.query<{ id: string; name: string; handle: string; bio: string | null }>(
    // The record is a SourcedCreator, so the creator's own fields are nested under 'creator'.
    "select id, name, handle, record->'creator'->>'bio' as bio from creators where bookable",
  );
  const unbookable = rows.filter((row) => !commercialStatus({ name: row.name, handle: row.handle, bio: row.bio ?? "" }).bookable);
  if (unbookable.length === 0) return;
  await runner.query("update creators set bookable = false where id = any($1)", [unbookable.map((row) => row.id)]);
  console.log(`[db] marked ${unbookable.length} stored account(s) as not bookable: ${unbookable.slice(0, 5).map((r) => r.name).join(", ")}`);
}

/**
 * Strips niche tags that only ever existed because the old classifier matched substrings. 136
 * stored creators were filed under "Auto & EVs" with nothing to do with vehicles: the Marathi for
 * "hello", नमस्कार, ends in कार -- "car" -- so a cooking channel that opens its description by
 * greeting its audience came out automotive, and an electric-scooter brief would surface it.
 *
 * Only stored text is used, so this costs no API quota, and it only ever removes a tag whose
 * keyword evidence is a substring inside a longer word. A tag with real whole-word evidence, or
 * one that came from a YouTube topic, is left alone, and a record is never left with no niches at
 * all -- those are the ones to re-ingest rather than guess at.
 */
async function reconcileNiches(runner: { query: Pool["query"] }): Promise<void> {
  const { rows } = await runner.query<{ id: string; niches: string[]; record: SourcedCreator }>(
    "select id, niches, record from creators",
  );

  let repaired = 0;
  for (const row of rows) {
    const stored = (row.niches ?? []) as Niche[];
    if (stored.length === 0) continue;
    const text = [row.record.creator.bio, ...(row.record.content?.tags ?? []), ...(row.record.content?.hashtags ?? [])].join(" ");
    const bogus = new Set(substringOnlyNiches(text, stored));
    if (bogus.size === 0) continue;

    const kept = stored.filter((niche) => !bogus.has(niche));
    if (kept.length === 0) continue; // nothing left to stand on; leave it for a re-ingest
    const record: SourcedCreator = { ...row.record, creator: { ...row.record.creator, niches: kept } };
    await runner.query("update creators set niches = $2, record = $3 where id = $1", [
      row.id,
      kept,
      JSON.stringify(wellFormedDeep(record)),
    ]);
    repaired++;
  }

  if (repaired > 0) console.log(`[db] repaired niche tags on ${repaired} stored creator(s)`);
}

/**
 * Replaces stored brand-safety scores that nothing ever assessed.
 *
 * The pipeline used to write a flat 80 with an empty flag list, which the profile rendered as "No
 * brand-safety concerns in recent content" — an all-clear about a named person that no code here
 * had any basis for. That was fixed at ingestion, but only records written afterwards carried the
 * honest value: 423 of 555 still asserted 80, because a record is only rewritten when the creator
 * is re-ingested, and most never are.
 *
 * Nothing in this codebase watches a video or reads a comment thread, so the correct value is the
 * same for every creator and this pass is a straight overwrite.
 */
async function reconcileBrandSafety(runner: { query: Pool["query"] }): Promise<void> {
  const { rows } = await runner.query<{ id: string; record: SourcedCreator }>(
    "select id, record from creators where (record->'creator'->'brandSafety'->>'score')::int <> 0",
  );
  if (rows.length === 0) return;

  for (const row of rows) {
    const record: SourcedCreator = {
      ...row.record,
      creator: {
        ...row.record.creator,
        brandSafety: { score: 0, flags: [BRAND_SAFETY_NOT_ASSESSED] },
      },
    };
    await runner.query("update creators set record = $2 where id = $1", [row.id, JSON.stringify(wellFormedDeep(record))]);
  }
  console.log(`[db] cleared ${rows.length} fabricated brand-safety score(s)`);
}

const UPSERT = `insert into creators (
  id, platform, external_id, name, handle, city_id, location_confidence, marathi_content,
  followers, avg_views, engagement_rate, authenticity_score, niches, hashtags, video_tags,
  sponsored_ratio, fetched_at, record, bookable
) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
on conflict (id) do update set
  name = excluded.name,
  handle = excluded.handle,
  city_id = excluded.city_id,
  location_confidence = excluded.location_confidence,
  marathi_content = excluded.marathi_content,
  followers = excluded.followers,
  avg_views = excluded.avg_views,
  engagement_rate = excluded.engagement_rate,
  authenticity_score = excluded.authenticity_score,
  niches = excluded.niches,
  hashtags = excluded.hashtags,
  video_tags = excluded.video_tags,
  sponsored_ratio = excluded.sponsored_ratio,
  fetched_at = excluded.fetched_at,
  record = excluded.record,
  bookable = excluded.bookable`;

/**
 * Replaces the stored copy of each creator. An ingestion re-run refreshes figures in place rather
 * than appending, so a creator keeps one row and one id across runs.
 */
export interface UpsertResult {
  stored: number;
  /** Records the database refused, with the reason, so a run reports them instead of dying. */
  rejected: { id: string; reason: string }[];
}

export async function upsertCreators(records: SourcedCreator[]): Promise<UpsertResult> {
  if (records.length === 0) return { stored: 0, rejected: [] };
  const client = await getPool().connect();
  const rejected: UpsertResult["rejected"] = [];
  let stored = 0;
  try {
    await client.query("begin");
    for (const record of records) {
      const { creator, source, location, metrics } = record;
      // Each creator gets a savepoint: one row the database refuses rolls back to here instead of
      // aborting the transaction and losing the entire run, which has happened twice.
      await client.query("savepoint creator_row");
      try {
        await client.query(UPSERT, [
          creator.id,
          source.platform,
          source.externalId,
          creator.name,
          creator.handle,
          creator.homeCityId,
          location.confidence,
          location.marathiContent,
          creator.platforms[0]?.followers ?? 0,
          metrics.avgViews,
          metrics.engagementRate,
          creator.authenticity.score,
          creator.niches,
          record.content.hashtags,
          record.content.tags,
          record.content.sponsoredRatio,
          source.fetchedAt,
          // Platform text can hold a lone surrogate, which Postgres rejects as invalid JSON.
          JSON.stringify(wellFormedDeep(record)),
          statusOf(creator).bookable,
        ]);
        // Append-only history. Re-running on the same day is a no-op rather than a duplicate.
        await client.query(
          `insert into creator_snapshots (creator_id, captured_at, followers, avg_views, engagement_rate)
           values ($1,$2,$3,$4,$5) on conflict (creator_id, captured_at) do nothing`,
          [creator.id, source.fetchedAt, creator.platforms[0]?.followers ?? 0, metrics.avgViews, metrics.engagementRate],
        );
        await client.query("release savepoint creator_row");
        stored++;
      } catch (error) {
        await client.query("rollback to savepoint creator_row");
        rejected.push({ id: creator.id, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    await client.query("commit");
    return { stored, rejected };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export interface CreatorQuery {
  /** Drop creators we are less sure about than this. */
  minConfidence?: "strong" | "likely" | "weak";
  /**
   * Smallest channel to return. Defaults to the ingestion floor so records collected under an
   * earlier, lower floor stop appearing without being deleted — raising the bar is reversible,
   * dropping rows is not.
   */
  minFollowers?: number;
  cityId?: string;
  /** Only creators who use this hashtag or video tag. */
  topic?: string;
  limit?: number;
}

const CONFIDENCE_SETS: Record<string, string[]> = {
  strong: ["strong"],
  likely: ["strong", "likely"],
  weak: ["strong", "likely", "weak"],
};

export async function listCreators(query: CreatorQuery = {}): Promise<SourcedCreator[]> {
  const allowed = CONFIDENCE_SETS[query.minConfidence ?? "likely"];
  const params: unknown[] = [allowed, query.minFollowers ?? MIN_FOLLOWERS];
  // Records collected before the dormancy and sample-size gates existed are still stored. Serving
  // them means a channel with two videos from 2021 keeps appearing with an ₹83 lakh quote, because
  // it will never be re-ingested — the gates that would re-price it now reject it outright. The
  // coalesce keeps any record whose shape predates the field rather than dropping it blindly.
  let sql = `select record from creators
     where location_confidence = any($1)
       and followers >= $2
       and bookable
       and coalesce((record->'metrics'->>'sampleSize')::int, ${MIN_SAMPLE_FOR_PRICING}) >= ${MIN_SAMPLE_FOR_PRICING}`;
  if (query.cityId) {
    params.push(query.cityId);
    sql += ` and city_id = $${params.length}`;
  }
  if (query.topic) {
    params.push(query.topic.toLowerCase());
    sql += ` and ($${params.length} = any(hashtags) or $${params.length} = any(video_tags))`;
  }
  params.push(Math.min(query.limit ?? 500, 2000));
  sql += ` order by followers desc limit $${params.length}`;

  const { rows } = await getPool().query<{ record: SourcedCreator }>(sql, params);
  return rows.map((row) => row.record);
}

/** Snapshot history for one creator, oldest first, for the growth trend. */
export async function listSnapshots(creatorId: string, limit = 50): Promise<Snapshot[]> {
  const { rows } = await getPool().query<{
    captured_at: Date;
    followers: string;
    avg_views: string;
    engagement_rate: string;
  }>(
    `select captured_at, followers, avg_views, engagement_rate
     from creator_snapshots where creator_id = $1 order by captured_at desc limit $2`,
    [creatorId, Math.min(limit, 200)],
  );
  return rows
    .map((row) => ({
      capturedAt: new Date(row.captured_at).toISOString(),
      followers: Number(row.followers),
      avgViews: Number(row.avg_views),
      engagementRate: Number(row.engagement_rate),
    }))
    .reverse();
}

/** Every creator's topics, for co-occurrence and lookalikes, without hauling full records back. */
export async function listTopicSources(): Promise<{ id: string; name: string; topics: string[] }[]> {
  const { rows } = await getPool().query<{ id: string; name: string; hashtags: string[]; video_tags: string[] }>(
    "select id, name, hashtags, video_tags from creators",
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    topics: [...new Set([...(row.hashtags ?? []), ...(row.video_tags ?? [])])],
  }));
}

export async function getCreator(id: string): Promise<SourcedCreator | undefined> {
  const { rows } = await getPool().query<{ record: SourcedCreator }>("select record from creators where id = $1", [id]);
  return rows[0]?.record;
}

export async function countCreators(): Promise<{ total: number; served: number }> {
  const { rows } = await getPool().query<{ total: string; served: string }>(
    `select count(*)::text as total,
            count(*) filter (
              where followers >= $1
                and coalesce((record->'metrics'->>'sampleSize')::int, ${MIN_SAMPLE_FOR_PRICING}) >= ${MIN_SAMPLE_FOR_PRICING}
            )::text as served
       from creators`,
    [MIN_FOLLOWERS],
  );
  return { total: Number(rows[0]?.total ?? 0), served: Number(rows[0]?.served ?? 0) };
}

export async function insertFormSubmission(formName: string, fields: Record<string, string>): Promise<void> {
  await getPool().query("insert into form_submissions (form_name, fields) values ($1, $2)", [
    formName,
    JSON.stringify(fields),
  ]);
}

export async function recordIngestRun(
  startedAt: string,
  creatorsSeen: number,
  quotaSpent: number,
  report: unknown,
): Promise<void> {
  await getPool().query(
    "insert into ingest_runs (started_at, creators_seen, quota_spent, report) values ($1,$2,$3,$4)",
    [startedAt, creatorsSeen, quotaSpent, JSON.stringify(report)],
  );
}

/** Every stored channel's id and the text its niches can be judged against. */
export async function listStoredForRetopic(): Promise<
  { id: string; externalId: string; niches: Niche[]; record: SourcedCreator; hasTopics: boolean }[]
> {
  const { rows } = await getPool().query<{ id: string; external_id: string; niches: string[]; record: SourcedCreator }>(
    "select id, external_id, niches, record from creators",
  );
  return rows.map((row) => ({
    id: row.id,
    externalId: row.external_id,
    niches: (row.niches ?? []) as Niche[],
    record: row.record,
    hasTopics: Array.isArray(row.record.content?.topicCategories),
  }));
}

/** Writes recomputed niches and the channel's real YouTube topics back onto a stored record. */
export async function applyRetopic(
  id: string,
  niches: Niche[],
  topicCategories: string[],
  record: SourcedCreator,
): Promise<void> {
  const updated: SourcedCreator = {
    ...record,
    creator: { ...record.creator, niches },
    content: { ...record.content, topicCategories },
  };
  await getPool().query("update creators set niches = $2, record = $3 where id = $1", [
    id,
    niches,
    JSON.stringify(wellFormedDeep(updated)),
  ]);
}
