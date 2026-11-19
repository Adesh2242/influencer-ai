// Production server for Railway: serves the built SPA and answers the API routes in one process.
//
// Netlify split this app into a CDN, a function and Netlify Forms. Railway runs one container, so
// all three jobs land here: static files with a single-page fallback, the Claude brief parser, and
// the sign-up form endpoint. The security and caching headers below are the ones netlify.toml used
// to apply at the edge.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { handleParseBrief } from "./netlify/lib/parse-brief-handler";
import { findLookalikes, growthFrom, topicCoOccurrence } from "./src/lib/analytics";
import { buildMediaPlan } from "./src/lib/mediaplan";
import { estimateRate } from "./src/lib/pricing";
import type { CampaignGoal, Deliverable } from "./src/types";
import {
  countCreators,
  getCreator,
  hasDatabase,
  listCreators,
  listSnapshots,
  listTopicSources,
  migrate,
} from "./src/server/db";
import { handleFormSubmission } from "./src/server/forms";

const DIST = resolve(process.env.DIST_DIR ?? "dist");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/** JSON reply with the standard headers; `return void sendJson(...)` keeps the routes to one line. */
function sendJson(res: ServerResponse, status: number, body: unknown, cacheControl = "no-store"): void {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": cacheControl,
  });
  res.end(JSON.stringify(body));
}

/** Applied to every response, matching the [[headers]] block netlify.toml used to serve. */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** Vite fingerprints everything under /assets, so those files can be cached forever. */
const IMMUTABLE = "public, max-age=31536000, immutable";
const NO_STORE = "no-store";

/** Reads a request body with a hard ceiling, so a large POST cannot exhaust memory. */
async function readBody(req: IncomingMessage, limit = 64_000): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new Error("payload too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

function toRequest(req: IncomingMessage, url: URL, body: Buffer): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const method = req.method ?? "GET";
  return new Request(url, {
    method,
    headers,
    // Buffer is a Node type; Request wants a web BodyInit, so hand it the underlying bytes.
    body: method === "GET" || method === "HEAD" ? undefined : new Uint8Array(body),
  });
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string> = { ...SECURITY_HEADERS };
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * Resolves a URL path to a file inside dist, or null when it escapes the directory or is missing.
 * The containment check matters: without it "/../.env" would serve files from outside the build.
 */
async function resolveStatic(pathname: string): Promise<string | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const candidate = resolve(join(DIST, normalize(decoded)));
  if (candidate !== DIST && !candidate.startsWith(DIST + sep)) return null;

  try {
    const stats = await stat(candidate);
    return stats.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

function serveFile(res: ServerResponse, file: string, cacheControl: string): void {
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": cacheControl,
  });
  createReadStream(file).pipe(res);
}

