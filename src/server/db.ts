// Postgres storage for ingested creators and sign-up submissions.
//
// Creator records are stored whole as JSONB with the columns a query actually filters or sorts on
// lifted out alongside. The shape of a SourcedCreator is still settling, and a dozen relational
// tables would have to be migrated every time the ingestion learns something new; the lifted
// columns carry the indexes, so nothing is lost by keeping the body opaque.
import { Pool, type PoolClient } from "pg";
import type { SourcedCreator } from "../lib/ingest/pipeline";

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

create index if not exists creators_followers_idx  on creators (followers desc);
create index if not exists creators_city_idx       on creators (city_id);
create index if not exists creators_confidence_idx on creators (location_confidence);
-- GIN indexes so "which creators use #punefood" is a lookup rather than a scan.
create index if not exists creators_hashtags_idx   on creators using gin (hashtags);
create index if not exists creators_video_tags_idx on creators using gin (video_tags);
create index if not exists creators_niches_idx     on creators using gin (niches);

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
}

const UPSERT = `insert into creators (
  id, platform, external_id, name, handle, city_id, location_confidence, marathi_content,
  followers, avg_views, engagement_rate, authenticity_score, niches, hashtags, video_tags,
  sponsored_ratio, fetched_at, record
) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
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
  record = excluded.record`;

/**
 * Replaces the stored copy of each creator. An ingestion re-run refreshes figures in place rather
 * than appending, so a creator keeps one row and one id across runs.
 */
export async function upsertCreators(records: SourcedCreator[]): Promise<number> {
  if (records.length === 0) return 0;
  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const record of records) {
      const { creator, source, location, metrics } = record;
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
        JSON.stringify(record),
      ]);
    }
    await client.query("commit");
    return records.length;
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
  const params: unknown[] = [allowed];
  let sql = "select record from creators where location_confidence = any($1)";
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

export async function countCreators(): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>("select count(*)::text as count from creators");
  return Number(rows[0]?.count ?? 0);
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
