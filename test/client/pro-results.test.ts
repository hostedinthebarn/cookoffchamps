import { afterEach, describe, expect, it, vi } from "vitest";
import type { ManageView, PublicView, Totals } from "../../src/client/types";
import { printView } from "../../src/client/views/print";
import { buildProSlides, revealView, slideLabel } from "../../src/client/views/reveal";
import { voteView } from "../../src/client/views/vote";
import { es } from "../../src/client/i18n/es";
import { fakeApi, flush, makeCtx } from "./helpers";

vi.mock("../../src/client/turnstile", () => ({ getTurnstileToken: vi.fn(async () => "tok") }));

// Pro events, part 3 (SW-25; rules 2, 6, 14 and 16–19): the reveal, the
// guests' page and results, and the tent cards.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const judging = { criteria: [], dropOutliers: true, showDishNames: false, peoplesChoice: true, grandChampion: true, cookComments: false, scored: [] };

function manage(status: ManageView["event"]["status"], overrides: Partial<ManageView> = {}): ManageView {
  const entry = (id: string, categoryId: string, ticket: string | null, cookName: string, dishName: string, photoKey: string | null = null) =>
    ({ id, categoryId, number: 1, ticket, cookName, dishName, photoKey });
  return {
    event: { id: "e1", code: "K7QM2X", name: "Judged", date: null, status, kind: "pro" },
    role: "creator",
    proPreview: true,
    categories: [{ id: "c1", name: "Chili", position: 1 }, { id: "c2", name: "Dessert", position: 2 }],
    entries: [
      entry("a", "c1", "11", "Ana", "Red", "events/e1/a"),
      entry("b", "c1", "12", "Ben", ""),
      entry("c", "c1", "13", "Cy", "Verde"),
      entry("d", "c1", "14", "Di", "Mild"),
      entry("p", "c2", "21", "Ana", "Pie"),
      entry("q", "c2", "22", "Bo", "Flan"),
      entry("z", "c2", null, "Zed", "Late"),
    ],
    organizers: [],
    votesCast: [],
    judges: [],
    judging,
    ...overrides,
  };
}

const judged: NonNullable<Totals["judged"]> = {
  scores: [],
  placings: {
    c1: [
      { place: 1, entryIds: ["b"], score: 9 },
      { place: 2, entryIds: ["a"], score: 8 },
      { place: 3, entryIds: ["c"], score: 7 },
      { place: 4, entryIds: ["d"], score: 6 },
    ],
    c2: [{ place: 1, entryIds: ["p"], score: 7.5 }, { place: 2, entryIds: ["q"], score: null }],
  },
  criteria: [],
  peoplesChoice: { c1: { place: 1, entryIds: ["a"], votes: 4 } },
  grandChampion: [{ cook: "Ana", total: 15.5, entryIds: ["a", "p"] }],
  comments: [],
};

describe("the pro reveal's slides (rule 17)", () => {
  it("go People's Choice, then each category 3rd to 1st, then the Grand Champion", () => {
    const slides = buildProSlides(manage("closed"), judged);
    expect(slides.map((s) => [s.category, s.award ?? s.step.place, s.step.entryIds, s.score])).toEqual([
      ["Chili", "peoples", ["a"], undefined],
      ["Chili", 3, ["c"], 7],
      ["Chili", 2, ["a"], 8],
      ["Chili", 1, ["b"], 9],
      // Flan wasn't scored, so isn't revealed.
      ["Dessert", 1, ["p"], 7.5],
      [null, "grand", [], undefined],
    ]);
    expect(slides.map(slideLabel)).toEqual(["People's Choice", "3rd place", "2nd place", "Champion!", "Champion!", "Grand Champion"]);
  });

  it("skip the awards when they're off, and share a tied first place", () => {
    const one = manage("closed", { categories: [{ id: "c1", name: "Main", position: 1 }] });
    const tied = { ...judged, placings: { c1: [{ place: 1, entryIds: ["a", "b"], score: 8 }] }, peoplesChoice: null, grandChampion: null };
    const slides = buildProSlides(one, tied);
    expect(slides).toHaveLength(1);
    expect(slides[0]!.category).toBeNull();
    expect(slideLabel(slides[0]!)).toBe("Co-champions!");
    expect(buildProSlides(one, { ...tied, placings: {}, grandChampion: [] })).toEqual([]);
    const voted = buildProSlides(one, { ...tied, peoplesChoice: { c1: { place: 1, entryIds: ["a"], votes: 2 } } });
    expect(voted.map((s) => [s.category, s.award])).toEqual([[null, "peoples"], [null, undefined]]);
  });
});

