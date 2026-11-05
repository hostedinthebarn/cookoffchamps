import { type EventRow, loadEvent, requireOrganizer, requirePro } from "./access";
import { requireSession } from "./auth";
import type { Env } from "./env";
import { HttpError, json, readJson, requireText } from "./http";
import { langOf } from "./i18n";
import { newId } from "./ids";
import { activeJudge } from "./judges";
import { type Card, entryScore, rankScores, type ScorePlacing } from "../shared/scoring";

// Scoring for pro events (SW-25; the vault's pro-events.md, rules 6 and 8–15).

/** At most this many criteria: a judge scores every one for every dish. */
export const MAX_CRITERIA = 8;

type PresetName = "chili" | "bbq" | "general";

// Rule 8's starting points, taste weighted highest as in sanctioned judging.
// Chili follows the chili cookoff criteria (aroma, colour, consistency, taste,
// aftertaste); BBQ the three KCBS ones. Names are added in the organizer's
// language and are theirs to rename after that.
const PRESETS: Record<PresetName, { en: string; es: string; weight: number }[]> = {
  chili: [
    { en: "Taste", es: "Sabor", weight: 2 },
    { en: "Consistency", es: "Consistencia", weight: 1.5 },
    { en: "Aroma", es: "Aroma", weight: 1 },
    { en: "Colour", es: "Color", weight: 1 },
    { en: "Aftertaste", es: "Regusto", weight: 1 },
  ],
  bbq: [
    { en: "Taste", es: "Sabor", weight: 2 },
    { en: "Tenderness", es: "Suavidad", weight: 1.5 },
    { en: "Appearance", es: "Presentación", weight: 1 },
  ],
  general: [
    { en: "Taste", es: "Sabor", weight: 2 },
    { en: "Texture", es: "Textura", weight: 1.5 },
    { en: "Appearance", es: "Presentación", weight: 1 },
    { en: "Aroma", es: "Aroma", weight: 1 },
  ],
};

export interface CriterionRow {
  id: string;
  name: string;
  weight: number;
  position: number;
}

export async function listCriteria(env: Env, eventId: string): Promise<CriterionRow[]> {
  const { results } = await env.DB.prepare("SELECT id, name, weight, position FROM criteria WHERE event_id = ? ORDER BY position")
    .bind(eventId)
    .all<CriterionRow>();
  return results;
}

/** Criteria change only while setting up: once judges can score, they're fixed. */
function requireCriteriaEditable(event: EventRow): void {
  requirePro(event);
  if (event.status !== "setup") throw new HttpError(409, "The criteria are fixed once voting opens", "criteriaFixed");
}

/** A weight from 0.5 to 5, in halves (×1, ×1.5, ×2 …). */
function requireWeight(value: unknown): number {
  if (typeof value !== "number" || value < 0.5 || value > 5 || !Number.isInteger(value * 2)) {
    throw new HttpError(400, "A weight is 0.5 to 5, in steps of 0.5", "badWeight");
  }
  return value;
}

/** POST /api/events/:id/criteria/preset {preset, lang?} — replaces the criteria with a preset. */
export async function applyPreset(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  requireCriteriaEditable(event);
  const body = await readJson(request);
  if (!Object.hasOwn(PRESETS, String(body.preset))) throw new HttpError(400, "preset must be chili, bbq or general");
  const preset = PRESETS[body.preset as PresetName];
  const lang = langOf(body.lang);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM criteria WHERE event_id = ?").bind(eventId),
    ...preset.map((c, i) =>
      env.DB.prepare("INSERT INTO criteria (id, event_id, name, weight, position) VALUES (?, ?, ?, ?, ?)").bind(
        newId(),
        eventId,
        c[lang],
        c.weight,
        i + 1,
      ),
    ),
  ]);
  return json({ criteria: await listCriteria(env, eventId) });
}

