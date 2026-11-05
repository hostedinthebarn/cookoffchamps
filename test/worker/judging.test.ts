import { describe, expect, it } from "vitest";
import { call, login, send } from "./helpers";

// Pro events, part 2 (SW-25): criteria, the judge's score sheet, locking and
// unlocking, and the judged standings. The maths is in test/shared/scoring.test.ts.

interface Criterion {
  id: string;
  name: string;
  weight: number;
  position: number;
}

async function proEvent(email: string, preset = "general") {
  const cookie = await login(email);
  const { id } = await (await send("/api/events", "POST", { name: "Judged", kind: "pro" }, cookie)).json<{ id: string }>();
  const { criteria } = await (await send(`/api/events/${id}/criteria/preset`, "POST", { preset }, cookie)).json<{ criteria: Criterion[] }>();
  const view = await (await call(`/api/events/${id}`, { cookie })).json<{ categories: { id: string }[] }>();
  return { cookie, id, criteria, categoryId: view.categories[0]!.id };
}

async function addDish(cookie: string, categoryId: string, ticket: string | null, dishName = "Chili") {
  const form = new FormData();
  form.set("cookName", `Cook ${ticket}`);
  form.set("dishName", dishName);
  if (ticket) form.set("ticket", ticket);
  return (await call(`/api/categories/${categoryId}/entries`, { method: "POST", cookie, body: form })).json<{ id: string }>();
}

async function addJudge(cookie: string, eventId: string, name: string) {
  return (await (await send(`/api/events/${eventId}/judges`, "POST", { name }, cookie)).json<{ id: string }>()).id;
}

const setStatus = (cookie: string, id: string, status: string) => send(`/api/events/${id}/status`, "POST", { status }, cookie);

/** Every criterion scored `score`. */
const all = (criteria: Criterion[], score: number) => Object.fromEntries(criteria.map((c) => [c.id, score]));

const score = (judgeId: string, body: unknown) => send(`/api/public/judges/${judgeId}/scores`, "POST", body);

