import { describe, expect, it } from "vitest";
import { type Card, cardScore, entryScore, formatScore, rankScores, tieBreakOrder } from "../../src/shared/scoring";

// Rule 8's example weights: Taste ×2, Texture ×1.5, Appearance ×1, Aroma ×1.
const CRITERIA = [
  { id: "app", weight: 1, position: 1 },
  { id: "taste", weight: 2, position: 2 },
  { id: "texture", weight: 1.5, position: 3 },
  { id: "aroma", weight: 1, position: 4 },
];

const card = (judgeId: string, entryId: string, app: number, taste: number, texture: number, aroma: number): Card => ({
  judgeId,
  entryId,
  scores: { app, taste, texture, aroma },
});

describe("cardScore", () => {
  it("is the weighted average, on the same 1–10 scale", () => {
    expect(cardScore(card("j", "e", 10, 10, 10, 10), CRITERIA)).toBe(10);
    // (6·1 + 9·2 + 8·1.5 + 7·1) / 5.5 = 43 / 5.5
    expect(cardScore(card("j", "e", 6, 9, 8, 7), CRITERIA)).toBeCloseTo(7.818181, 5);
  });

  it("counts a missing criterion as nothing rather than failing", () => {
    expect(cardScore({ judgeId: "j", entryId: "e", scores: { taste: 10 } }, CRITERIA)).toBeCloseTo(20 / 5.5, 9);
  });
});

describe("entryScore", () => {
  it("averages the judges who scored the dish, and says how many that was (rule 13)", () => {
    const cards = [card("a", "e1", 8, 8, 8, 8), card("b", "e1", 6, 6, 6, 6), card("a", "e2", 1, 1, 1, 1)];
    const r = entryScore("e1", cards, CRITERIA, true);
    expect(r).toMatchObject({ entryId: "e1", score: 7, counted: 2, judges: 2 });
    expect(r.byCriterion).toEqual({ app: 7, taste: 7, texture: 7, aroma: 7 });
  });

  it("counts a criterion a card lacks as 0 in its average", () => {
    const r = entryScore("e", [{ judgeId: "a", entryId: "e", scores: { taste: 10 } }], CRITERIA, true);
    expect(r.byCriterion).toEqual({ app: 0, taste: 10, texture: 0, aroma: 0 });
  });

  it("has no score when nobody scored the dish", () => {
    expect(entryScore("e9", [], CRITERIA, true)).toEqual({ entryId: "e9", score: null, counted: 0, judges: 0, byCriterion: {} });
  });

  it("drops the highest and lowest judge from 5 judges up, when that's on (rule 11)", () => {
    const five = [10, 2, 7, 7, 7].map((s, i) => card(`j${i}`, "e", s, s, s, s));
    expect(entryScore("e", five, CRITERIA, true)).toMatchObject({ score: 7, counted: 3, judges: 5 });
    expect(entryScore("e", five, CRITERIA, false).score).toBeCloseTo(6.6, 9);
    // Below 5, nothing is dropped even with the setting on.
    expect(entryScore("e", five.slice(0, 4), CRITERIA, true)).toMatchObject({ counted: 4 });
  });
});

describe("rankScores", () => {
  const results = (cards: Card[], ids: string[]) => ids.map((id) => entryScore(id, cards, CRITERIA, true));

  it("ranks by score, unscored dishes last", () => {
    const cards = [card("a", "low", 5, 5, 5, 5), card("a", "high", 9, 9, 9, 9)];
    expect(rankScores(results(cards, ["low", "none", "high"]), CRITERIA)).toEqual([
      { place: 1, entryIds: ["high"], score: 9 },
      { place: 2, entryIds: ["low"], score: 5 },
      { place: 3, entryIds: ["none"], score: null },
    ]);
  });

  it("breaks an equal score on the heaviest criterion first, then the next (rule 12)", () => {
    // Both weigh in at 39/5.5; x is better on taste, the heaviest.
    const x = card("a", "x", 6, 8, 6, 8);
    const y = card("a", "y", 7, 7, 6, 9);
    expect(cardScore(x, CRITERIA)).toBeCloseTo(cardScore(y, CRITERIA), 9);
    const placings = rankScores(results([x, y], ["y", "x"]), CRITERIA);
    expect(placings.map((p) => p.entryIds)).toEqual([["x"], ["y"]]);
    expect(placings.map((p) => p.place)).toEqual([1, 2]);
  });

  it("falls through to the next criterion when the heaviest is level", () => {
    // Same taste (×2); p beats q on texture (×1.5), which outranks appearance and aroma.
    const p = card("a", "p", 5, 8, 8, 5);
    const q = card("a", "q", 7, 8, 6, 6);
    expect(cardScore(p, CRITERIA)).toBeCloseTo(cardScore(q, CRITERIA), 9);
    expect(rankScores(results([q, p], ["q", "p"]), CRITERIA).map((x) => x.entryIds)).toEqual([["p"], ["q"]]);
  });

  it("shares a place when nothing separates them, and skips the next place (1224)", () => {
    const cards = [card("a", "t1", 7, 7, 7, 7), card("a", "t2", 7, 7, 7, 7), card("a", "top", 9, 9, 9, 9), card("a", "last", 3, 3, 3, 3)];
    expect(rankScores(results(cards, ["top", "t1", "t2", "last", "u1", "u2"]), CRITERIA)).toEqual([
      { place: 1, entryIds: ["top"], score: 9 },
      { place: 2, entryIds: ["t1", "t2"], score: 7 },
      { place: 4, entryIds: ["last"], score: 3 },
      { place: 5, entryIds: ["u1", "u2"], score: null },
    ]);
  });

  it("orders equal weights by the organizer's list", () => {
    expect(tieBreakOrder(CRITERIA).map((c) => c.id)).toEqual(["taste", "texture", "app", "aroma"]);
  });
});

it("formats a score with two decimals", () => {
  expect(formatScore(43 / 5.5)).toBe("7.82");
  expect(formatScore(9)).toBe("9.00");
});
