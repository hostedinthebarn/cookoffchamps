import { describe, expect, it } from "vitest";
import { csvCell } from "../../src/worker/results";
import { call, deviceCookie, login, send, stubTurnstile, vote } from "./helpers";

// Pro events, part 3 (SW-25; pro-events.md rules 2, 14 and 16–19): People's
// Choice, the Grand Champion, the final reveal, the guests' results, the
// cooks' comments and the organizer's export.

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

async function proEvent(email: string, categories = ["Main"]) {
  const cookie = await login(email);
  const { id } = await (await send("/api/events", "POST", { name: "Judged", kind: "pro" }, cookie)).json<{ id: string }>();
  // Taste ×2, Texture ×1.5, Appearance ×1, Aroma ×1.
  const { criteria } = await (await send(`/api/events/${id}/criteria/preset`, "POST", { preset: "general" }, cookie)).json<{ criteria: Criterion[] }>();
  for (const name of categories.slice(1)) await send(`/api/events/${id}/categories`, "POST", { name }, cookie);
  const view = await (await call(`/api/events/${id}`, { cookie })).json<{ categories: { id: string }[] }>();
  return { cookie, id, criteria, categoryIds: view.categories.map((c) => c.id) };
}

async function addDish(cookie: string, categoryId: string, cookName: string, ticket: string | null, dishName = "Chili") {
  const form = new FormData();
  form.set("cookName", cookName);
  form.set("dishName", dishName);
  if (ticket) form.set("ticket", ticket);
  return (await call(`/api/categories/${categoryId}/entries`, { method: "POST", cookie, body: form })).json<{ id: string }>();
}

async function addJudge(cookie: string, eventId: string, name: string) {
  return (await (await send(`/api/events/${eventId}/judges`, "POST", { name }, cookie)).json<{ id: string }>()).id;
}

const setStatus = (cookie: string, id: string, status: string) => send(`/api/events/${id}/status`, "POST", { status }, cookie);
const all = (criteria: Criterion[], score: number) => Object.fromEntries(criteria.map((c) => [c.id, score]));
const score = (judgeId: string, entryId: string, scores: Record<string, number>, comment?: string) =>
  send(`/api/public/judges/${judgeId}/scores`, "POST", { entryId, scores, comment });
const guestView = async (id: string, cookie?: string) => (await call(`/api/public/events/${id}`, { cookie })).json<GuestView>();

interface GuestEntry {
  id: string;
  ticket: string;
  dishName: string;
  cookName?: string;
  votes?: number;
  score?: number | null;
  byCriterion?: Record<string, number>;
}

interface GuestView {
  event: { kind: string; status: string; peoplesChoice: boolean; cookComments: boolean };
  criteria?: Criterion[];
  grandChampion?: { cook: string; total: number; entryIds: string[] }[] | null;
  categories: {
    id: string;
    entries: GuestEntry[];
    scorePlacings?: { place: number; entryIds: string[]; score: number | null }[];
    peoplesChoice?: { entryIds: string[]; votes: number } | null;
  }[];
}

describe("results settings", () => {
  it("default to People's Choice on, the rest off, and are fixed once the results are out", async () => {
    const { cookie, id } = await proEvent("results-settings@example.com");
    type View = { judging: { peoplesChoice: boolean; grandChampion: boolean; cookComments: boolean } };
    const get = async () => (await (await call(`/api/events/${id}`, { cookie })).json<View>()).judging;
    expect(await get()).toMatchObject({ peoplesChoice: true, grandChampion: false, cookComments: false });
    const patch = await send(`/api/events/${id}`, "PATCH", { peoplesChoice: false, grandChampion: true, cookComments: true }, cookie);
    expect(patch.status).toBe(200);
    expect(await get()).toMatchObject({ peoplesChoice: false, grandChampion: true, cookComments: true });
    expect((await send(`/api/events/${id}`, "PATCH", { cookComments: "yes" }, cookie)).status).toBe(400);

    await env_reveal(cookie, id);
    const late = await send(`/api/events/${id}`, "PATCH", { cookComments: false }, cookie);
    expect(late.status).toBe(409);
    expect((await late.json<{ code: string }>()).code).toBe("criteriaFixed");
    // Sending the same values isn't a change, so it's fine.
    expect((await send(`/api/events/${id}`, "PATCH", { cookComments: true, name: "Renamed" }, cookie)).status).toBe(200);
  });
});

