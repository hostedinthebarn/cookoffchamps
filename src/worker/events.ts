import {
  categoryEvent,
  proPreview,
  requireCreator,
  requireEditable,
  requireKind,
  requireOrganizer,
  type Kind,
  type Status,
} from "./access";
import { requireSession, sendLoginLink } from "./auth";
import type { Env } from "./env";
import { HttpError, json, optionalDate, readJson, requireEmail, requireText } from "./http";
import { langOf, loginEmail } from "./i18n";
import { newCode, newId } from "./ids";
import { deletePhotoPrefix } from "./photos";

// --- Events -----------------------------------------------------------------

/** GET /api/events — every event the caller created or co-organizes (decision 2). */
export async function listEvents(request: Request, env: Env): Promise<Response> {
  const email = await requireSession(request, env);
  const { results } = await env.DB.prepare(
    `SELECT e.id, e.code, e.name, e.event_date AS date, e.status, e.kind, o.role
       FROM events e JOIN organizers o ON o.event_id = e.id
      WHERE o.email = ?
      ORDER BY COALESCE(e.event_date, substr(e.created_at, 1, 10)) DESC, e.created_at DESC`,
  )
    .bind(email)
    .all();
  return json({ events: results });
}

/**
 * Inserts the event under a fresh short code. A clash on the UNIQUE code is
 * vanishingly rare (31^6 codes), but it retries rather than failing.
 */
export async function insertEvent(
  env: Env,
  fields: { id: string; name: string; date: string | null; kind: Kind; email: string; now: string },
  makeCode: () => string = newCode,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const clash = await env.DB.prepare("SELECT 1 FROM events WHERE code = ?").bind(code).first();
    if (clash) continue;
    await env.DB.prepare(
      "INSERT INTO events (id, code, name, event_date, status, kind, created_by, created_at) VALUES (?, ?, ?, ?, 'setup', ?, ?, ?)",
    )
      .bind(fields.id, code, fields.name, fields.date, fields.kind, fields.email, fields.now)
      .run();
    return code;
  }
  throw new HttpError(500, "Could not allocate an event code");
}

/** POST /api/events {name, date?, kind?} — anyone signed in can create one (decision 1). */
export async function createEvent(request: Request, env: Env): Promise<Response> {
  const email = await requireSession(request, env);
  const body = await readJson(request);
  const name = requireText(body.name, "name");
  const date = optionalDate(body.date);
  const kind = requireKind(body.kind, env);
  const id = newId();
  const now = new Date().toISOString();

  const code = await insertEvent(env, { id, name, date, kind, email, now });
  // Every event starts as a single contest (decision 12).
  await env.DB.batch([
    env.DB.prepare("INSERT INTO organizers (event_id, email, role) VALUES (?, ?, 'creator')").bind(id, email),
    env.DB.prepare("INSERT INTO categories (id, event_id, name, position) VALUES (?, ?, 'Main', 1)").bind(newId(), id),
  ]);
  return json({ id, code }, 201);
}

/** GET /api/events/:id — everything the organizer screen needs. */
export async function manageEvent(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event, role } = await requireOrganizer(env, eventId, email);

  const [categories, entries, organizers, counts, judges] = await env.DB.batch([
    env.DB.prepare("SELECT id, name, position FROM categories WHERE event_id = ? ORDER BY position").bind(eventId),
    env.DB.prepare(
      `SELECT e.id, e.category_id AS categoryId, e.number, e.cook_name AS cookName,
              e.dish_name AS dishName, e.photo_key AS photoKey, e.ticket
         FROM entries e JOIN categories c ON c.id = e.category_id
        WHERE c.event_id = ? ORDER BY c.position, e.number`,
    ).bind(eventId),
    env.DB.prepare("SELECT email, role FROM organizers WHERE event_id = ? ORDER BY role DESC, email").bind(eventId),
    // Votes cast per category: visible while voting is open, so ballot stuffing
    // shows up against the headcount (decision 5). Not who is winning.
    env.DB.prepare(
      `SELECT c.id AS categoryId, COUNT(v.device_token) AS votes
         FROM categories c LEFT JOIN votes v ON v.category_id = c.id
        WHERE c.event_id = ? GROUP BY c.id`,
    ).bind(eventId),
    // The judges whose links still work (SW-25); a family event has none.
    env.DB.prepare(
      "SELECT id, name FROM judges WHERE event_id = ? AND revoked_at IS NULL ORDER BY created_at, rowid",
    ).bind(eventId),
  ]);

  return json({
    event: { id: event.id, code: event.code, name: event.name, date: event.event_date, status: event.status, kind: event.kind },
    role,
    proPreview: proPreview(env),
    categories: categories!.results,
    entries: entries!.results,
    organizers: organizers!.results,
    votesCast: counts!.results,
    judges: judges!.results,
  });
}

/** PATCH /api/events/:id {name?, date?, kind?} */
export async function updateEvent(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  const body = await readJson(request);
  const name = body.name === undefined ? event.name : requireText(body.name, "name");
  const date = body.date === undefined ? event.event_date : optionalDate(body.date);
  let kind = event.kind;
  if (body.kind !== undefined && body.kind !== event.kind) {
    // Rule 1: the kind can change while setting up, never once voting has opened.
    if (event.status !== "setup") throw new HttpError(409, "The kind of event is fixed once voting opens", "kindFixed");
    kind = requireKind(body.kind, env);
  }
  await env.DB.prepare("UPDATE events SET name = ?, event_date = ?, kind = ? WHERE id = ?").bind(name, date, kind, eventId).run();
  return json({ ok: true });
}

