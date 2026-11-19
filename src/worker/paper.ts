// Paper ballots (SW-92): the organizer types in the counts from the tally sheet
// after voting closes, and they're added to the phone votes. There is no way to
// de-duplicate them (a paper ballot carries no identity), so the guard is
// process, a visible phone/paper split, and an optional "ballots handed out".

import { requireOrganizer, type EventRow } from "./access";
import { requireSession } from "./auth";
import type { Env } from "./env";
import { HttpError, json, readJson } from "./http";

/** The most paper votes one dish can get; a typing slip shouldn't win a contest. */
export const MAX_PAPER = 9999;

/**
 * SQL for one entry's paper count (alias `e` for entries). Used wherever votes
 * are tallied, beside the phone count, so every path adds them the same way.
 */
export const PAPER_COUNT_SQL = "COALESCE((SELECT p.count FROM paper_votes p WHERE p.entry_id = e.id), 0)";

/** A dish's total: phone votes plus paper votes. The one place they're added. */
export function totalVotes(row: { phone: number; paper: number }): number {
  return row.phone + row.paper;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_PAPER) {
    throw new HttpError(400, `Paper counts are whole numbers from 0 to ${MAX_PAPER}`, "badCount");
  }
  return value;
}

/** PUT /api/events/:id/paper {counts: [{entryId, count}], handedOut: number | null} */
export async function savePaper(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  requireFamily(event);
  // Editable between the close and the reveal. A reveal locks it, and undoing
  // the reveal (decision 17) unlocks it again.
  if (event.status !== "closed") {
    throw new HttpError(409, "Paper votes can be added only after voting closes and before the reveal", "paperLocked");
  }
  const body = await readJson(request);
  if (!Array.isArray(body.counts)) throw new HttpError(400, "counts must be a list");
  const handedOut = body.handedOut === null || body.handedOut === undefined ? null : count(body.handedOut);
  const counts = body.counts.map((c: { entryId?: unknown; count?: unknown }) => ({
    entryId: typeof c?.entryId === "string" ? c.entryId : "",
    count: count(c?.count),
  }));

  const { results } = await env.DB.prepare(
    "SELECT e.id, e.category_id AS categoryId FROM entries e JOIN categories c ON c.id = e.category_id WHERE c.event_id = ?",
  )
    .bind(eventId)
    .all<{ id: string; categoryId: string }>();
  const categoryOf = new Map(results.map((r) => [r.id, r.categoryId]));
  if (counts.some((c) => !categoryOf.has(c.entryId))) {
    throw new HttpError(400, "That entry isn't in this event", "entryNotFound");
  }

  // The status check above ran before two awaits, so a reveal could land in
  // between. Every write repeats it inside the batch (one D1 transaction), so a
  // revealed event's paper counts can't change: either all of it applies while
  // the event is still closed, or none of it does.
  const stillClosed = "EXISTS (SELECT 1 FROM events WHERE id = ? AND status = 'closed')";
  const now = new Date().toISOString();
  const [ballots] = await env.DB.batch([
    env.DB.prepare("UPDATE events SET paper_ballots = ? WHERE id = ? AND status = 'closed'").bind(handedOut, eventId),
    ...counts.map((c) =>
      c.count === 0
        ? env.DB.prepare(`DELETE FROM paper_votes WHERE entry_id = ? AND ${stillClosed}`).bind(c.entryId, eventId)
        : env.DB.prepare(
            `INSERT INTO paper_votes (category_id, entry_id, count, updated_at)
             SELECT ?, ?, ?, ? WHERE ${stillClosed}
             ON CONFLICT (category_id, entry_id) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at`,
          ).bind(categoryOf.get(c.entryId)!, c.entryId, c.count, now, eventId),
    ),
  ]);
  if (!ballots?.meta.changes) {
    throw new HttpError(409, "Paper votes can be added only after voting closes and before the reveal", "paperLocked");
  }
  return json({ ok: true });
}

/** Paper counts are for family events: judges score on their own devices. */
function requireFamily(event: EventRow): void {
  if (event.kind !== "family") throw new HttpError(409, "Paper votes are for family events only", "paperFamilyOnly");
}
