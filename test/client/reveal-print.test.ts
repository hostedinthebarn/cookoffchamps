import { afterEach, describe, expect, it, vi } from "vitest";
import type { ManageView } from "../../src/client/types";
import { printView } from "../../src/client/views/print";
import { buildSlides, confetti, placeLabel, revealView } from "../../src/client/views/reveal";
import { byText, fakeApi, flush, makeCtx } from "./helpers";

function view(status: ManageView["event"]["status"], twoCategories = false): ManageView {
  return {
    event: { id: "e1", code: "K7QM2X", name: "Chili Night", date: null, status },
    role: "creator",
    categories: twoCategories
      ? [{ id: "c1", name: "Chili", position: 1 }, { id: "c2", name: "Dessert", position: 2 }]
      : [{ id: "c1", name: "Main", position: 1 }],
    entries: [
      { id: "a", categoryId: "c1", number: 1, cookName: "Grandma", dishName: "Red", photoKey: "events/e1/a", ticket: null },
      { id: "b", categoryId: "c1", number: 2, cookName: "Kiana", dishName: "White", photoKey: null, ticket: null },
      { id: "c", categoryId: "c1", number: 3, cookName: "Shannon", dishName: "Verde", photoKey: null, ticket: null },
      { id: "d", categoryId: twoCategories ? "c2" : "c1", number: twoCategories ? 1 : 4, cookName: "Gary", dishName: "Pie", photoKey: null, ticket: null },
    ],
    organizers: [],
    votesCast: [],
    proPreview: true,
    judges: [],
  };
}

const totals = {
  totals: [
    { entryId: "a", categoryId: "c1", votes: 5 },
    { entryId: "b", categoryId: "c1", votes: 3 },
    { entryId: "c", categoryId: "c1", votes: 1 },
    { entryId: "d", categoryId: "c1", votes: 0 },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reveal labels and slides", () => {
  it("labels each place", () => {
    expect(placeLabel({ place: 1, entryIds: ["a", "b"], votes: 2, coChampions: true })).toBe("Co-champions!");
    expect(placeLabel({ place: 1, entryIds: ["a"], votes: 2, coChampions: false })).toBe("Champion!");
    expect(placeLabel({ place: 2, entryIds: ["a", "b"], votes: 2, coChampions: false })).toBe("2nd place (tied)");
    expect(placeLabel({ place: 3, entryIds: ["a"], votes: 2, coChampions: false })).toBe("3rd place");
  });

  it("makes the same confetti every time, hidden from assistive tech", () => {
    const a = confetti(12);
    expect(a.getAttribute("aria-hidden")).toBe("true");
    expect(a.children).toHaveLength(12);
    expect(a.innerHTML).toBe(confetti(12).innerHTML);
    expect(a.children[1]!.getAttribute("style")).toContain("--c:var(--accent)");
    expect(confetti().children).toHaveLength(72);
  });

  it("runs category by category, naming them only when there are several", () => {
    expect(buildSlides(view("closed"), totals.totals).map((s) => [s.category, s.step.place])).toEqual([[null, 3], [null, 2], [null, 1]]);
    const two = { totals: [...totals.totals.slice(0, 3), { entryId: "d", categoryId: "c2", votes: 2 }] };
    expect(buildSlides(view("closed", true), two.totals).map((s) => [s.category, s.step.place])).toEqual([
      ["Chili", 3], ["Chili", 2], ["Chili", 1], ["Dessert", 1],
    ]);
  });
});

