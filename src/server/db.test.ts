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
