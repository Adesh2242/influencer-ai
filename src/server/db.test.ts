import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCHEMA } from "./db";

/**
 * These guard a bug that reached production: a column was added to the `create table if not exists`
 * body and indexed, but an already-deployed database never got the column, because that statement
 * does nothing to a table that already exists. The deploy then crashed on
 * `column "hashtags" does not exist`. Every column added after the first release needs an additive
 * `alter table ... add column if not exists`, placed before anything that references it.
 */
describe("database schema", () => {
  const createBody = SCHEMA.slice(SCHEMA.indexOf("create table if not exists creators"), SCHEMA.indexOf(");"));

  const indexedColumns = [...SCHEMA.matchAll(/create index if not exists \w+\s+on creators(?: using gin)? \((\w+)/g)].map(
    (match) => match[1],
  );

  it("indexes at least the columns we rely on", () => {
    expect(indexedColumns).toEqual(expect.arrayContaining(["followers", "city_id", "hashtags", "video_tags", "niches"]));
  });

  it("declares every indexed column, in the create body or as an additive alter", () => {
    for (const column of indexedColumns) {
      const declared =
        new RegExp(`^\\s*${column}\\s`, "m").test(createBody) ||
        SCHEMA.includes(`add column if not exists ${column}`);
      expect(declared, `column "${column}" is indexed but never declared`).toBe(true);
    }
  });

  it("adds a column before any index that references it", () => {
    for (const column of indexedColumns) {
      const alterAt = SCHEMA.indexOf(`add column if not exists ${column}`);
      if (alterAt < 0) continue; // in the create body instead, which always runs first
      const indexAt = SCHEMA.search(new RegExp(`create index if not exists \\w+\\s+on creators(?: using gin)? \\(${column}`));
      expect(alterAt, `"${column}" is indexed before it is added`).toBeLessThan(indexAt);
    }
  });

  it("keeps every statement idempotent, so it can run on each boot", () => {
    const statements = SCHEMA.split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement && !statement.startsWith("--"));

    for (const statement of statements) {
      const body = statement.replace(/^--.*$/gm, "").trim();
      if (!body) continue;
      expect(body, `not idempotent: ${body.slice(0, 60)}`).toMatch(
        /^(create table if not exists|create index if not exists|alter table \w+ add column if not exists)/,
      );
    }
  });
});

describe("the follower floor", () => {
  it("is applied when serving, so records collected under a lower floor stop appearing", async () => {
    const { MIN_FOLLOWERS } = await import("../lib/ingest/pipeline");
    expect(MIN_FOLLOWERS).toBe(10_000);
  });

  it("filters on followers in the creators query", async () => {
    // Guards the clause itself: a floor that only exists at ingestion leaves older, smaller
    // records visible and the catalogue stops matching the claim made about it.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./db.ts", import.meta.url), "utf8"),
    );
    expect(source).toContain("followers >= $2");
  });
});

describe("accounts that are not inventory", () => {
  const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

  it("declares bookable as an additive alter, not only in the create body", () => {
    // The hashtags outage: a column added to `create table if not exists` never reaches a database
    // that already exists, and the deploy then crashes on the missing column.
    expect(SCHEMA).toContain("add column if not exists bookable");
  });

  it("filters unbookable accounts out of the serving query", () => {
    expect(source).toMatch(/and bookable/);
  });

  it("re-reads stored names on boot, since the check cannot run in SQL", () => {
    expect(source).toContain("reconcileBookable");
    // It must only ever narrow: a row already marked false stays false.
    expect(source).toContain("from creators where bookable");
  });
});

describe("JSON paths into the stored record", () => {
  const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

  /**
   * The stored record is a SourcedCreator — `{ creator, source, metrics, content, ... }` — so a
   * creator's own field sits under `record->'creator'`. A path that forgets that returns null
   * silently: the query still runs, the column is just always empty, and the check that depends
   * on it quietly never fires.
   */
  it("reaches a creator's own fields through 'creator', not off the root", () => {
    const paths = [...source.matchAll(/record->(?:'(\w+)'->)*>'(\w+)'/g)].map((m) => m[0]);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      const topLevel = /^record->>'/.test(path);
      expect(topLevel, `${path} reads off the record root; SourcedCreator has no fields there`).toBe(false);
    }
  });
});