/** POST /api/events/:id/criteria {name, weight} */
export async function addCriterion(request: Request, env: Env, eventId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await requireOrganizer(env, eventId, email);
  requireCriteriaEditable(event);
  const body = await readJson(request);
  const name = requireText(body.name, "name", 40);
  const weight = requireWeight(body.weight);
  if ((await listCriteria(env, eventId)).length >= MAX_CRITERIA) {
    throw new HttpError(409, `An event can have at most ${MAX_CRITERIA} criteria`, "tooManyCriteria");
  }
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO criteria (id, event_id, name, weight, position) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM criteria WHERE event_id = ?))",
  )
    .bind(id, eventId, name, weight, eventId)
    .run();
  return json({ id }, 201);
}

/** The event a criterion belongs to, checked against the caller and still editable. */
async function criterionEvent(request: Request, env: Env, criterionId: string): Promise<CriterionRow> {
  const email = await requireSession(request, env);
  const row = await env.DB.prepare("SELECT id, event_id, name, weight, position FROM criteria WHERE id = ?")
    .bind(criterionId)
    .first<CriterionRow & { event_id: string }>();
  if (!row) throw new HttpError(404, "Criterion not found", "criterionNotFound");
  const { event } = await requireOrganizer(env, row.event_id, email);
  requireCriteriaEditable(event);
  return row;
}

/** PATCH /api/criteria/:id {name?, weight?} */
export async function updateCriterion(request: Request, env: Env, criterionId: string): Promise<Response> {
  const current = await criterionEvent(request, env, criterionId);
  const body = await readJson(request);
  const name = body.name === undefined ? current.name : requireText(body.name, "name", 40);
  const weight = body.weight === undefined ? current.weight : requireWeight(body.weight);
  await env.DB.prepare("UPDATE criteria SET name = ?, weight = ? WHERE id = ?").bind(name, weight, criterionId).run();
  return json({ ok: true });
}

/** DELETE /api/criteria/:id */
export async function deleteCriterion(request: Request, env: Env, criterionId: string): Promise<Response> {
  await criterionEvent(request, env, criterionId);
  await env.DB.prepare("DELETE FROM criteria WHERE id = ?").bind(criterionId).run();
  return json({ ok: true });
}

// --- The judge's score sheet ---------------------------------------------------

export interface Dish {
  entryId: string;
  ticket: string;
  category: string | null;
  dishName?: string;
}

/**
 * The dishes a judge scores: those turned in with a ticket. The category is
 * named only when there's more than one, and the dish's name only when the
 * organizer chose to show it (rule 6). Never the cook or the photo.
 */
async function dishes(env: Env, event: EventRow): Promise<Dish[]> {
  const { results } = await env.DB.prepare(
    `SELECT e.id AS entryId, e.ticket, e.dish_name AS dishName, c.name AS category,
            (SELECT COUNT(*) FROM categories WHERE event_id = c.event_id) AS categories
       FROM entries e JOIN categories c ON c.id = e.category_id
      WHERE c.event_id = ? AND e.ticket IS NOT NULL
      ORDER BY c.position, e.ticket`,
  )
    .bind(event.id)
    .all<{ entryId: string; ticket: string; dishName: string; category: string; categories: number }>();
  return results.map((r) => ({
    entryId: r.entryId,
    ticket: r.ticket,
    category: r.categories > 1 ? r.category : null,
    ...(event.show_dish_names ? { dishName: r.dishName } : {}),
  }));
}

export interface JudgeCard {
  entryId: string;
  scores: Record<string, number>;
  comment: string | null;
  locked: boolean;
}

