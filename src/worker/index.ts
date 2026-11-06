import { logout, me, requestLogin, verifyLogin } from "./auth";
import { readOutbox } from "./email";
import { addEntry, deleteEntry, updateEntry } from "./entries";
import type { Env } from "./env";
import {
  addCategory,
  addOrganizer,
  createEvent,
  deleteCategory,
  deleteEvent,
  listEvents,
  manageEvent,
  removeOrganizer,
  renameCategory,
  setStatus,
  totals,
  updateEvent,
} from "./events";
import { error, HttpError, json } from "./http";
import { addJudge, judgePage, revokeJudge } from "./judges";
import { addCriterion, applyPreset, deleteCriterion, submitScores, unlockScores, updateCriterion } from "./judging";
import { getPhoto } from "./photos";
import { castVote, lookupCode, publicEvent } from "./public";
import { cookComments, exportResults } from "./results";
import { purgeIpHashes } from "./purge";
import { canonicalRedirect, isCrossSite, withSecurityHeaders } from "./security";

type Handler = (request: Request, env: Env, ...params: string[]) => Promise<Response>;

// [method, pattern, handler]. ":x" matches one path segment; "*" the rest.
const ROUTES: [string, string, Handler][] = [
  ["GET", "/api/health", async (_r, env) => {
    const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    return json({ ok: row?.ok === 1 });
  }],
  ["POST", "/api/auth/login", requestLogin],
  ["GET", "/api/auth/verify", verifyLogin],
  ["POST", "/api/auth/logout", logout],
  ["GET", "/api/me", me],
  ["GET", "/api/dev/outbox", async (_r, env) => (await readOutbox(env)) ?? error(404, "Not found")],

  ["GET", "/api/events", listEvents],
  ["POST", "/api/events", createEvent],
  ["GET", "/api/events/:id", manageEvent],
  ["PATCH", "/api/events/:id", updateEvent],
  ["DELETE", "/api/events/:id", deleteEvent],
  ["POST", "/api/events/:id/status", setStatus],
  ["GET", "/api/events/:id/totals", totals],
  ["GET", "/api/events/:id/export.csv", exportResults],
  ["POST", "/api/events/:id/categories", addCategory],
  ["POST", "/api/events/:id/organizers", addOrganizer],
  ["DELETE", "/api/events/:id/organizers/:email", removeOrganizer],
  ["POST", "/api/events/:id/judges", addJudge],
  ["DELETE", "/api/judges/:id", revokeJudge],
  ["POST", "/api/judges/:id/unlock", unlockScores],
  ["POST", "/api/events/:id/criteria/preset", applyPreset],
  ["POST", "/api/events/:id/criteria", addCriterion],
  ["PATCH", "/api/criteria/:id", updateCriterion],
  ["DELETE", "/api/criteria/:id", deleteCriterion],
  ["PATCH", "/api/categories/:id", renameCategory],
  ["DELETE", "/api/categories/:id", deleteCategory],
  ["POST", "/api/categories/:id/entries", addEntry],
  ["PATCH", "/api/entries/:id", updateEntry],
  ["DELETE", "/api/entries/:id", deleteEntry],

  ["GET", "/api/public/codes/:code", (r, env, code) => lookupCode(r, env, code!)],
  ["GET", "/api/public/events/:id", publicEvent],
  ["POST", "/api/public/events/:id/votes", castVote],
  ["GET", "/api/public/events/:id/comments/:ticket", cookComments],
  ["GET", "/api/public/judges/:id", judgePage],
  ["POST", "/api/public/judges/:id/scores", submitScores],
  ["GET", "/api/photos/*", (r, env, key) => getPhoto(env, key!, r)],
];

/** decodeURIComponent, but null for malformed escapes like "%E0%A4%A" rather than throwing. */
function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** Matches a path against a pattern, returning the captured segments or null. */
export function matchPath(pattern: string, path: string): string[] | null {
  const want = pattern.split("/");
  const got = path.split("/");
  const params: string[] = [];
  for (let i = 0; i < want.length; i++) {
    if (want[i] === "*") {
      const rest = got.slice(i).join("/");
      if (!rest) return null;
      params.push(rest);
      return params;
    }
    if (got[i] === undefined) return null;
    if (want[i]!.startsWith(":")) {
      if (!got[i]) return null;
      const param = safeDecode(got[i]!);
      if (param === null) return null;
      params.push(param);
    } else if (want[i] !== got[i]) {
      return null;
    }
  }
  return got.length === want.length ? params : null;
}

