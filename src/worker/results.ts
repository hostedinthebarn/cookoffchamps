// Pro events, part 3 (SW-25; the vault's pro-events.md, rules 2, 14, 16 and 19):
// the awards around the judged placings, the cooks' comments and the
// organizer's export. The judged placings themselves are in judging.ts.

import { type Placing, rankTallies } from "../shared/ranking";
import { cardScore, formatScore, type GrandChampion, grandChampions } from "../shared/scoring";
import { type EventRow, loadEvent, requireOrganizer, requirePro } from "./access";
import { requireSession } from "./auth";
import type { Env } from "./env";
import { HttpError, json } from "./http";
import { EXPORT_HEADINGS, langOf } from "./i18n";
import { countedCards, judgedResults, type JudgedResults, listCriteria } from "./judging";

interface JudgedEntry {
  entryId: string;
  categoryId: string;
  ticket: string;
  cookName: string;
  dishName: string;
  votes: number;
}

/** The dishes that were judged (turned in with a ticket), with their People's Choice votes. */
async function judgedEntries(env: Env, eventId: string): Promise<JudgedEntry[]> {
  const { results } = await env.DB.prepare(
    `SELECT e.id AS entryId, e.category_id AS categoryId, e.ticket, e.cook_name AS cookName,
            e.dish_name AS dishName, COUNT(v.device_token) AS votes
       FROM entries e
       JOIN categories c ON c.id = e.category_id
       LEFT JOIN votes v ON v.entry_id = e.id
      WHERE c.event_id = ? AND e.ticket IS NOT NULL
      GROUP BY e.id ORDER BY c.position, e.ticket`,
  )
    .bind(eventId)
    .all<JudgedEntry>();
  return results;
}

export interface ProResults extends JudgedResults {
  criteria: { id: string; name: string; weight: number }[];
  /** Category id → the most-voted dish (rule 2); null when the award is off. A category nobody voted in has none. */
  peoplesChoice: Record<string, Placing> | null;
  /** Rule 16; null when the award is off. */
  grandChampion: GrandChampion[] | null;
}

/** Everything a pro reveal and results page show. */
export async function proResults(env: Env, event: EventRow): Promise<ProResults> {
  const [judged, criteria, entries] = await Promise.all([
    judgedResults(env, event),
    listCriteria(env, event.id),
    judgedEntries(env, event.id),
  ]);
  const categoryIds = [...new Set(entries.map((e) => e.categoryId))];

  let peoplesChoice: Record<string, Placing> | null = null;
  if (event.peoples_choice === 1) {
    peoplesChoice = {};
    for (const id of categoryIds) {
      const top = rankTallies(entries.filter((e) => e.categoryId === id))[0]!;
      if (top.votes > 0) peoplesChoice[id] = top;
    }
  }

  let grandChampion: GrandChampion[] | null = null;
  if (event.grand_champion === 1) {
    const byId = new Map(entries.map((e) => [e.entryId, e]));
    grandChampion = grandChampions(
      judged.scores.map((s) => ({ entryId: s.entryId, categoryId: s.categoryId, cookName: byId.get(s.entryId)!.cookName, score: s.score })),
      categoryIds,
    );
  }

  return {
    ...judged,
    criteria: criteria.map(({ id, name, weight }) => ({ id, name, weight })),
    peoplesChoice,
    grandChampion,
  };
}

export interface JudgeComment {
  entryId: string;
  judgeId: string;
  judge: string;
  comment: string;
}

/**
 * The comments that count: on submitted cards, from judges whose scores count
 * (a judge revoked with their scores dropped loses their comments too).
 */
export async function comments(env: Env, eventId: string): Promise<JudgeComment[]> {
  const { results } = await env.DB.prepare(
    `SELECT sc.entry_id AS entryId, j.id AS judgeId, j.name AS judge, sc.comment
       FROM scorecards sc JOIN judges j ON j.id = sc.judge_id
      WHERE j.event_id = ? AND (j.revoked_at IS NULL OR j.keep_scores = 1)
        AND sc.submitted_at IS NOT NULL AND sc.comment IS NOT NULL
      ORDER BY j.created_at, j.rowid`,
  )
    .bind(eventId)
    .all<JudgeComment>();
  return results;
}

