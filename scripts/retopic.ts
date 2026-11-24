// Re-reads every stored channel's YouTube topicDetails and reclassifies its niches from scratch.
//
//   npm run retopic            # repairs every stored record
//   npm run retopic -- --only-missing
//
// Why this exists. Niches were first assigned by a classifier that matched keywords as substrings,
// and the Marathi for "hello" — नमस्कार — ends in कार, which is "car". So 136 stored creators were
// filed under "Auto & EVs", cooking channels and saree shops among them, and an electric-scooter
// brief put them in front of a buyer.
//
// A stored record could not be repaired by reasoning alone: once the bad tag is there, nothing
// distinguishes "automotive because a substring matched text we no longer keep" from "automotive
// because YouTube says this channel is about vehicles". Guessing between those would either leave
// false tags in place or strip true ones.
//
// So this fetches the answer instead. channels.list costs ONE quota unit per 50 channels, so the
// whole catalogue is about ten units out of a daily 9,000 — cheap enough that guessing was never
// worth it. The topics are stored on the record afterwards, so the question stays decidable.
import { applyRetopic, closePool, listStoredForRetopic, migrate } from "../src/server/db";
import { classifyNiches } from "../src/lib/ingest/niche";
import { getChannels, MissingKeyError, QuotaExceededError } from "../src/lib/ingest/youtube";

const BATCH = 50;

export async function retopic({ onlyMissing = false }: { onlyMissing?: boolean } = {}): Promise<{
  examined: number;
  changed: number;
  unitsSpent: number;
  gone: number;
}> {
  await migrate();
  const stored = await listStoredForRetopic();
  const todo = onlyMissing ? stored.filter((row) => !row.hasTopics) : stored;
  if (todo.length === 0) return { examined: 0, changed: 0, unitsSpent: 0, gone: 0 };

  const byExternalId = new Map(todo.map((row) => [row.externalId, row]));
  let changed = 0;
  let unitsSpent = 0;
  let seen = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const ids = todo.slice(i, i + BATCH).map((row) => row.externalId);
    let channels;
    try {
      channels = await getChannels(ids);
      unitsSpent += 1;
    } catch (error) {
      if (error instanceof QuotaExceededError) throw error;
      // One refused batch must not cost the rest of the catalogue: three ingest runs have already
      // been lost whole to a single bad record.
      console.warn(`  batch ${i / BATCH + 1} failed, skipped: ${String(error).slice(0, 120)}`);
      continue;
    }

    for (const channel of channels) {
      const row = byExternalId.get(channel.id);
      if (!row) continue;
      seen++;
      const text = [
        row.record.creator.bio,
        channel.description,
        ...(row.record.content?.tags ?? []),
        ...(row.record.content?.hashtags ?? []),
      ].join(" ");

      const niches = classifyNiches({ text, topicCategories: channel.topicCategories });
      const before = row.niches.join(",");
      // A channel that now classifies as nothing keeps no niche: the original design is that a
      // wrong niche is worse than a missing one in a shortlist.
      if (niches.join(",") !== before || !row.hasTopics) {
        await applyRetopic(row.id, niches, channel.topicCategories, row.record);
        if (niches.join(",") !== before) {
          changed++;
          if (changed <= 12) console.log(`    ${row.record.creator.name}: [${before}] -> [${niches.join(", ")}]`);
        }
      }
    }
  }

  return { examined: seen, changed, unitsSpent, gone: todo.length - seen };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL.");
    process.exitCode = 2;
    return;
  }
  const onlyMissing = process.argv.includes("--only-missing");
  console.log(`Re-reading YouTube topics for stored creators${onlyMissing ? " (missing topics only)" : ""}…`);
  const result = await retopic({ onlyMissing });
  console.log(
    `\n  ${result.examined} channels re-read, ${result.changed} reclassified, ${result.gone} no longer on YouTube`,
  );
  console.log(`  quota spent: ${result.unitsSpent} unit(s)`);
}

if (process.argv[1]?.includes("retopic")) {
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
}