/** Opens, closes and reveals an event. */
async function env_reveal(cookie: string, id: string) {
  await setStatus(cookie, id, "open");
  await setStatus(cookie, id, "closed");
  expect((await setStatus(cookie, id, "revealed")).status).toBe(200);
}

describe("a pro reveal (rule 18)", () => {
  it("is final: the results can't be hidden again", async () => {
    const { cookie, id } = await proEvent("final@example.com");
    await env_reveal(cookie, id);
    const undo = await setStatus(cookie, id, "closed");
    expect(undo.status).toBe(409);
    expect((await undo.json<{ code: string }>()).code).toBe("resultsFinal");
  });
});

describe("guests in a pro event", () => {
  it("see only turned-in dishes, by ticket, with the dish name hidden unless judges see it (rules 3 and 6)", async () => {
    const { cookie, id, categoryIds } = await proEvent("guest-pro@example.com");
    await addDish(cookie, categoryIds[0]!, "Ana", "300", "Brisket chili");
    await addDish(cookie, categoryIds[0]!, "Ben", "21", "Verde");
    await addDish(cookie, categoryIds[0]!, "Cy", null, "Not yet");
    let view = await guestView(id);
    expect(view.event).toMatchObject({ kind: "pro", peoplesChoice: true, cookComments: false });
    // In ticket order, numerically.
    expect(view.categories[0]!.entries.map((e) => [e.ticket, e.dishName])).toEqual([["21", ""], ["300", ""]]);
    expect(JSON.stringify(view)).not.toContain("Ana");

    await send(`/api/events/${id}`, "PATCH", { showDishNames: true }, cookie);
    view = await guestView(id);
    expect(view.categories[0]!.entries.map((e) => e.dishName)).toEqual(["Verde", "Brisket chili"]);
  });

  it("vote for People's Choice only when it's on, and only for a turned-in dish (rule 2)", async () => {
    stubTurnstile();
    const { cookie, id, categoryIds } = await proEvent("pc-vote@example.com");
    const a = await addDish(cookie, categoryIds[0]!, "Ana", "1");
    const untagged = await addDish(cookie, categoryIds[0]!, "Cy", null);
    await setStatus(cookie, id, "open");
    expect((await vote(id, categoryIds[0]!, untagged.id)).status).toBe(400);
    expect((await vote(id, categoryIds[0]!, a.id)).status).toBe(200);

    await setStatus(cookie, id, "closed");
    await send(`/api/events/${id}`, "PATCH", { peoplesChoice: false }, cookie);
    await setStatus(cookie, id, "open");
    const off = await vote(id, categoryIds[0]!, a.id);
    expect(off.status).toBe(409);
    expect((await off.json<{ code: string }>()).code).toBe("noPeoplesChoice");
  });
});