/**
 * GET /api/public/events/:id/comments/:ticket — a cook reads the judges'
 * comments on their own dish (rule 14). Only after the reveal, and only when the
 * organizer turned it on. Judges are never named (rule 19).
 */
export async function cookComments(_request: Request, env: Env, eventId: string, ticket: string): Promise<Response> {
  const event = await loadEvent(env, eventId);
  if (event.kind !== "pro" || event.status !== "revealed" || event.cook_comments !== 1) {
    throw new HttpError(409, "The judges' comments aren't available for this event", "commentsUnavailable");
  }
  const entry = await env.DB.prepare(
    `SELECT e.id, e.ticket FROM entries e JOIN categories c ON c.id = e.category_id WHERE c.event_id = ? AND e.ticket = ?`,
  )
    .bind(eventId, ticket.trim().toUpperCase())
    .first<{ id: string; ticket: string }>();
  if (!entry) throw new HttpError(404, "No dish has that ticket number", "noSuchTicket");
  const all = await comments(env, eventId);
  return json({ ticket: entry.ticket, comments: all.filter((c) => c.entryId === entry.id).map((c) => c.comment) });
}

/**
 * A spreadsheet cell. Quoted when it must be, and a leading = + - @ is defused
 * with an apostrophe so a cook's name can't run as a formula when it's opened.
 */
export function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * GET /api/events/:id/export.csv?lang= — the organizer's export (rule 19): a row
 * per judge per dish, with each judge's criterion scores and comment, beside the
 * dish's place, final score and People's Choice votes. A dish nobody scored gets
 * one row with the judge columns empty.
 */
export async function exportResults(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  requirePro(event);
  const headings = EXPORT_HEADINGS[langOf(new URL(request.url).searchParams.get("lang"))];
  const [judged, criteria, entries, cards, notes, categories, judges] = await Promise.all([
    judgedResults(env, event),
    listCriteria(env, eventId),
    judgedEntries(env, eventId),
    countedCards(env, eventId),
    comments(env, eventId),
    env.DB.prepare("SELECT id, name FROM categories WHERE event_id = ?").bind(eventId).all<{ id: string; name: string }>(),
    env.DB.prepare("SELECT id, name FROM judges WHERE event_id = ? ORDER BY created_at, rowid").bind(eventId).all<{ id: string; name: string }>(),
  ]);
  const categoryName = new Map(categories.results.map((c) => [c.id, c.name]));
  const judgeOrder = judges.results.map((j) => j.id);
  const judgeName = new Map(judges.results.map((j) => [j.id, j.name]));

  const rows: (string | number | null)[][] = [[...headings.fixed, ...criteria.map((c) => c.name), headings.judgeScore, headings.comment]];
  for (const e of entries) {
    const result = judged.scores.find((s) => s.entryId === e.entryId)!;
    const place = judged.placings[e.categoryId]!.find((p) => p.entryIds.includes(e.entryId))!.place;
    const dish = [
      categoryName.get(e.categoryId)!,
      e.ticket,
      e.cookName,
      e.dishName,
      place,
      result.score === null ? null : formatScore(result.score),
      result.counted,
      e.votes,
    ];
    const mine = cards.filter((c) => c.entryId === e.entryId).sort((a, b) => judgeOrder.indexOf(a.judgeId) - judgeOrder.indexOf(b.judgeId));
    if (!mine.length) rows.push([...dish, null, ...criteria.map(() => null), null, null]);
    for (const card of mine) {
      const note = notes.find((n) => n.entryId === e.entryId && n.judgeId === card.judgeId);
      rows.push([
        ...dish,
        judgeName.get(card.judgeId)!,
        ...criteria.map((c) => card.scores[c.id]!),
        formatScore(cardScore(card, criteria)),
        note ? note.comment : null,
      ]);
    }
  }
  // A BOM, so Excel reads the accents in Spanish names as UTF-8.
  const body = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cookoff-${event.code}.csv"`,
      "cache-control": "no-store",
    },
  });
}