describe("the pro reveal screen", () => {
  it("shows tickets and scores, then the Grand Champion, then publishes the results", async () => {
    const calls = fakeApi({
      "GET /api/events/e1": manage("closed"),
      "GET /api/events/e1/totals": { totals: [], judged },
      "POST /api/events/e1/status": { status: "revealed" },
    });
    const ctx = makeCtx("/e/e1/reveal");
    const cleanup = await revealView(ctx, "e1");
    const stage = ctx.root.querySelector<HTMLElement>(".reveal")!;
    expect(stage.textContent).toContain("Tap to start");

    stage.click();
    expect(stage.querySelector(".place")!.textContent).toBe("People's Choice");
    expect(stage.querySelector(".medal")!.textContent).toBe("★");
    expect(stage.querySelector(".confetti")).toBeNull();
    expect(stage.querySelector(".number")!.textContent).toBe("Ticket 11");
    expect(stage.querySelector(".votes")!.textContent).toBe("4 votes");
    stage.click();
    expect(stage.querySelector(".place")!.textContent).toBe("3rd place");
    expect(stage.querySelector(".dish-name")!.textContent).toBe("Verde");
    expect(stage.querySelector(".votes")!.textContent).toBe("Score 7.00");
    stage.click();
    stage.click();
    expect(stage.querySelector(".place")!.textContent).toBe("Champion!");
    // Ben's dish has no name: the ticket stands in.
    expect(stage.querySelector(".dish-name")).toBeNull();
    expect(stage.querySelector(".confetti")).not.toBeNull();
    stage.click();
    expect(stage.querySelector(".category")!.textContent).toBe("Dessert");
    stage.click();
    await flush();
    expect(stage.querySelector(".place")!.textContent).toBe("Grand Champion");
    expect(stage.querySelector(".cook")!.textContent).toBe("Ana");
    expect(stage.querySelector(".votes")!.textContent).toBe("15.50 across every category");
    expect(stage.querySelector(".confetti")).not.toBeNull();
    expect(calls.at(-1)).toMatchObject({ method: "POST", path: "/api/events/e1/status", body: { status: "revealed" } });
    cleanup();
  });
});

function guest(status: PublicView["event"]["status"], event: Partial<PublicView["event"]> = {}, overrides: Partial<PublicView> = {}): PublicView {
  return {
    event: { id: "e1", code: "K7", name: "Judged", date: null, status, kind: "pro", peoplesChoice: true, cookComments: false, ...event },
    turnstileSiteKey: "site",
    myVotes: {},
    categories: [
      {
        id: "c1",
        name: "Main",
        entries: [
          { id: "a", number: 1, ticket: "21", dishName: "", photoKey: "events/e1/a" },
          { id: "b", number: 2, ticket: "22", dishName: "Verde", photoKey: null },
        ],
      },
    ],
    ...overrides,
  };
}