describe("criteria (rule 8)", () => {
  it("start from a preset, weighted taste first, in the organizer's language", async () => {
    const { cookie, id, criteria } = await proEvent("presets@example.com");
    expect(criteria.map((c) => [c.name, c.weight, c.position])).toEqual([
      ["Taste", 2, 1],
      ["Texture", 1.5, 2],
      ["Appearance", 1, 3],
      ["Aroma", 1, 4],
    ]);
    const chili = await (await send(`/api/events/${id}/criteria/preset`, "POST", { preset: "chili", lang: "es" }, cookie)).json<{ criteria: Criterion[] }>();
    expect(chili.criteria.map((c) => c.name)).toEqual(["Sabor", "Consistencia", "Aroma", "Color", "Regusto"]);
    const bbq = await (await send(`/api/events/${id}/criteria/preset`, "POST", { preset: "bbq" }, cookie)).json<{ criteria: Criterion[] }>();
    expect(bbq.criteria.map((c) => [c.name, c.weight])).toEqual([["Taste", 2], ["Tenderness", 1.5], ["Appearance", 1]]);
    expect((await send(`/api/events/${id}/criteria/preset`, "POST", { preset: "toString" }, cookie)).status).toBe(400);
  });

  it("can be added, renamed, reweighted and removed while setting up", async () => {
    const { cookie, id, criteria } = await proEvent("edit-criteria@example.com");
    const added = await send(`/api/events/${id}/criteria`, "POST", { name: "Heat", weight: 0.5 }, cookie);
    expect(added.status).toBe(201);
    const { id: heat } = await added.json<{ id: string }>();
    expect((await send(`/api/criteria/${heat}`, "PATCH", { name: "Spice" }, cookie)).status).toBe(200);
    expect((await send(`/api/criteria/${heat}`, "PATCH", { weight: 3 }, cookie)).status).toBe(200);
    expect((await call(`/api/criteria/${criteria[3]!.id}`, { method: "DELETE", cookie })).status).toBe(200);
    const view = await (await call(`/api/events/${id}`, { cookie })).json<{ judging: { criteria: Criterion[] } }>();
    expect(view.judging.criteria.map((c) => [c.name, c.weight, c.position])).toEqual([
      ["Taste", 2, 1],
      ["Texture", 1.5, 2],
      ["Appearance", 1, 3],
      ["Spice", 3, 5],
    ]);
  });

  it("checks names, weights and the limit of 8", async () => {
    const { cookie, id, criteria } = await proEvent("criteria-rules@example.com");
    for (const weight of [0, 0.25, 5.5, "2", null]) {
      const res = await send(`/api/events/${id}/criteria`, "POST", { name: "X", weight }, cookie);
      expect(res.status).toBe(400);
    }
    expect(await (await send(`/api/criteria/${criteria[0]!.id}`, "PATCH", { weight: 1.2 }, cookie)).json()).toMatchObject({ code: "badWeight" });
    expect((await send(`/api/events/${id}/criteria`, "POST", { name: "", weight: 1 }, cookie)).status).toBe(400);
    expect((await send(`/api/criteria/${criteria[0]!.id}`, "PATCH", { name: "x".repeat(41) }, cookie)).status).toBe(400);
    for (let i = 0; i < 4; i++) await send(`/api/events/${id}/criteria`, "POST", { name: `C${i}`, weight: 1 }, cookie);
    const ninth = await send(`/api/events/${id}/criteria`, "POST", { name: "Ninth", weight: 1 }, cookie);
    expect(ninth.status).toBe(409);
    expect(await ninth.json()).toMatchObject({ code: "tooManyCriteria" });
  });

  it("belong to pro events and organizers, and are fixed once voting opens", async () => {
    const { cookie, id, criteria } = await proEvent("criteria-fixed@example.com");
    const stranger = await login("criteria-stranger@example.com");
    expect((await send(`/api/criteria/${criteria[0]!.id}`, "PATCH", { name: "Mine" }, stranger)).status).toBe(403);
    expect((await call(`/api/criteria/nope`, { method: "DELETE", cookie })).status).toBe(404);

    const family = await (await send("/api/events", "POST", { name: "Family" }, cookie)).json<{ id: string }>();
    const notPro = await send(`/api/events/${family.id}/criteria/preset`, "POST", { preset: "bbq" }, cookie);
    expect(await notPro.json()).toMatchObject({ code: "notPro" });

    await setStatus(cookie, id, "open");
    for (const res of [
      await send(`/api/events/${id}/criteria/preset`, "POST", { preset: "bbq" }, cookie),
      await send(`/api/events/${id}/criteria`, "POST", { name: "Late", weight: 1 }, cookie),
      await send(`/api/criteria/${criteria[0]!.id}`, "PATCH", { name: "Late" }, cookie),
      await call(`/api/criteria/${criteria[0]!.id}`, { method: "DELETE", cookie }),
    ]) {
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: "criteriaFixed" });
    }
  });

  it("must exist before a pro event opens", async () => {
    const cookie = await login("no-criteria@example.com");
    const { id } = await (await send("/api/events", "POST", { name: "Bare", kind: "pro" }, cookie)).json<{ id: string }>();
    const res = await setStatus(cookie, id, "open");
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "noCriteria" });
    // Family events open as before.
    const family = await (await send("/api/events", "POST", { name: "Family" }, cookie)).json<{ id: string }>();
    expect((await setStatus(cookie, family.id, "open")).status).toBe(200);
  });
});

describe("judging settings (rules 6 and 11)", () => {
  it("default to dropping outliers and hiding dish names, and can change until the results are out", async () => {
    const { cookie, id } = await proEvent("settings@example.com");
    const before = await (await call(`/api/events/${id}`, { cookie })).json<{ judging: Record<string, unknown> }>();
    expect(before.judging).toMatchObject({ dropOutliers: true, showDishNames: false, scored: [] });
    expect((await send(`/api/events/${id}`, "PATCH", { dropOutliers: false, showDishNames: true }, cookie)).status).toBe(200);
    const after = await (await call(`/api/events/${id}`, { cookie })).json<{ judging: Record<string, unknown> }>();
    expect(after.judging).toMatchObject({ dropOutliers: false, showDishNames: true });
    expect((await send(`/api/events/${id}`, "PATCH", { dropOutliers: "yes" }, cookie)).status).toBe(400);

    for (const s of ["open", "closed", "revealed"]) await setStatus(cookie, id, s);
    const fixed = await send(`/api/events/${id}`, "PATCH", { dropOutliers: true }, cookie);
    expect(await fixed.json()).toMatchObject({ code: "criteriaFixed" });
    expect((await send(`/api/events/${id}`, "PATCH", { showDishNames: false }, cookie)).status).toBe(409);
    // Sending the settings unchanged, as the edit form does, is fine.
    expect((await send(`/api/events/${id}`, "PATCH", { name: "Renamed", dropOutliers: false, showDishNames: true }, cookie)).status).toBe(200);
  });
});

