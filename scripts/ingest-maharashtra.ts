// Fetches real Maharashtra creators from YouTube and writes them as a dataset the app can load.
//
//   npm run ingest:mh -- --out src/data/maharashtra-creators.json --max 100
//
// Needs a YouTube Data API key. In a cloud session the key is injected by the HTTPS proxy as a
// network secret on youtube.googleapis.com; elsewhere set YOUTUBE_API_KEY.
import { writeFile } from "node:fs/promises";
import { ingestMaharashtra } from "../src/lib/ingest/pipeline";
import { MissingKeyError, QuotaExceededError, QuotaMeter } from "../src/lib/ingest/youtube";
import type { LocationConfidence } from "../src/lib/ingest/location";

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main(): Promise<void> {
  const out = arg("out", "src/data/maharashtra-creators.json") as string;
  const maxCreators = Number(arg("max", "100"));
  const minSubscribers = Number(arg("min-subs", "1000"));
  const minConfidence = arg("confidence", "likely") as LocationConfidence;
  const quotaLimit = Number(arg("quota", "10000"));

  console.log(`Ingesting Maharashtra creators (max ${maxCreators}, quota ${quotaLimit})…`);

  const report = await ingestMaharashtra({
    maxCreators,
    minSubscribers,
    minConfidence,
    quota: new QuotaMeter(quotaLimit),
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    scope: "Maharashtra",
    source: "YouTube Data API v3",
    note:
      "Follower, view, engagement and cadence figures are from YouTube. Audience demographics, " +
      "authenticity, rate cards and collaborations are estimates, not observations.",
    creators: report.creators,
  };
  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`\n  ${report.creators.length} creators written to ${out}`);
  console.log(`  ${report.queriesRun} searches, ${report.channelsInspected} channels inspected`);
  console.log(`  quota spent: ${report.quotaSpent}${report.quotaExhausted ? " (exhausted)" : ""}`);
  if (Object.keys(report.rejections).length > 0) {
    console.log("  dropped:");
    for (const [reason, count] of Object.entries(report.rejections)) {
      console.log(`    ${count.toString().padStart(4)}  ${reason}`);
    }
  }

  const byConfidence = report.creators.reduce<Record<string, number>>((acc, c) => {
    acc[c.location.confidence] = (acc[c.location.confidence] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  location confidence: ${JSON.stringify(byConfidence)}`);
}

main().catch((error: unknown) => {
  if (error instanceof MissingKeyError || error instanceof QuotaExceededError) {
    console.error(`\n${error.message}\n`);
    process.exit(2);
  }
  console.error(error);
  process.exit(1);
});
