import { loadEvent, requireEditable, requireOrganizer, requirePro } from "./access";
import { requireSession } from "./auth";
import type { Env } from "./env";
import { HttpError, json, readJson, requireText } from "./http";
import { newId } from "./ids";
import { scoreSheet } from "./judging";

// Judges for pro events (SW-25, rule 5). The organizer adds a judge by name and
// hands them a personal link or QR code: no account, no email. The link's id is
// as unguessable as an event's, so holding it is what makes someone that judge.

interface JudgeRow {
  id: string;
  event_id: string;
  name: string;
  revoked_at: string | null;
}

/** POST /api/events/:id/judges {name} — any organizer of a pro event, until voting closes. */
export async function addJudge(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  requirePro(event);
  requireEditable(event);
  const name = requireText((await readJson(request)).name, "name", 60);
  const id = newId();
  await env.DB.prepare("INSERT INTO judges (id, event_id, name, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, eventId, name, new Date().toISOString())
    .run();
  return json({ id, name }, 201);
}

/** A judge whose link still works, or 404. */
export async function activeJudge(env: Env, judgeId: string): Promise<JudgeRow> {
  const judge = await env.DB.prepare("SELECT id, event_id, name, revoked_at FROM judges WHERE id = ?")
    .bind(judgeId)
    .first<JudgeRow>();
  if (!judge || judge.revoked_at) throw new HttpError(404, "That judge's link doesn't work any more", "judgeNotFound");
  return judge;
}

/**
 * DELETE /api/judges/:id {keepScores} — any organizer. The link stops working
 * at once. The organizer says what happens to the scores already given: kept,
 * when a judge had to leave early, or dropped, when the link was compromised.
 */
export async function revokeJudge(request: Request, env: Env, judgeId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const judge = await activeJudge(env, judgeId);
  await requireOrganizer(env, judge.event_id, email);
  const { keepScores } = await readJson(request);
  if (typeof keepScores !== "boolean") throw new HttpError(400, "Say whether to keep the judge's scores (keepScores)");
  await env.DB.prepare("UPDATE judges SET revoked_at = ?, keep_scores = ? WHERE id = ?")
    .bind(new Date().toISOString(), keepScores ? 1 : 0, judgeId)
    .run();
  return json({ ok: true });
}

/**
 * GET /api/public/judges/:id — the judge's own page: who they are, which event,
 * and their score sheet (the criteria, the dishes by ticket, their cards).
 */
export async function judgePage(_request: Request, env: Env, judgeId: string): Promise<Response> {
  const judge = await activeJudge(env, judgeId);
  const event = await loadEvent(env, judge.event_id);
  return json({
    judge: { name: judge.name },
    event: { id: event.id, name: event.name, date: event.event_date, status: event.status },
    ...(await scoreSheet(env, event, judge.id)),
  });
}