describe("the results (rules 2, 16, 17 and 19)", () => {
  it("place by the judges, with People's Choice, the Grand Champion and the breakdown, never naming a judge", async () => {
    stubTurnstile();
    const { cookie, id, criteria, categoryIds } = await proEvent("results@example.com", ["Chili", "Dessert"]);
    const [chili, dessert] = categoryIds as [string, string];
    await send(`/api/events/${id}`, "PATCH", { grandChampion: true, cookComments: true }, cookie);
    const anaChili = await addDish(cookie, chili, "Ana Ruiz", "11", "Red");
    const benChili = await addDish(cookie, chili, "Ben", "12", "Green");
    const anaPie = await addDish(cookie, dessert, "ana ruiz", "21", "Pie");
    const unscored = await addDish(cookie, dessert, "Ben", "22", "Flan");
    const pat = await addJudge(cookie, id, "Pat Judgewell");
    await setStatus(cookie, id, "open");
    await score(pat, anaChili.id, all(criteria, 8), "Lovely heat");
    await score(pat, benChili.id, all(criteria, 9));
    await score(pat, anaPie.id, all(criteria, 7));
    // Guests love Ana's chili; nobody votes in dessert.
    // Three phones; the first changes its mind, which replaces its vote.
    const first = await vote(id, chili, benChili.id);
    await vote(id, chili, anaChili.id, deviceCookie(first));
    await vote(id, chili, anaChili.id);
    await vote(id, chili, benChili.id);
    await setStatus(cookie, id, "closed");

    // Before the reveal, guests get no results.
    expect((await guestView(id)).categories[0]!.scorePlacings).toBeUndefined();

    // The organizer's totals carry the awards, and the comments by judge.
    type Judged = {
      peoplesChoice: Record<string, { entryIds: string[]; votes: number }>;
      grandChampion: { cook: string; total: number }[];
      criteria: Criterion[];
      comments: { entryId: string; judge: string; comment: string }[];
    };
    const { judged } = await (await call(`/api/events/${id}/totals`, { cookie })).json<{ judged: Judged }>();
    expect(judged.peoplesChoice).toEqual({ [chili]: { place: 1, entryIds: [anaChili.id], votes: 2 } });
    expect(judged.grandChampion).toEqual([{ cook: "Ana Ruiz", total: 15, entryIds: [anaChili.id, anaPie.id] }]);
    expect(judged.criteria.map((c) => c.name)).toEqual(["Taste", "Texture", "Appearance", "Aroma"]);
    expect(judged.comments).toEqual([{ entryId: anaChili.id, judgeId: pat, judge: "Pat Judgewell", comment: "Lovely heat" }]);

    await setStatus(cookie, id, "revealed");
    const view = await guestView(id);
    expect(view.event.cookComments).toBe(true);
    expect(view.grandChampion!.map((g) => g.cook)).toEqual(["Ana Ruiz"]);
    expect(view.criteria!.map((c) => c.weight)).toEqual([2, 1.5, 1, 1]);
    const [c1, c2] = view.categories as [GuestView["categories"][0], GuestView["categories"][0]];
    expect(c1.scorePlacings!.map((p) => [p.place, p.entryIds, p.score])).toEqual([[1, [benChili.id], 9], [2, [anaChili.id], 8]]);
    expect(c1.peoplesChoice!.entryIds).toEqual([anaChili.id]);
    expect(c2.peoplesChoice).toBeNull();
    const red = c1.entries.find((e) => e.id === anaChili.id)!;
    expect(red).toMatchObject({ cookName: "Ana Ruiz", votes: 2, score: 8, dishName: "Red" });
    expect(Object.values(red.byCriterion!)).toEqual([8, 8, 8, 8]);
    expect(c2.entries.find((e) => e.id === unscored.id)!.score).toBeNull();
    expect(JSON.stringify(view)).not.toContain("Pat");
  });

  it("leave the awards out when they're off", async () => {
    const { cookie, id } = await proEvent("no-awards@example.com", ["A", "B"]);
    await send(`/api/events/${id}`, "PATCH", { peoplesChoice: false }, cookie);
    await env_reveal(cookie, id);
    const view = await guestView(id);
    expect(view.grandChampion).toBeNull();
    expect(view.categories.map((c) => c.peoplesChoice)).toEqual([null, null]);
  });
});

