// Judged results for pro events (SW-25; the vault's pro-events.md, rules 8–13).
// Shared by the Worker (standings, results) and the client (the reveal), so the
// two can never disagree about who came where.
//
// Every judge scores every dish on each criterion, a whole number from 1 to 10
// (rule 9). A judge's score for a dish is the weighted average of their
// criterion scores, so it stays on the same 1–10 scale (e.g. 8.74). A dish's
// result is the average of its judges' scores (rule 11), over the judges who
// scored it (rule 13), with each dish's highest and lowest judge dropped when 5
// or more scored it and the organizer left that on (rule 11).

export interface Criterion {
  id: string;
  weight: number;
  position: number;
}

export interface Card {
  judgeId: string;
  entryId: string;
  scores: Record<string, number>; // criterion id → 1–10
}

export interface EntryScore {
  entryId: string;
  /** The result on the 1–10 scale; null when no judge has scored the dish. */
  score: number | null;
  /** How many judges' scores counted, after any dropping. */
  counted: number;
  /** How many judges scored it. */
  judges: number;
  /** Each criterion's average over the counted judges, for tie-breaks and the breakdown. */
  byCriterion: Record<string, number>;
}

export interface ScorePlacing {
  place: number; // 1 = winner
  entryIds: string[]; // more than one means a tie that the criteria couldn't break
  score: number | null;
}

/** With this many judges or more, each dish's highest and lowest are dropped (rule 11). */
export const DROP_FROM = 5;

// Scores are averages of averages; anything closer than this is the same score.
const EPSILON = 1e-9;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** One judge's score for one dish: the weighted average of their criterion scores. */
export function cardScore(card: Card, criteria: readonly Criterion[]): number {
  const weight = criteria.reduce((sum, c) => sum + c.weight, 0);
  return criteria.reduce((sum, c) => sum + (card.scores[c.id] ?? 0) * c.weight, 0) / weight;
}

/** A dish's result from the scorecards given for it. */
export function entryScore(
  entryId: string,
  cards: readonly Card[],
  criteria: readonly Criterion[],
  dropOutliers: boolean,
): EntryScore {
  const mine = cards.filter((c) => c.entryId === entryId);
  if (mine.length === 0) return { entryId, score: null, counted: 0, judges: 0, byCriterion: {} };
  let kept = [...mine].sort((a, b) => cardScore(a, criteria) - cardScore(b, criteria));
  if (dropOutliers && kept.length >= DROP_FROM) kept = kept.slice(1, -1);
  const byCriterion: Record<string, number> = {};
  for (const c of criteria) byCriterion[c.id] = mean(kept.map((card) => card.scores[c.id] ?? 0));
  return {
    entryId,
    score: mean(kept.map((card) => cardScore(card, criteria))),
    counted: kept.length,
    judges: mine.length,
    byCriterion,
  };
}

/** The criteria in tie-break order: heaviest first, then as the organizer listed them (rule 12). */
export function tieBreakOrder(criteria: readonly Criterion[]): Criterion[] {
  return [...criteria].sort((a, b) => b.weight - a.weight || a.position - b.position);
}

/** Negative when a ranks above b, 0 when nothing separates them. Unscored dishes go last. */
function compare(a: EntryScore, b: EntryScore, order: readonly Criterion[]): number {
  if (a.score === null || b.score === null) return a.score === b.score ? 0 : a.score === null ? 1 : -1;
  if (Math.abs(a.score - b.score) > EPSILON) return b.score - a.score;
  for (const c of order) {
    // Both are scored, so both have every criterion's average.
    const diff = b.byCriterion[c.id]! - a.byCriterion[c.id]!;
    if (Math.abs(diff) > EPSILON) return diff;
  }
  return 0;
}

/**
 * Standard competition ranking, as for family votes: a tie the criteria can't
 * break shares a place and the next place skips by its size (rule 12). Tied
 * dishes are listed in the order given.
 */
export function rankScores(results: readonly EntryScore[], criteria: readonly Criterion[]): ScorePlacing[] {
  const order = tieBreakOrder(criteria);
  const sorted = [...results].sort((a, b) => compare(a, b, order));
  const placings: ScorePlacing[] = [];
  let previous: EntryScore | undefined;
  sorted.forEach((r, i) => {
    const last = placings[placings.length - 1];
    if (last && previous && compare(previous, r, order) === 0) last.entryIds.push(r.entryId);
    else placings.push({ place: i + 1, entryIds: [r.entryId], score: r.score });
    previous = r;
  });
  return placings;
}

/** A score as people read it: two decimals, e.g. 8.74. */
export function formatScore(score: number): string {
  return score.toFixed(2);
}

export interface CookResult {
  entryId: string;
  categoryId: string;
  cookName: string;
  score: number | null;
}

export interface GrandChampion {
  /** The cook's name as first entered. */
  cook: string;
  /** Their best score in each category, added up. */
  total: number;
  /** The dishes that made up the total, one per category, in category order. */
  entryIds: string[];
}

/** Cooks are matched by name, ignoring case and spacing: "Ana  Ruiz" is "ana ruiz". */
export function cookKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The Grand Champion (rule 16): the best total across every category, for cooks
 * with a scored dish in each one. A cook with two dishes in a category counts
 * their better one. Only meaningful with two or more categories, so fewer gives
 * nobody. A tie on the total shares the title: there's no criterion to break it
 * on across categories. Nobody qualifying gives an empty list.
 */
export function grandChampions(results: readonly CookResult[], categoryIds: readonly string[]): GrandChampion[] {
  if (categoryIds.length < 2) return [];
  const cooks = new Map<string, { cook: string; best: Map<string, CookResult> }>();
  for (const r of results) {
    if (r.score === null) continue;
    const key = cookKey(r.cookName);
    const cook = cooks.get(key) ?? { cook: r.cookName.trim(), best: new Map() };
    const current = cook.best.get(r.categoryId);
    if (!current || r.score > current.score!) cook.best.set(r.categoryId, r);
    cooks.set(key, cook);
  }
  const eligible = [...cooks.values()]
    .filter((c) => categoryIds.every((id) => c.best.has(id)))
    .map((c) => ({
      cook: c.cook,
      total: categoryIds.reduce((sum, id) => sum + c.best.get(id)!.score!, 0),
      entryIds: categoryIds.map((id) => c.best.get(id)!.entryId),
    }));
  if (!eligible.length) return [];
  const top = Math.max(...eligible.map((c) => c.total));
  return eligible.filter((c) => top - c.total <= EPSILON);
}