/** One judge's cards, with their scores. */
async function cardsOf(env: Env, judgeId: string): Promise<JudgeCard[]> {
  const [cards, scores] = await env.DB.batch([
    env.DB.prepare("SELECT entry_id AS entryId, comment, submitted_at AS submittedAt FROM scorecards WHERE judge_id = ?").bind(judgeId),
    env.DB.prepare("SELECT entry_id AS entryId, criterion_id AS criterionId, score FROM scores WHERE judge_id = ?").bind(judgeId),
  ]);
  const byEntry = new Map<string, Record<string, number>>();
  for (const s of scores!.results as { entryId: string; criterionId: string; score: number }[]) {
    byEntry.set(s.entryId, { ...byEntry.get(s.entryId), [s.criterionId]: s.score });
  }
  return (cards!.results as { entryId: string; comment: string | null; submittedAt: string | null }[]).map((c) => ({
    entryId: c.entryId,
    // Every card is written with its scores in one batch, so it always has some.
    scores: byEntry.get(c.entryId)!,
    comment: c.comment,
    locked: c.submittedAt !== null,
  }));
}

/** What a pro event's judge page adds: the criteria, the dishes and the judge's own cards. */
export async function scoreSheet(env: Env, event: EventRow, judgeId: string) {
  const criteria = await listCriteria(env, event.id);
  return {
    criteria: criteria.map(({ id, name, weight }) => ({ id, name, weight })),
    dishes: await dishes(env, event),
    cards: await cardsOf(env, judgeId),
  };
}

/** Every criterion scored, each a whole number from 1 to 10, and nothing else (rule 9). */
function requireScores(value: unknown, criteria: CriterionRow[]): Record<string, number> {
  const bad = () => new HttpError(400, "Score every criterion with a whole number from 1 to 10", "badScore");
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw bad();
  const scores = value as Record<string, unknown>;
  const ids = new Set(criteria.map((c) => c.id));
  if (Object.keys(scores).length !== ids.size || !Object.keys(scores).every((k) => ids.has(k))) throw bad();
  for (const s of Object.values(scores)) {
    if (typeof s !== "number" || !Number.isInteger(s) || s < 1 || s > 10) throw bad();
  }
  return scores as Record<string, number>;
}

/**
 * POST /api/public/judges/:id/scores {entryId, scores, comment?} — a judge's
 * scorecard for one dish, while voting is open. Submitting locks it (rule 10).
 */