describe("cooks' comments (rule 14)", () => {
  it("show a dish's comments by ticket after the reveal, without the judge's name", async () => {
    const { cookie, id, criteria, categoryIds } = await proEvent("comments@example.com");
    await send(`/api/events/${id}`, "PATCH", { cookComments: true }, cookie);
    const dish = await addDish(cookie, categoryIds[0]!, "Ana", "A-7");
    const quiet = await addDish(cookie, categoryIds[0]!, "Ben", "B-1");
    const kept = await addJudge(cookie, id, "Kept");
    const dropped = await addJudge(cookie, id, "Dropped");
    await setStatus(cookie, id, "open");
    await score(kept, dish.id, all(criteria, 8), "More salt");
    await score(dropped, dish.id, all(criteria, 1), "Rigged");
    await score(kept, quiet.id, all(criteria, 6));
    // A compromised link: its scores and comments go.
    await send(`/api/judges/${dropped}`, "DELETE", { keepScores: false }, cookie);

    const read = (ticket: string) => call(`/api/public/events/${id}/comments/${ticket}`);
    const early = await read("A-7");
    expect(early.status).toBe(409);
    expect((await early.json<{ code: string }>()).code).toBe("commentsUnavailable");

    await setStatus(cookie, id, "closed");
    await setStatus(cookie, id, "revealed");
    expect(await (await read("a-7")).json()).toEqual({ ticket: "A-7", comments: ["More salt"] });
    expect(await (await read("B-1")).json()).toEqual({ ticket: "B-1", comments: [] });
    const unknown = await read("999");
    expect(unknown.status).toBe(404);
    expect((await unknown.json<{ code: string }>()).code).toBe("noSuchTicket");
  });

  it("are unavailable when the organizer left them off, and in family events", async () => {
    const { cookie, id } = await proEvent("comments-off@example.com");
    await env_reveal(cookie, id);
    expect((await call(`/api/public/events/${id}/comments/1`)).status).toBe(409);
    const family = await (await send("/api/events", "POST", { name: "Family" }, cookie)).json<{ id: string }>();
    expect((await call(`/api/public/events/${family.id}/comments/1`)).status).toBe(409);
  });
});

describe("the organizer's export (rule 19)", () => {
  it("has a row per judge per dish, with their scores and comments, and defuses formulas", async () => {
    const { cookie, id, criteria, categoryIds } = await proEvent("export@example.com");
    const dish = await addDish(cookie, categoryIds[0]!, "=HYPERLINK(\"x\")", "1", "Red, hot");
    const other = await addDish(cookie, categoryIds[0]!, "Ben", "2", "Mild");
    const pat = await addJudge(cookie, id, "Pat");
    const lee = await addJudge(cookie, id, "Lee");
    await setStatus(cookie, id, "open");
    await score(lee, dish.id, { ...all(criteria, 7), [criteria[0]!.id]: 9 }, "Line one\nline two");
    await score(pat, dish.id, all(criteria, 8));
    await setStatus(cookie, id, "closed");

    const res = await call(`/api/events/${id}/export.csv`, { cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="cookoff-[A-Z0-9]{6}\.csv"$/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = new TextDecoder().decode(bytes).split("\r\n");
    expect(lines[0]).toBe(
      "Category,Ticket,Cook,Dish,Place,Final score,Judges counted,People's Choice votes,Judge,Taste,Texture,Appearance,Aroma,Judge's score,Comment",
    );
    // Judges in the order they were added; Lee's weighted score is (9·2 + 7·3.5) / 5.5 = 7.73, so the dish averages 7.86.
    expect(lines[1]).toBe(`Main,1,"'=HYPERLINK(""x"")","Red, hot",1,7.86,2,0,Pat,8,8,8,8,8.00,`);
    expect(lines[2]).toBe(`Main,1,"'=HYPERLINK(""x"")","Red, hot",1,7.86,2,0,Lee,9,7,7,7,7.73,"Line one\nline two"`);
    // A dish nobody scored still has a row.
    expect(lines[3]).toBe("Main,2,Ben,Mild,2,,0,0,,,,,,,");
    expect(lines[4]).toBe("");
    expect(other.id).toBeTruthy();

    const es = await (await call(`/api/events/${id}/export.csv?lang=es`, { cookie })).text();
    expect(es.split("\r\n")[0]).toMatch(/^Categoría,Boleto,Cocinero,Platillo,/);
  });

  it("is for organizers of pro events only", async () => {
    const { id } = await proEvent("export-owner@example.com");
    const stranger = await login("export-stranger@example.com");
    expect((await call(`/api/events/${id}/export.csv`, { cookie: stranger })).status).toBe(403);
    const family = await (await send("/api/events", "POST", { name: "Family" }, stranger)).json<{ id: string }>();
    const res = await call(`/api/events/${family.id}/export.csv`, { cookie: stranger });
    expect(res.status).toBe(409);
    expect((await res.json<{ code: string }>()).code).toBe("notPro");
  });

  it("quotes cells only when it must", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(8)).toBe("8");
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@me")).toBe("'@me");
  });
});