describe("reveal screen", () => {
  it("waits until voting has closed", async () => {
    fakeApi({ "GET /api/events/e1": view("open") });
    const ctx = makeCtx("/e/e1/reveal");
    const cleanup = await revealView(ctx, "e1");
    expect(ctx.root.querySelector("h1")!.textContent).toBe("Not yet");
    cleanup();
  });

  it("goes 3rd → 2nd → 1st on click, then publishes the results", async () => {
    const calls = fakeApi({
      "GET /api/events/e1": view("closed"),
      "GET /api/events/e1/totals": totals,
      "POST /api/events/e1/status": { status: "revealed" },
    });
    const ctx = makeCtx("/e/e1/reveal");
    const cleanup = await revealView(ctx, "e1");
    const stage = ctx.root.querySelector<HTMLElement>(".reveal")!;
    expect(stage.textContent).toContain("Tap for 3rd place");
    expect(stage.querySelector(".made-with")).toBeNull();
    expect(stage.getAttribute("aria-live")).toBe("polite");
    expect(stage.querySelector("time")).toBeNull(); // no date set
    expect(stage.dataset.place).toBeUndefined();

    stage.click();
    expect(stage.querySelector(".place")!.textContent).toBe("3rd place");
    expect(stage.dataset.place).toBe("3");
    expect(stage.querySelector(".medal")!.textContent).toBe("3");
    expect(stage.querySelector(".medal")!.getAttribute("aria-hidden")).toBe("true");
    expect(stage.querySelector(".cook-label")!.textContent).toBe("Cooked by");
    expect(stage.querySelector(".confetti")).toBeNull();
    expect(stage.querySelector(".cook")!.textContent).toBe("Shannon");
    expect(stage.querySelector(".votes")!.textContent).toBe("1 vote");
    expect(stage.querySelector(".category")).toBeNull();
    stage.click();
    expect(stage.querySelector(".place")!.textContent).toBe("2nd place");
    expect(stage.textContent).toContain("Tap for the next place");
    stage.click();
    await flush();
    expect(stage.querySelector(".place")!.textContent).toBe("Champion!");
    expect(stage.dataset.place).toBe("1");
    expect(stage.querySelector(".confetti")).not.toBeNull();
    expect(stage.querySelector(".sunburst")).not.toBeNull();
    expect(stage.querySelector("img")!.getAttribute("src")).toBe("/api/photos/events/e1/a");
    expect(stage.querySelector(".votes")!.textContent).toBe("5 votes");
    expect(stage.textContent).toContain("🎉");
    // SW-59: the last frame says "run your own", and tapping that link doesn't advance.
    const link = stage.querySelector<HTMLAnchorElement>(".made-with a")!;
    expect(link.getAttribute("href")).toBe("/?ref=reveal");
    link.addEventListener("click", (e) => e.preventDefault()); // happy-dom would navigate
    link.click();
    await flush();
    expect(stage.querySelector(".made-with")).not.toBeNull();
    expect(calls.filter((c) => c.method === "POST")).toEqual([{ method: "POST", path: "/api/events/e1/status", body: { status: "revealed" } }]);

    // Past the end, clicks do nothing more.
    stage.click();
    await flush();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    cleanup();
  });

  it("can be replayed after the results are out, without re-publishing", async () => {
    const calls = fakeApi({ "GET /api/events/e1": view("revealed"), "GET /api/events/e1/totals": totals });
    const ctx = makeCtx("/e/e1/reveal");
    const cleanup = await revealView(ctx, "e1");
    for (let i = 0; i < 3; i++) document.dispatchEvent(new KeyboardEvent("keydown", { key: ["ArrowRight", " ", "Enter"][i] }));
    await flush();
    expect(ctx.root.querySelector(".place")!.textContent).toBe("Champion!");
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    // Other keys are ignored, and cleanup unhooks the keyboard.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    cleanup();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  });

  it("shows the rosette and the date on the title card", async () => {
    const data = view("revealed");
    data.event.date = "2026-11-01";
    fakeApi({ "GET /api/events/e1": data, "GET /api/events/e1/totals": totals });
    const ctx = makeCtx("/e/e1/reveal");
    await revealView(ctx, "e1");
    const stage = ctx.root.querySelector<HTMLElement>(".reveal")!;
    expect(stage.querySelector("time")!.getAttribute("datetime")).toBe("2026-11-01");
    expect(stage.querySelector("img.logo")).not.toBeNull();
  });

  it("names the category on each slide when there are several", async () => {
    fakeApi({ "GET /api/events/e1": view("revealed", true), "GET /api/events/e1/totals": { totals: [{ entryId: "d", categoryId: "c2", votes: 2 }] } });
    const ctx = makeCtx("/e/e1/reveal");
    await revealView(ctx, "e1");
    ctx.root.querySelector<HTMLElement>(".reveal")!.click();
    expect(ctx.root.querySelector(".category")!.textContent).toBe("Dessert");
  });

  it("says when there's nothing to reveal", async () => {
    fakeApi({ "GET /api/events/e1": view("closed"), "GET /api/events/e1/totals": { totals: [] } });
    const ctx = makeCtx("/e/e1/reveal");
    await revealView(ctx, "e1");
    expect(ctx.root.textContent).toContain("There are no dishes to reveal.");
    ctx.root.querySelector<HTMLElement>(".reveal")!.click();
    expect(ctx.root.querySelector(".place")).toBeNull();
  });
});

describe("printing (decision 11)", () => {
  it("prints a poster with the QR code, short address and code", async () => {
    fakeApi({ "GET /api/events/e1": view("setup") });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const ctx = makeCtx("/e/e1/print/poster");
    await printView(ctx, "e1", "poster");
    const poster = ctx.root.querySelector(".poster")!;
    expect(poster.querySelector("h1")!.textContent).toBe("Chili Night");
    expect(poster.querySelector("img.poster-logo")!.getAttribute("alt")).toBe("");
    expect(poster.querySelector(".qr svg")).not.toBeNull();
    expect(poster.querySelector(".url")!.textContent).toBe("localhost/c/K7QM2X");
    expect(poster.querySelector(".code")!.textContent).toBe("K7QM2X");
    expect(poster.querySelector(".made-with")!.textContent).toBe("Run your own cookoff, free at localhost");
    byText(ctx.root, "button", "Print").click();
    expect(print).toHaveBeenCalled();
  });

  it("prints a numbered tent card per dish", async () => {
    fakeApi({ "GET /api/events/e1": view("setup") });
    const ctx = makeCtx("/e/e1/print/cards");
    await printView(ctx, "e1", "cards");
    const cards = ctx.root.querySelectorAll(".tent-card");
    expect(cards).toHaveLength(4);
    expect(cards[0]!.querySelector(".number")!.textContent).toBe("Entry 1");
    expect(cards[0]!.querySelector(".dish-name")!.textContent).toBe("Red");
    expect(cards[0]!.querySelector(".qr svg")).not.toBeNull();
    expect(cards[0]!.querySelector(".category")).toBeNull();
    // The cook's name stays off the cards: voting is blind (decision 9).
    expect(ctx.root.textContent).not.toContain("Grandma");
  });

  it("names the category on cards when there are several", async () => {
    fakeApi({ "GET /api/events/e1": view("setup", true) });
    const ctx = makeCtx("/e/e1/print/cards");
    await printView(ctx, "e1", "cards");
    expect(ctx.root.querySelectorAll(".tent-card")[3]!.querySelector(".category")!.textContent).toBe("Dessert");
  });

  it("asks for dishes before there are any cards to print", async () => {
    fakeApi({ "GET /api/events/e1": { ...view("setup"), entries: [] } });
    const ctx = makeCtx("/e/e1/print/cards");
    await printView(ctx, "e1", "cards");
    expect(ctx.root.textContent).toContain("Add some dishes first.");
  });
});
