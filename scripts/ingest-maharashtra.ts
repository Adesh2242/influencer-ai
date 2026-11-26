// Fetches real Maharashtra creators from YouTube and stores them.
//
//   npm run ingest:mh                      # into Postgres when DATABASE_URL is set
//   npm run ingest:mh -- --out data.json   # into a file instead
//
// This is what the scheduled ingestion service runs on Railway. It needs a YouTube Data API key in
// YOUTUBE_API_KEY, and writes to Postgres through DATABASE_URL when one is configured.
//
// SCHEDULING: the YouTube Data API quota resets at midnight PACIFIC, not UTC — 08:00 UTC in winter
// and 07:00 UTC in summer. A job scheduled before that runs against the tail of the previous quota
// day and finds nothing if that day was spent. The Railway cron is set to 09:00 UTC, which is
// safely after the reset in both halves of the year. A run at 03:00 UTC returned zero creators for
// exactly this reason.
import { writeFile } from "node:fs/promises";
import { closePool, listStoredForRetopic, migrate, recordIngestRun, upsertCreators } from "../src/server/db";
import { ingestMaharashtra, MIN_FOLLOWERS, seedVideosFromChannels } from "../src/lib/ingest/pipeline";
import { MissingKeyError, QuotaExceededError, QuotaMeter } from "../src/lib/ingest/youtube";
import type { LocationConfidence } from "../src/lib/ingest/location";
import { retopic } from "./retopic";

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main(): Promise<void> {
  const out = arg("out");
  const maxCreators = Number(arg("max", "800"));
  const minSubscribers = Number(arg("min-subs", String(MIN_FOLLOWERS)));
  // Searching is 100 units for about 22 candidates, 84% of them under the follower floor; mining
  // the comments of creators already stored is 1 unit for up to 100. Keep a handful of searches so
  // the catalogue can still reach subjects nobody in it talks about, and spend the rest on mining.
  const maxQueries = Number(arg("queries", "12"));
  const seedChannels = Number(arg("seed-channels", "400"));
  const perChannel = Number(arg("videos-per-channel", "3"));
  // Rotate the seed queries by the day, so a daily job explores new ground each run instead of
  // rediscovering the same channels. --offset overrides it for a manual backfill.
  const seedOffset = Number(arg("offset", String(Math.floor(Date.now() / 86_400_000) * maxQueries)));
  const minConfidence = arg("confidence", "likely") as LocationConfidence;
  const quotaLimit = Number(arg("quota", "9000"));
  const startedAt = new Date().toISOString();

  // Records stored before the channel's YouTube topics were kept cannot have their niches judged:
  // see scripts/retopic.ts. Repairing them costs one quota unit per 50 channels, runs once because
  // the topics are stored afterwards, and happens before the ingest so a spent quota cannot
  // postpone it indefinitely.
  if (process.env.DATABASE_URL && !out && !process.argv.includes("--no-retopic")) {
    try {
      const repair = await retopic({ onlyMissing: true });
      if (repair.examined > 0) {
        console.log(
          `Repaired niches from real YouTube topics: ${repair.examined} re-read, ${repair.changed} reclassified, ${repair.unitsSpent} quota unit(s)\n`,
        );
      }
    } catch (error) {
      console.warn(`Niche repair skipped: ${String(error).slice(0, 160)}\n`);
    }
  }

  const target = out ? out : process.env.DATABASE_URL ? "Postgres" : "(nowhere — set DATABASE_URL or pass --out)";
  console.log(`Ingesting Maharashtra creators (max ${maxCreators}, quota ${quotaLimit}) into ${target}…`);

  // Seeds and the known-id set both come from what is already stored, so each run mines a wider
  // base than the last and never pays to look up a channel it already has.
  const quota = new QuotaMeter(quotaLimit);
  let seedVideoIds: string[] = [];
  let knownChannelIds: string[] = [];
  if (process.env.DATABASE_URL && !out) {
    try {
      const stored = await listStoredForRetopic();
      knownChannelIds = stored.map((row) => row.externalId);
      seedVideoIds = await seedVideosFromChannels(knownChannelIds, { quota, perChannel, maxChannels: seedChannels });
      console.log(`  seeded ${seedVideoIds.length} videos from ${knownChannelIds.length} stored channels (${quota.spent} units)\n`);
    } catch (error) {
      console.warn(`  seeding skipped: ${String(error).slice(0, 140)}\n`);
    }
  }

  const report = await ingestMaharashtra({
    maxCreators,
    maxQueries,
    minSubscribers,
    minConfidence,
    seedOffset,
    quota,
    seedVideoIds,
    knownChannelIds,
  });

  console.log(`\n  ${report.creators.length} creators found`);
  console.log(`  ${report.queriesRun} searches, ${report.videosMined} videos mined for commenters`);
  console.log(`  ${report.minedCandidates} commenter ids seen, ${report.channelsInspected} channels inspected`);
  console.log(`  quota spent: ${report.quotaSpent}${report.quotaExhausted ? " (exhausted)" : ""}`);
  for (const [reason, count] of Object.entries(report.rejections)) {
    console.log(`    dropped ${count.toString().padStart(4)}  ${reason}`);
  }

  const byConfidence = report.creators.reduce<Record<string, number>>((acc, c) => {
    acc[c.location.confidence] = (acc[c.location.confidence] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  location confidence: ${JSON.stringify(byConfidence)}`);

  if (out) {
    const payload = {
      generatedAt: startedAt,
      scope: "Maharashtra",
      source: "YouTube Data API v3",
      note:
        "Follower, view, engagement and cadence figures are from YouTube. Audience demographics, " +
        "authenticity, rate cards and collaborations are estimates, not observations.",
      creators: report.creators,
    };
    await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`\n  written to ${out}`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("\nNothing was stored: set DATABASE_URL, or pass --out to write a file.\n");
    process.exitCode = 2;
    return;
  }

  await migrate();
  const { stored, rejected } = await upsertCreators(report.creators);
  if (rejected.length > 0) {
    console.warn(`\n  ${rejected.length} record(s) refused by the database:`);
    for (const row of rejected.slice(0, 5)) console.warn(`    ${row.id}: ${row.reason.slice(0, 120)}`);
  }
  await recordIngestRun(startedAt, stored, report.quotaSpent, {
    rejected: rejected.length,
    queriesRun: report.queriesRun,
    channelsInspected: report.channelsInspected,
    rejections: report.rejections,
    byConfidence,
  });
  console.log(`\n  ${stored} creators written to Postgres`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof MissingKeyError || error instanceof QuotaExceededError) {
      console.error(`\n${error.message}\n`);
      process.exitCode = 2;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