describe("the judge's score sheet (rules 6, 9 and 10)", () => {
  it("lists the turned-in dishes by ticket only, with categories named when there are several", async () => {
    const { cookie, id, categoryId, criteria } = await proEvent("sheet@example.com");
    await addDish(cookie, categoryId, "300", "Verde");
    await addDish(cookie, categoryId, "214", "Red");
    await addDish(cookie, categoryId, null); // listed, not turned in yet
    const judge = await addJudge(cookie, id, "Pat");
    const page = await (await call(`/api/public/judges/${judge}`)).json<{ criteria: unknown[]; dishes: Record<string, unknown>[] }>();
    expect(page.criteria).toEqual(criteria.map(({ id: cid, name, weight }) => ({ id: cid, name, weight })));
    expect(page.dishes.map((d) => [d.ticket, d.category, d.dishName])).toEqual([["214", null, undefined], ["300", null, undefined]]);
    expect(JSON.stringify(page)).not.toContain("Cook ");

    await send(`/api/events/${id}/categories`, "POST", { name: "Dessert" }, cookie);
    await send(`/api/events/${id}`, "PATCH", { showDishNames: true }, cookie);
    const named = await (await call(`/api/public/judges/${judge}`)).json<{ dishes: Record<string, unknown>[] }>();
    expect(named.dishes[0]).toMatchObject({ ticket: "214", category: "Main", dishName: "Red" });
  });

  it("takes a judge's scores while open, and locks the card (rule 10)", async () => {
    const { cookie, id, categoryId, criteria } = await proEvent("score@example.com");
    const dish = await addDish(cookie, categoryId, "214");
    const judge = await addJudge(cookie, id, "Pat");
    const body = { entryId: dish.id, scores: all(criteria, 8), comment: "  Lovely heat  " };
    expect(await (await score(judge, body)).json()).toMatchObject({ code: "votingNotOpen" });

    await setStatus(cookie, id, "open");
    expect((await score(judge, body)).status).toBe(201);
    const page = await (await call(`/api/public/judges/${judge}`)).json<{ cards: unknown[] }>();
    expect(page.cards).toEqual([{ entryId: dish.id, scores: all(criteria, 8), comment: "Lovely heat", locked: true }]);
    const again = await score(judge, { ...body, scores: all(criteria, 2) });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ code: "scoreLocked" });

    const view = await (await call(`/api/events/${id}`, { cookie })).json<{ judging: { scored: unknown[] } }>();
    expect(view.judging.scored).toEqual([{ judgeId: judge, entryId: dish.id }]);
  });

  it("refuses incomplete or out-of-range scores, unknown dishes and long comments", async () => {
    const { cookie, id, categoryId, criteria } = await proEvent("bad-scores@example.com");
    const dish = await addDish(cookie, categoryId, "214");
    const untagged = await addDish(cookie, categoryId, null);
    const judge = await addJudge(cookie, id, "Pat");
    await setStatus(cookie, id, "open");
    const { [criteria[0]!.id]: _, ...missing } = all(criteria, 5);
    for (const scores of [missing, { ...all(criteria, 5), extra: 5 }, all(criteria, 0), all(criteria, 11), all(criteria, 7.5), { ...all(criteria, 5), [criteria[0]!.id]: "5" }, [5], null, "8"]) {
      const res = await score(judge, { entryId: dish.id, scores });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "badScore" });
    }
    expect(await (await score(judge, { entryId: untagged.id, scores: all(criteria, 5) })).json()).toMatchObject({ code: "notADish" });
    expect((await score(judge, { entryId: "nope", scores: all(criteria, 5) })).status).toBe(404);
    expect((await score(judge, { entryId: dish.id, scores: all(criteria, 5), comment: "x".repeat(501) })).status).toBe(400);
    expect((await score("nope", { entryId: dish.id, scores: all(criteria, 5) })).status).toBe(404);
    // An empty comment is no comment.
    expect((await score(judge, { entryId: dish.id, scores: all(criteria, 5), comment: "" })).status).toBe(201);
    const page = await (await call(`/api/public/judges/${judge}`)).json<{ cards: { comment: unknown }[] }>();
    expect(page.cards[0]!.comment).toBeNull();
  });

  it("can be unlocked by an organizer before the reveal, and then doesn't count until resubmitted", async () => {
    const { cookie, id, categoryId, criteria } = await proEvent("unlock@example.com");
    const dish = await addDish(cookie, categoryId, "214");
    const judge = await addJudge(cookie, id, "Pat");
    await setStatus(cookie, id, "open");
    const unlock = (c?: string, entryId = dish.id) => send(`/api/judges/${judge}/unlock`, "POST", { entryId }, c);
    expect(await (await unlock(cookie)).json()).toMatchObject({ code: "noScorecard" });
    await score(judge, { entryId: dish.id, scores: all(criteria, 9) });

    const stranger = await login("unlock-stranger@example.com");
    expect((await unlock(stranger)).status).toBe(403);
    expect((await unlock()).status).toBe(401);
    expect((await unlock(cookie)).status).toBe(200);
    expect((await unlock(cookie)).status).toBe(404); // already unlocked

    const totals = async () => (await (await call(`/api/events/${id}/totals`, { cookie })).json<{ judged: { scores: { score: number | null }[] } }>()).judged;
    expect((await totals()).scores[0]!.score).toBeNull();
    const page = await (await call(`/api/public/judges/${judge}`)).json<{ cards: { locked: boolean }[] }>();
    expect(page.cards[0]!.locked).toBe(false);
    expect((await score(judge, { entryId: dish.id, scores: all(criteria, 6) })).status).toBe(201);
    expect((await totals()).scores[0]!.score).toBe(6);

    for (const s of ["closed", "revealed"]) await setStatus(cookie, id, s);
    expect(await (await unlock(cookie)).json()).toMatchObject({ code: "badStatusChange" });
  });
});