describe("a pro event's guest page", () => {
  it("names dishes by ticket, and votes for People's Choice when it's on (rules 2 and 3)", async () => {
    fakeApi({ "GET /api/public/events/e1": guest("open") });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    const [a, b] = [...ctx.root.querySelectorAll<HTMLElement>(".dish")] as [HTMLElement, HTMLElement];
    expect(a.querySelector(".number")!.textContent).toBe("Ticket 21");
    expect(a.querySelector(".dish-name")).toBeNull();
    expect(a.querySelector("img")!.getAttribute("alt")).toBe("Ticket 21");
    expect(a.getAttribute("aria-label")).toBe("Ticket 21");
    expect(b.getAttribute("aria-label")).toBe("Ticket 22, Verde");
    expect(ctx.root.textContent).toContain("Tap your favourite dish.");
  });

  it("names an unnamed dish by its ticket alone in Spanish too", () => {
    expect(es.vote.ticketAria("21", "")).toBe("Boleto 21");
    expect(es.vote.ticketAria("21", "Chile")).toBe("Boleto 21, Chile");
  });

  it("only shows the dishes when the judges alone decide", async () => {
    for (const [status, text] of [["setup", "The judges are scoring"], ["open", "The judges are scoring"], ["closed", "Voting is closed."]] as const) {
      fakeApi({ "GET /api/public/events/e1": guest(status, { peoplesChoice: false }) });
      const ctx = makeCtx("/v/e1");
      await voteView(ctx, "e1");
      expect(ctx.root.textContent).toContain(text);
      expect(ctx.root.querySelector(".dish")!.getAttribute("role")).toBeNull();
    }
  });
});

const revealed = (cookComments: boolean) =>
  guest("revealed", { cookComments }, {
    criteria: [{ id: "taste", name: "Taste", weight: 2 }, { id: "look", name: "Looks", weight: 1 }],
    grandChampion: [{ cook: "Ana", total: 16.25, entryIds: ["a", "p"] }],
    categories: [
      {
        id: "c1",
        name: "Chili",
        entries: [
          { id: "a", number: 1, ticket: "21", dishName: "Red", photoKey: null, cookName: "Ana", votes: 5, score: 8.5, byCriterion: { taste: 9, look: 7.5 } },
          { id: "b", number: 2, ticket: "22", dishName: "Verde", photoKey: null, cookName: "Ben", votes: 1, score: null, byCriterion: {} },
        ],
        scorePlacings: [{ place: 1, entryIds: ["a"], score: 8.5 }, { place: 2, entryIds: ["b"], score: null }],
        peoplesChoice: { place: 1, entryIds: ["a"], votes: 5 },
      },
      {
        id: "c2",
        name: "Dessert",
        entries: [
          { id: "p", number: 1, ticket: "31", dishName: "Pie", photoKey: null, cookName: "Ana", votes: 0, score: 7.75, byCriterion: { taste: 8, look: 7.25 } },
          { id: "q", number: 2, ticket: "32", dishName: "Flan", photoKey: null, cookName: "Bo", votes: 0, score: 7.75, byCriterion: { taste: 8, look: 7.25 } },
        ],
        scorePlacings: [{ place: 1, entryIds: ["p", "q"], score: 7.75 }],
        peoplesChoice: null,
      },
    ],
  });