export async function submitScores(request: Request, env: Env, judgeId: string): Promise<Response> {
  const judge = await activeJudge(env, judgeId);
  const event = await loadEvent(env, judge.event_id);
  if (event.status !== "open") throw new HttpError(409, "Judging isn't open", "votingNotOpen");
  const body = await readJson(request);
  const dish = (await dishes(env, event)).find((d) => d.entryId === body.entryId);
  if (!dish) throw new HttpError(404, "That isn't a dish in this event", "notADish");
  const scores = requireScores(body.scores, await listCriteria(env, event.id));
  let comment: string | null = null;
  if (body.comment !== undefined && body.comment !== null && body.comment !== "") {
    comment = requireText(body.comment, "comment", 500);
  }
  const existing = await env.DB.prepare("SELECT submitted_at FROM scorecards WHERE judge_id = ? AND entry_id = ?")
    .bind(judgeId, dish.entryId)
    .first<{ submitted_at: string | null }>();
  if (existing?.submitted_at) throw new HttpError(409, "You've already scored that dish", "scoreLocked");
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO scorecards (judge_id, entry_id, comment, submitted_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (judge_id, entry_id) DO UPDATE SET comment = excluded.comment, submitted_at = excluded.submitted_at`,
    ).bind(judgeId, dish.entryId, comment, new Date().toISOString()),
    env.DB.prepare("DELETE FROM scores WHERE judge_id = ? AND entry_id = ?").bind(judgeId, dish.entryId),
    ...Object.entries(scores).map(([criterionId, score]) =>
      env.DB.prepare("INSERT INTO scores (judge_id, entry_id, criterion_id, score) VALUES (?, ?, ?, ?)").bind(
        judgeId,
        dish.entryId,
        criterionId,
        score,
      ),
    ),
  ]);
  return json({ ok: true }, 201);
}

/**
 * POST /api/judges/:id/unlock {entryId} — any organizer, before the reveal. The
 * judge can then change that dish's scores and submit again (rule 10). Until
 * they do, the card doesn't count.
 */
export async function unlockScores(request: Request, env: Env, judgeId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const judge = await activeJudge(env, judgeId);
  const { event } = await requireOrganizer(env, judge.event_id, email);
  if (event.status === "revealed") throw new HttpError(409, "The results are out, so scores can't change", "badStatusChange");
  const body = await readJson(request);
  const result = await env.DB.prepare(
    "UPDATE scorecards SET submitted_at = NULL WHERE judge_id = ? AND entry_id = ? AND submitted_at IS NOT NULL",
  )
    .bind(judgeId, String(body.entryId))
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, "That judge hasn't submitted scores for that dish", "noScorecard");
  return json({ ok: true });
}

// --- Results -----------------------------------------------------------------------

/**
 * The submitted cards that count: locked, from judges whose link still works,
 * or who were revoked with their scores kept (they left early). A judge revoked
 * with their scores dropped (a compromised link) doesn't count at all.
 */
async function countedCards(env: Env, eventId: string): Promise<Card[]> {
  const { results } = await env.DB.prepare(
    `SELECT s.judge_id AS judgeId, s.entry_id AS entryId, s.criterion_id AS criterionId, s.score
       FROM scores s
       JOIN scorecards sc ON sc.judge_id = s.judge_id AND sc.entry_id = s.entry_id
       JOIN judges j ON j.id = s.judge_id
      WHERE j.event_id = ? AND (j.revoked_at IS NULL OR j.keep_scores = 1) AND sc.submitted_at IS NOT NULL`,
  )
    .bind(eventId)
    .all<{ judgeId: string; entryId: string; criterionId: string; score: number }>();
  const cards = new Map<string, Card>();
  for (const r of results) {
    const key = `${r.judgeId}/${r.entryId}`;
    const card = cards.get(key) ?? { judgeId: r.judgeId, entryId: r.entryId, scores: {} };
    card.scores[r.criterionId] = r.score;
    cards.set(key, card);
  }
  return [...cards.values()];
}

export interface JudgedResults {
  scores: { entryId: string; categoryId: string; score: number | null; judges: number; counted: number; byCriterion: Record<string, number> }[];
  placings: Record<string, ScorePlacing[]>; // category id → placings
}

/** Each dish's result and each category's placings (rules 11–13). Dishes with no ticket aren't judged. */
export async function judgedResults(env: Env, event: EventRow): Promise<JudgedResults> {
  const criteria = await listCriteria(env, event.id);
  const cards = await countedCards(env, event.id);
  const { results: entries } = await env.DB.prepare(
    `SELECT e.id, e.category_id AS categoryId FROM entries e JOIN categories c ON c.id = e.category_id
      WHERE c.event_id = ? AND e.ticket IS NOT NULL ORDER BY c.position, e.ticket`,
  )
    .bind(event.id)
    .all<{ id: string; categoryId: string }>();
  const drop = event.drop_outliers === 1;
  const scores = entries.map((e) => ({ categoryId: e.categoryId, ...entryScore(e.id, cards, criteria, drop) }));
  const placings: Record<string, ScorePlacing[]> = {};
  for (const categoryId of new Set(entries.map((e) => e.categoryId))) {
    placings[categoryId] = rankScores(scores.filter((s) => s.categoryId === categoryId), criteria);
  }
  return { scores, placings };
}

/** The submitted cards per judge, for the organizer's progress panel (rule 15). */
export async function progress(env: Env, eventId: string): Promise<{ judgeId: string; entryId: string }[]> {
  const { results } = await env.DB.prepare(
    `SELECT sc.judge_id AS judgeId, sc.entry_id AS entryId FROM scorecards sc JOIN judges j ON j.id = sc.judge_id
      WHERE j.event_id = ? AND j.revoked_at IS NULL AND sc.submitted_at IS NOT NULL`,
  )
    .bind(eventId)
    .all<{ judgeId: string; entryId: string }>();
  return results;
}