export const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    try {
      // Railway polls this to decide whether a new deployment is healthy.
      if (url.pathname === "/healthz") {
        res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": NO_STORE });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // The ingested Maharashtra creators. The client loads these in place of the demo dataset;
      // an empty list is a valid answer and means ingestion has not run yet.
      if (url.pathname === "/api/creators") {
        if (!hasDatabase()) {
          res.writeHead(503, { ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": NO_STORE });
          res.end(JSON.stringify({ error: "no_database", message: "No creator database is configured." }));
          return;
        }
        const records = await listCreators({
          minConfidence: (url.searchParams.get("confidence") as "strong" | "likely" | "weak" | null) ?? "likely",
          cityId: url.searchParams.get("city") ?? undefined,
          topic: url.searchParams.get("topic") ?? undefined,
          limit: Number(url.searchParams.get("limit") ?? 500),
        });
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": "application/json; charset=utf-8",
          // Short cache: the data only changes when the ingestion job runs.
          "Cache-Control": "public, max-age=300",
        });
        res.end(JSON.stringify({ creators: records }));
        return;
      }

      // Creators most like this one, by the hashtags they put on their own videos.
      const lookalikeMatch = /^\/api\/creators\/([^/]+)\/lookalikes$/.exec(url.pathname);
      if (lookalikeMatch) {
        if (!hasDatabase()) return void sendJson(res, 503, { error: "no_database" });
        const id = decodeURIComponent(lookalikeMatch[1]);
        const target = await getCreator(id);
        if (!target) return void sendJson(res, 404, { error: "not_found" });
        const pool = await listCreators({ minConfidence: "weak", limit: 2000 });
        const matches = findLookalikes(
          target.creator,
          pool.map((record) => record.creator),
          Number(url.searchParams.get("limit") ?? 10),
        );
        return void sendJson(res, 200, { creator: target.creator.id, lookalikes: matches }, "public, max-age=300");
      }

      // Follower velocity and engagement drift from the stored run history.
      const trendMatch = /^\/api\/creators\/([^/]+)\/trend$/.exec(url.pathname);
      if (trendMatch) {
        if (!hasDatabase()) return void sendJson(res, 503, { error: "no_database" });
        const id = decodeURIComponent(trendMatch[1]);
        const snapshots = await listSnapshots(id);
        return void sendJson(res, 200, { creator: id, snapshots, trend: growthFrom(snapshots) }, "public, max-age=300");
      }

      // Hashtags that travel together across the dataset.
      if (url.pathname === "/api/topics/co-occurrence") {
        if (!hasDatabase()) return void sendJson(res, 503, { error: "no_database" });
        const sources = await listTopicSources();
        const pairs = topicCoOccurrence(sources, Number(url.searchParams.get("limit") ?? 40));
        return void sendJson(res, 200, { creators: sources.length, pairs }, "public, max-age=600");
      }

      // What a budget actually buys: reach after duplication, frequency, CPM against benchmark,
      // and where the plan disagrees with the campaign goal.
      if (url.pathname === "/api/plan") {
        if (!hasDatabase()) return void sendJson(res, 503, { error: "no_database" });
        const budget = Number(url.searchParams.get("budget") ?? 0);
        if (!Number.isFinite(budget) || budget <= 0) {
          return void sendJson(res, 400, { error: "invalid_budget", message: "Pass a budget in rupees." });
        }
        const pool = await listCreators({ minConfidence: "likely", limit: 2000 });
        const plan = buildMediaPlan(
          pool.map((record) => record.creator),
          budget,
          {
            goal: (url.searchParams.get("goal") as CampaignGoal | null) ?? "awareness",
            deliverable: (url.searchParams.get("deliverable") as Deliverable | null) ?? "reel",
            maxCreators: url.searchParams.get("max") ? Number(url.searchParams.get("max")) : undefined,
          },
        );
        return void sendJson(res, 200, plan, "no-store");
      }

      // What a creator will ask, what their reach is worth, and the arithmetic between them.
      const rateMatch = /^\/api\/creators\/([^/]+)\/rate$/.exec(url.pathname);
      if (rateMatch) {
        if (!hasDatabase()) return void sendJson(res, 503, { error: "no_database" });
        const record = await getCreator(decodeURIComponent(rateMatch[1]));
        if (!record) return void sendJson(res, 404, { error: "not_found" });
        const deliverable = (url.searchParams.get("deliverable") as Deliverable | null) ?? "reel";
        return void sendJson(res, 200, estimateRate(record.creator, deliverable), "public, max-age=300");
      }

      if (url.pathname === "/api/parse-brief") {
        const body = await readBody(req);
        await send(res, await handleParseBrief(toRequest(req, url, body), { apiKey: process.env.ANTHROPIC_API_KEY }));
        return;
      }

      if (url.pathname.startsWith("/api/forms/")) {
        const body = await readBody(req);
        await send(res, await handleFormSubmission(toRequest(req, url, body), url.pathname.slice("/api/forms/".length)));
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": NO_STORE });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }

      const file = await resolveStatic(url.pathname);
      if (file) {
        serveFile(res, file, url.pathname.startsWith("/assets/") ? IMMUTABLE : NO_STORE);
        return;
      }

      // Unknown path: hand back the SPA shell so client-side routing can take over. Never cached,
      // so a new deployment's asset URLs are picked up on the next visit.
      const shell = await resolveStatic("/index.html");
      if (!shell) {
        res.writeHead(500, { ...SECURITY_HEADERS, "Content-Type": "text/plain" });
        res.end("Build output not found. Run `npm run build` first.");
        return;
      }
      serveFile(res, shell, NO_STORE);
    } catch (error) {
      console.error(`${req.method} ${url.pathname} failed:`, error);
      if (!res.headersSent) {
        res.writeHead(500, { ...SECURITY_HEADERS, "Content-Type": "application/json", "Cache-Control": NO_STORE });
        res.end(JSON.stringify({ error: "internal_error" }));
      } else {
        res.end();
      }
    }
  })();
});

// Started directly rather than imported by a test.
if (process.env.NODE_ENV !== "test") {
  // Create tables before accepting traffic, but never refuse to start over a database problem: the
  // marketing pages and the brief parser work without one, and a half-up site beats a dead one.
  const ready = hasDatabase()
    ? migrate()
        .then(countCreators)
        .then((count) => console.log(`database ready, ${count} creators stored`))
        .catch((error: unknown) => console.error("database setup failed, continuing without it:", error))
    : Promise.resolve(console.log("no DATABASE_URL set, running without a creator database"));

  void ready.then(() => server.listen(PORT, HOST, () => console.log(`influencer-ai listening on ${HOST}:${PORT}`)));
}