describe("judged standings (rules 11–13)", () => {
  it("average the judges, drop the highest and lowest from 5 up, and leave out revoked judges", async () => {
    const { cookie, id, categoryId, criteria } = await proEvent("standings@example.com");
    const a = await addDish(cookie, categoryId, "1");
    const b = await addDish(cookie, categoryId, "2");
    await addDish(cookie, categoryId, null); // not turned in: not judged
    const judges = [];
    for (const name of ["J1", "J2", "J3", "J4", "J5"]) judges.push(await addJudge(cookie, id, name));
    await setStatus(cookie, id, "open");
    // Dish a: 10, 2, 7, 7, 7 → 7 with the outliers dropped. Dish b: 8 from the first two only.
    const forA = [10, 2, 7, 7, 7];
    for (const [i, judge] of judges.entries()) await score(judge, { entryId: a.id, scores: all(criteria, forA[i]!) });
    for (const judge of judges.slice(0, 2)) await score(judge, { entryId: b.id, scores: all(criteria, 8) });

    type Judged = { scores: { entryId: string; score: number; judges: number; counted: number }[]; placings: Record<string, { entryIds: string[]; place: number }[]> };
    const get = async () => (await (await call(`/api/events/${id}/totals`, { cookie })).json<{ totals: unknown[]; judged: Judged }>());
    let { judged, totals } = await get();
    expect(totals).toHaveLength(3); // People's Choice votes come as before
    expect(judged.scores.map((s) => [s.entryId, s.score, s.judges, s.counted])).toEqual([[a.id, 7, 5, 3], [b.id, 8, 2, 2]]);
    expect(judged.placings[categoryId]!.map((p) => p.entryIds)).toEqual([[b.id], [a.id]]);

    // With dropping off, dish a is the plain average.
    await send(`/api/events/${id}`, "PATCH", { dropOutliers: false }, cookie);
    ({ judged } = await get());
    expect(judged.scores[0]!.score).toBeCloseTo(6.6, 9);

    // Revoking J1 (the 10) with their scores dropped, as for a compromised link, takes them out.
    await send(`/api/judges/${judges[0]}`, "DELETE", { keepScores: false }, cookie);
    ({ judged } = await get());
    expect(judged.scores.map((s) => [s.score, s.judges])).toEqual([[5.75, 4], [8, 1]]);
    // Revoking J2 with their scores kept, as for a judge who left early, leaves them in.
    await send(`/api/judges/${judges[1]}`, "DELETE", { keepScores: true }, cookie);
    ({ judged } = await get());
    expect(judged.scores.map((s) => [s.score, s.judges])).toEqual([[5.75, 4], [8, 1]]);
    // Neither shows in the organizer's progress any more.
    const view = await (await call(`/api/events/${id}`, { cookie })).json<{ judges: unknown[]; judging: { scored: { judgeId: string }[] } }>();
    expect(view.judges).toHaveLength(3);
    expect(view.judging.scored.some((s) => s.judgeId === judges[0] || s.judgeId === judges[1])).toBe(false);
  });

  it("aren't sent for family events", async () => {
    const cookie = await login("family-totals@example.com");
    const { id } = await (await send("/api/events", "POST", { name: "Family" }, cookie)).json<{ id: string }>();
    expect(await (await call(`/api/events/${id}/totals`, { cookie })).json()).toEqual({ totals: [] });
  });
});