export async function route(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  let pathMatched = false;
  for (const [method, pattern, handler] of ROUTES) {
    const params = matchPath(pattern, path);
    if (!params) continue;
    pathMatched = true;
    if (method === request.method) return handler(request, env, ...params);
  }
  return pathMatched ? error(405, "Method not allowed") : error(404, "Not found");
}

// Every request reaches the Worker first (run_worker_first in wrangler.jsonc), so
// www and plain http can redirect to the one origin that magic links and
// Turnstile are set up for, and every response gets the security headers. Paths
// outside /api/ are then served from public/ by the assets binding.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isApi = url.pathname.startsWith("/api/");
    return withSecurityHeaders(await respond(request, env, url, isApi), env, isApi);
  },
  // The cron trigger in wrangler.jsonc: keeps the privacy page's IP-hash retention true.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purgeIpHashes(env));
  },
} satisfies ExportedHandler<Env>;

async function respond(request: Request, env: Env, url: URL, isApi: boolean): Promise<Response> {
  const canonical = canonicalRedirect(url, env);
  if (canonical) return Response.redirect(canonical, 301);
  if (!isApi) {
    await countRef(request, env, url);
    return env.ASSETS.fetch(request);
  }
  if (isCrossSite(request)) return error(403, "Cross-site request refused");
  try {
    return await route(request, env);
  } catch (err) {
    if (err instanceof HttpError) return error(err.status, err.message, err.code);
    console.error(err);
    return error(500, "Something went wrong");
  }
}

/**
 * The surfaces that link back to the home page with a ?ref=: the results page and
 * the reveal (SW-59), the QR codes on the printables (SW-62), the guides' closing links (SW-63)
 * and the social posts, one ref per platform: fb, ig, yt, pin (BIZ-57).
 */
const REFS = new Set(["results", "reveal", "pie", "cookie", "chili", "guide-pie", "guide-cookie", "guide-chili", "fb", "ig", "yt", "pin"]);

/**
 * Link-preview fetchers, crawlers and scripts. They open every link a profile or
 * post carries, so on the night the social profiles were set up they counted 40
 * "visits" before anything was posted (BIZ-60). WhatsApp's preview fetcher is
 * matched only at the start ("WhatsApp/2.x"), so a browser that mentions WhatsApp
 * later in its User-Agent still counts; Telegram's says "TelegramBot (like TwitterBot)".
 */
const NOT_A_PERSON =
  /https?:\/\/|bot\/|crawl|spider|slurp|preview|facebookexternalhit|facebot|meta-externalagent|telegrambot|^whatsapp\/|embedly|headless|curl\/|wget\/|python-requests/i;

/**
 * Counts a page visit that came from a link carrying a known ?ref=: the home page,
 * or any static page (printables and guides, which Pinterest pins open; they all
 * end in "/"). Unknown refs are ignored so the table can't be filled with junk,
 * bots and requests without a User-Agent aren't people, and a failed write never
 * stops the page from loading.
 */
async function countRef(request: Request, env: Env, url: URL): Promise<void> {
  const ref = url.searchParams.get("ref");
  if (request.method !== "GET" || !url.pathname.endsWith("/") || !ref || !REFS.has(ref)) return;
  const agent = request.headers.get("user-agent") ?? "";
  if (!agent || NOT_A_PERSON.test(agent)) return;
  try {
    await env.DB.prepare(
      "INSERT INTO ref_counts (ref, day, hits) VALUES (?, ?, 1) ON CONFLICT (ref, day) DO UPDATE SET hits = hits + 1",
    )
      .bind(ref, new Date().toISOString().slice(0, 10))
      .run();
  } catch (err) {
    console.error(err);
  }
}