// Voting is opened and closed by hand (decision 6). Both a close and a reveal
// can be undone (decision 17): revealed goes back to closed, which hides the
// results again. A pro reveal will be final (rule 18), when it's built.
const TRANSITIONS: Record<Status, Status[]> = {
  setup: ["open"],
  open: ["closed"],
  closed: ["open", "revealed"],
  revealed: ["closed"],
};

/** POST /api/events/:id/status {status} */
export async function setStatus(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  const body = await readJson(request);
  const next = body.status as Status;
  if (!TRANSITIONS[event.status].includes(next)) {
    throw new HttpError(409, `Can't go from ${event.status} to ${String(body.status)}`, "badStatusChange");
  }
  await env.DB.prepare("UPDATE events SET status = ? WHERE id = ?").bind(next, eventId).run();
  return json({ status: next });
}

/** DELETE /api/events/:id — creator only (decision 16). */
export async function deleteEvent(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  await requireCreator(env, eventId, email);
  await deletePhotoPrefix(env, `events/${eventId}/`);
  await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(eventId).run();
  return json({ ok: true });
}

/**
 * GET /api/events/:id/totals — live standings for the organizer's peek and for
 * the reveal (decision 15). Guests never get this before the reveal.
 */
export async function totals(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  await requireOrganizer(env, eventId, email);
  const { results } = await env.DB.prepare(
    `SELECT e.id AS entryId, e.category_id AS categoryId, COUNT(v.device_token) AS votes
       FROM entries e
       JOIN categories c ON c.id = e.category_id
       LEFT JOIN votes v ON v.entry_id = e.id
      WHERE c.event_id = ?
      GROUP BY e.id ORDER BY c.position, e.number`,
  )
    .bind(eventId)
    .all();
  return json({ totals: results });
}

// --- Categories (decision 12) ------------------------------------------------

/** POST /api/events/:id/categories {name} */
export async function addCategory(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  requireEditable(event);
  const name = requireText((await readJson(request)).name, "name", 60);
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO categories (id, event_id, name, position) VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM categories WHERE event_id = ?))",
  )
    .bind(id, eventId, name, eventId)
    .run();
  return json({ id }, 201);
}

/** PATCH /api/categories/:id {name} */
export async function renameCategory(request: Request, env: Env, categoryId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await categoryEvent(env, categoryId, email);
  requireEditable(event);
  const name = requireText((await readJson(request)).name, "name", 60);
  await env.DB.prepare("UPDATE categories SET name = ? WHERE id = ?").bind(name, categoryId).run();
  return json({ ok: true });
}

/** DELETE /api/categories/:id — an event always keeps at least one. */
export async function deleteCategory(request: Request, env: Env, categoryId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await categoryEvent(env, categoryId, email);
  requireEditable(event);
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM categories WHERE event_id = ?")
    .bind(event.id)
    .first<{ n: number }>();
  if (count!.n <= 1) throw new HttpError(409, "An event needs at least one category", "lastCategory");
  const { results } = await env.DB.prepare("SELECT photo_key FROM entries WHERE category_id = ? AND photo_key IS NOT NULL")
    .bind(categoryId)
    .all<{ photo_key: string }>();
  for (const r of results) await env.PHOTOS.delete(r.photo_key);
  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
  return json({ ok: true });
}

// --- Co-organizers (decision 16) ---------------------------------------------

/** POST /api/events/:id/organizers {email, lang?} — creator only; emails them a login link. */
export async function addOrganizer(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const event = await requireCreator(env, eventId, email);
  const body = await readJson(request);
  const invitee = requireEmail(body.email);
  const existing = await env.DB.prepare("SELECT 1 FROM organizers WHERE event_id = ? AND email = ?")
    .bind(eventId, invitee)
    .first();
  if (existing) throw new HttpError(409, "They're already an organizer", "alreadyOrganizer");
  // The email goes first: invites share the login-link rate limits, and a
  // refused send shouldn't leave behind an organizer who was never told.
  await sendLoginLink(
    env,
    request,
    invitee,
    `/e/${eventId}`,
    loginEmail(langOf(body.lang), { by: email, eventName: event.name }),
  );
  await env.DB.prepare("INSERT INTO organizers (event_id, email, role) VALUES (?, ?, 'co')").bind(eventId, invitee).run();
  return json({ ok: true }, 201);
}

/** DELETE /api/events/:id/organizers/:email — creator only; the creator can't be removed. */
export async function removeOrganizer(request: Request, env: Env, eventId: string, target: string): Promise<Response> {
  const email = await requireSession(request, env);
  await requireCreator(env, eventId, email);
  const result = await env.DB.prepare("DELETE FROM organizers WHERE event_id = ? AND email = ? AND role = 'co'")
    .bind(eventId, target.toLowerCase())
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, "No such co-organizer", "noSuchOrganizer");
  return json({ ok: true });
}
