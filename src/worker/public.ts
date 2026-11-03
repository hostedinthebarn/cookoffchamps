// What guests see. No login (decision 2): the event's unguessable link is the
// only key (decision 13), and a cookie stands in for "this device" (decision 5).

import { rankTallies } from "../shared/ranking";
import { loadEvent } from "./access";
import { clientIp, hashIp } from "./auth";
import { cookie, readCookie } from "./cookies";
import type { Env } from "./env";
import { HttpError, json, readJson } from "./http";
import { newId } from "./ids";
import { verifyTurnstile } from "./turnstile";

export const DEVICE_COOKIE = "cc_device";
const DEVICE_TTL_S = 365 * 24 * 60 * 60;

interface EntryRow {
  id: string;
  categoryId: string;
  number: number;
  dishName: string;
  cookName: string;
  photoKey: string | null;
  votes: number;
}

// Wrong codes allowed per client in the window before lookups are refused. A
// family mistyping a poster makes a few; guessing at 31^6 codes needs millions.
export const MAX_CODE_MISSES = 20;
const CODE_WINDOW_MS = 10 * 60 * 1000;

/**
 * GET /api/public/codes/:code — the typed fallback for the QR code. Rate-limited
 * on wrong codes per client, so the short code can't be used to sweep for events.
 */
export async function lookupCode(request: Request, env: Env, code: string): Promise<Response> {
  const ip = clientIp(request);
  const ipHash = ip ? await hashIp(env, ip) : null;
  const since = new Date(Date.now() - CODE_WINDOW_MS).toISOString();
  if (ipHash) {
    await env.DB.prepare("DELETE FROM code_misses WHERE at < ?").bind(since).run();
    const misses = await env.DB.prepare("SELECT COUNT(*) AS n FROM code_misses WHERE ip_hash = ? AND at > ?")
      .bind(ipHash, since)
      .first<{ n: number }>();
    if (misses!.n >= MAX_CODE_MISSES) {
      throw new HttpError(429, "Too many codes tried. Please wait a few minutes, or scan the QR code on the poster.", "tooManyCodes");
    }
  }
  const row = await env.DB.prepare("SELECT id FROM events WHERE code = ?").bind(code.toUpperCase()).first<{ id: string }>();
  if (!row) {
    if (ipHash) {
      await env.DB.prepare("INSERT INTO code_misses (ip_hash, at) VALUES (?, ?)").bind(ipHash, new Date().toISOString()).run();
    }
    throw new HttpError(404, "No event with that code", "noSuchCode");
  }
  return json({ id: row.id });
}

/**
 * GET /api/public/events/:id. Voting is blind (decision 9): cooks and counts
 * appear only once the event is revealed, and then as results (decision 13).
 */
export async function publicEvent(request: Request, env: Env, eventId: string): Promise<Response> {
  const event = await loadEvent(env, eventId);
  const revealed = event.status === "revealed";
  const device = readCookie(request, DEVICE_COOKIE);

  const [categories, entries, mine] = await env.DB.batch([
    env.DB.prepare("SELECT id, name FROM categories WHERE event_id = ? ORDER BY position").bind(eventId),
    env.DB.prepare(
      `SELECT e.id, e.category_id AS categoryId, e.number, e.dish_name AS dishName,
              e.cook_name AS cookName, e.photo_key AS photoKey, COUNT(v.device_token) AS votes
         FROM entries e
         JOIN categories c ON c.id = e.category_id
         LEFT JOIN votes v ON v.entry_id = e.id
        WHERE c.event_id = ?
        GROUP BY e.id ORDER BY c.position, e.number`,
    ).bind(eventId),
    env.DB.prepare(
      `SELECT v.category_id AS categoryId, v.entry_id AS entryId
         FROM votes v JOIN categories c ON c.id = v.category_id
        WHERE c.event_id = ? AND v.device_token = ?`,
    ).bind(eventId, device ?? ""),
  ]);

  const rows = entries!.results as unknown as EntryRow[];
  const myVotes = Object.fromEntries((mine!.results as { categoryId: string; entryId: string }[]).map((v) => [v.categoryId, v.entryId]));

  return json({
    event: { id: event.id, code: event.code, name: event.name, date: event.event_date, status: event.status },
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
    myVotes,
    categories: (categories!.results as { id: string; name: string }[]).map((c) => {
      const inCategory = rows.filter((e) => e.categoryId === c.id);
      return {
        id: c.id,
        name: c.name,
        entries: inCategory.map((e) => ({
          id: e.id,
          number: e.number,
          dishName: e.dishName,
          photoKey: e.photoKey,
          ...(revealed ? { cookName: e.cookName, votes: e.votes } : {}),
        })),
        ...(revealed ? { placings: rankTallies(inCategory.map((e) => ({ entryId: e.id, votes: e.votes }))) } : {}),
      };
    }),
  });
}

/**
 * POST /api/public/events/:id/votes {categoryId, entryId, turnstileToken}.
 * One vote per category per device; voting again replaces it (decision 14).
 */
export async function castVote(request: Request, env: Env, eventId: string): Promise<Response> {
  const event = await loadEvent(env, eventId);
  if (event.status !== "open") throw new HttpError(409, "Voting isn't open", "votingNotOpen");
  const body = await readJson(request);
  if (typeof body.categoryId !== "string" || typeof body.entryId !== "string") {
    throw new HttpError(400, "That entry isn't in this category", "wrongCategory");
  }

  const entry = await env.DB.prepare(
    `SELECT e.id FROM entries e JOIN categories c ON c.id = e.category_id
      WHERE e.id = ? AND e.category_id = ? AND c.event_id = ?`,
  )
    .bind(body.entryId, body.categoryId, eventId)
    .first();
  if (!entry) throw new HttpError(400, "That entry isn't in this category", "wrongCategory");

  if (!(await verifyTurnstile(env, body.turnstileToken, request.headers.get("cf-connecting-ip")))) {
    throw new HttpError(403, "Couldn't confirm you're a person. Please try again.", "notAPerson");
  }

  const existing = readCookie(request, DEVICE_COOKIE);
  const device = existing ?? newId();
  await env.DB.prepare(
    `INSERT INTO votes (category_id, device_token, entry_id, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (category_id, device_token) DO UPDATE SET entry_id = excluded.entry_id, updated_at = excluded.updated_at`,
  )
    .bind(body.categoryId, device, body.entryId, new Date().toISOString())
    .run();

  return json({ ok: true }, 200, existing ? {} : { "set-cookie": cookie(DEVICE_COOKIE, device, DEVICE_TTL_S) });
}