describe("a pro event's results (rule 19)", () => {
  it("show the Grand Champion, People's Choice, the judged places and the breakdown", async () => {
    fakeApi({ "GET /api/public/events/e1": revealed(false) });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    const sections = [...ctx.root.querySelectorAll("section.results")];
    expect(sections.map((s) => s.querySelector("h2")!.textContent)).toEqual(["Grand Champion", "Chili", "Dessert"]);
    expect(sections[0]!.querySelector(".cook")!.textContent).toBe("Ana 16.25 across every category");
    const chili = sections[1]!;
    expect(chili.querySelector(".peoples-choice .place")!.textContent).toBe("People's Choice");
    expect(chili.querySelector(".peoples-choice .votes")!.textContent).toBe("5 votes");
    // The unscored dish isn't placed.
    expect(chili.querySelectorAll(".placings > li")).toHaveLength(1);
    expect(chili.querySelector(".placings .votes")!.textContent).toBe("Score 8.50");
    expect(chili.querySelector(".breakdown summary")!.textContent).toBe("How the judges scored it");
    expect([...chili.querySelectorAll(".breakdown li")].map((li) => li.textContent)).toEqual(["Taste: 9.00", "Looks: 7.50"]);
    const dessert = sections[2]!;
    expect(dessert.querySelector(".peoples-choice")).toBeNull();
    expect(dessert.querySelector(".placings .place")!.textContent).toBe("Co-champions!");
    expect(ctx.root.querySelector(".comment-lookup")).toBeNull();
    expect(ctx.root.querySelector(".made-with")).not.toBeNull();
  });

  it("place a lone category without a heading, and without a Grand Champion", async () => {
    const one = revealed(false);
    fakeApi({ "GET /api/public/events/e1": { ...one, grandChampion: null, categories: [{ ...one.categories[0]!, scorePlacings: [{ place: 2, entryIds: ["a"], score: 8.5 }] }] } });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect(ctx.root.querySelector("section.results h2")).toBeNull();
    expect(ctx.root.querySelector(".placings .place")!.textContent).toBe("2nd place");
  });

  it("let a cook read the comments on their dish by ticket (rule 14)", async () => {
    fakeApi({
      "GET /api/public/events/e1": revealed(true),
      "GET /api/public/events/e1/comments/A-7": { ticket: "A-7", comments: ["More salt", "Lovely"] },
      "GET /api/public/events/e1/comments/22": { ticket: "22", comments: [] },
      "GET /api/public/events/e1/comments/9": [404, { error: "No dish has that ticket number", code: "noSuchTicket" }],
    });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    const form = ctx.root.querySelector<HTMLFormElement>(".comment-lookup")!;
    const input = form.querySelector<HTMLInputElement>('input[name="ticket"]')!;
    const ask = async (ticket: string) => {
      input.value = ticket;
      form.dispatchEvent(new Event("submit", { cancelable: true }));
      await flush();
      return ctx.root.querySelector(".comments")!;
    };
    expect([...(await ask(" A-7 ")).querySelectorAll("li")].map((li) => li.textContent)).toEqual(["More salt", "Lovely"]);
    expect((await ask("22")).textContent).toBe("The judges left no comments on that dish.");
    expect((await ask("9")).querySelector(".error")!.textContent).toBe("No dish has that ticket number");
  });
});

describe("a pro event's tent cards (rules 3 and 6)", () => {
  it("carry the ticket, and the dish name only if the judges see it", async () => {
    fakeApi({ "GET /api/events/e1": manage("setup") });
    const ctx = makeCtx("/e/e1/print/cards");
    await printView(ctx, "e1", "cards");
    const cards = [...ctx.root.querySelectorAll(".tent-card")];
    // The dish without a ticket gets no card.
    expect(cards.map((c) => c.querySelector(".number")!.textContent)).toEqual(["Ticket 11", "Ticket 12", "Ticket 13", "Ticket 14", "Ticket 21", "Ticket 22"]);
    expect(ctx.root.querySelector(".tent-card .dish-name")).toBeNull();

    fakeApi({ "GET /api/events/e1": manage("setup", { judging: { ...judging, showDishNames: true } }) });
    await printView(ctx, "e1", "cards");
    expect(ctx.root.querySelector(".tent-card .dish-name")!.textContent).toBe("Red");
  });

  it("wait for tickets", async () => {
    const view = manage("setup");
    fakeApi({ "GET /api/events/e1": { ...view, entries: view.entries.map((e) => ({ ...e, ticket: null })) } });
    const ctx = makeCtx("/e/e1/print/cards");
    await printView(ctx, "e1", "cards");
    expect(ctx.root.textContent).toContain("Tent cards show the ticket number");
    fakeApi({ "GET /api/events/e1": { ...view, entries: [] } });
    await printView(ctx, "e1", "cards");
    expect(ctx.root.textContent).toContain("Add some dishes first.");
  });
});
