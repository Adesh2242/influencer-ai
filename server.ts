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
  server.listen(PORT, HOST, () => console.log(`influencer-ai listening on ${HOST}:${PORT}`));
}
