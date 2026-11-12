import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicView } from "../../src/client/types";
import { voteView } from "../../src/client/views/vote";
import { fakeApi, flush, makeCtx } from "./helpers";

vi.mock("../../src/client/turnstile", () => ({ getTurnstileToken: vi.fn(async () => "tok") }));
import { getTurnstileToken } from "../../src/client/turnstile";

function view(status: PublicView["event"]["status"], overrides: Partial<PublicView> = {}): PublicView {
  return {
    event: { id: "e1", code: "K7", name: "Chili Night", date: "2026-11-01", status },
    turnstileSiteKey: "site",
    myVotes: {},
    categories: [
      {
        id: "c1",
        name: "Main",
        entries: [
          { id: "n1", number: 1, dishName: "Red chili", photoKey: "events/e1/n1" },
          { id: "n2", number: 2, dishName: "White chili", photoKey: null },
        ],
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("voting page", () => {
  it("shows the dishes blind before voting opens, and they aren't tappable", async () => {
    fakeApi({ "GET /api/public/events/e1": view("setup") });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect(ctx.root.textContent).toContain("Voting hasn't opened yet.");
    expect(ctx.root.textContent).toContain("Sunday, November 1, 2026");
    expect(ctx.root.querySelector("time")!.getAttribute("datetime")).toBe("2026-11-01");
    const cards = ctx.root.querySelectorAll(".dish");
    expect(cards[0]!.querySelector("img")!.getAttribute("src")).toBe("/api/photos/events/e1/n1");
    expect(cards[1]!.querySelector(".no-photo")).not.toBeNull();
    expect(cards[0]!.getAttribute("role")).toBeNull();
    expect(cards[0]!.hasAttribute("aria-pressed")).toBe(false);
    expect(ctx.root.querySelector("h2")).toBeNull();
  });

  it("casts a vote with a Turnstile token and marks it as mine", async () => {
    const calls = fakeApi({ "GET /api/public/events/e1": view("open"), "POST /api/public/events/e1/votes": { ok: true } });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect(ctx.root.textContent).toContain("Tap your favorite dish.");

    const before = ctx.root.querySelector<HTMLElement>('[data-entry="n2"]')!;
    expect(before.getAttribute("aria-pressed")).toBe("false");
    expect(before.getAttribute("aria-label")).toBe("Entry 2, White chili");
    before.click();
    // The tapped card answers straight away, before the vote has gone through.
    expect(before.classList.contains("pending")).toBe(true);
    expect(before.getAttribute("aria-busy")).toBe("true");
    expect(ctx.root.querySelector(".status")!.textContent).toBe("Voting…");
    await flush();
    expect(getTurnstileToken).toHaveBeenCalledWith("site", ctx.root.querySelector(".turnstile"));
    expect(calls.at(-1)!.body).toEqual({ categoryId: "c1", entryId: "n2", turnstileToken: "tok" });
    expect(ctx.root.querySelector(".status")!.textContent).toBe("Vote saved. Thanks!");
    const chosen = ctx.root.querySelector(".chosen")!;
    expect(chosen.getAttribute("data-entry")).toBe("n2");
    expect(chosen.textContent).toContain("✓ Your vote");
    expect(chosen.getAttribute("aria-pressed")).toBe("true");
    expect(chosen.classList.contains("pending")).toBe(false);
  });

  it("votes from the keyboard with Enter or Space, and ignores other keys", async () => {
    const calls = fakeApi({ "GET /api/public/events/e1": view("open"), "POST /api/public/events/e1/votes": { ok: true } });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    const card = ctx.root.querySelector<HTMLElement>('[data-entry="n1"]')!;
    card.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    await flush();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);

    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    card.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    await flush();
    expect(calls.at(-1)!.body).toMatchObject({ entryId: "n1" });

    ctx.root.querySelector<HTMLElement>('[data-entry="n2"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    await flush();
    expect(calls.at(-1)!.body).toMatchObject({ entryId: "n2" });
    expect(ctx.root.querySelector(".chosen")!.getAttribute("data-entry")).toBe("n2");
  });

  it("says so when voting closed in the meantime", async () => {
    fakeApi({ "GET /api/public/events/e1": view("open"), "POST /api/public/events/e1/votes": [409, { error: "Voting isn't open" }] });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    const card = ctx.root.querySelector<HTMLElement>(".dish")!;
    card.click();
    await flush();
    expect(ctx.root.querySelector(".status")!.textContent).toBe("Voting has closed.");
    // A failed vote doesn't leave the card looking busy.
    expect(card.classList.contains("pending")).toBe(false);
    expect(card.hasAttribute("aria-busy")).toBe(false);
  });

  it("shows other failures as they come", async () => {
    fakeApi({ "GET /api/public/events/e1": view("open") });
    vi.mocked(getTurnstileToken).mockRejectedValueOnce(new Error("The vote check failed. Please try again."));
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    ctx.root.querySelector<HTMLElement>(".dish")!.click();
    await flush();
    expect(ctx.root.querySelector(".status")!.textContent).toBe("The vote check failed. Please try again.");
  });

  it("highlights the dish from a tent card and scrolls to it", async () => {
    fakeApi({ "GET /api/public/events/e1": view("open", { myVotes: { c1: "n1" } }) });
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const ctx = makeCtx("/v/e1?entry=n2");
    await voteView(ctx, "e1");
    expect(ctx.root.querySelector(".highlight")!.getAttribute("data-entry")).toBe("n2");
    expect(ctx.root.querySelector(".chosen")!.getAttribute("data-entry")).toBe("n1");
    expect(scroll).toHaveBeenCalledWith({ block: "center" });
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it("copes with a browser that can't scroll, and with no date", async () => {
    const data = view("open");
    data.event.date = null;
    fakeApi({ "GET /api/public/events/e1": data });
    const ctx = makeCtx("/v/e1?entry=n1");
    await voteView(ctx, "e1");
    expect(ctx.root.querySelector(".muted")).toBeNull();
  });

  it("shows category headings and empty categories when there are several", async () => {
    const data = view("open");
    data.categories.push({ id: "c2", name: "Dessert", entries: [] });
    fakeApi({ "GET /api/public/events/e1": data });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect([...ctx.root.querySelectorAll("h2")].map((x) => x.textContent)).toEqual(["Main", "Dessert"]);
    expect(ctx.root.textContent).toContain("No dishes yet.");
  });

  it("says the results are coming once closed", async () => {
    fakeApi({ "GET /api/public/events/e1": view("closed") });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect(ctx.root.textContent).toContain("Voting is closed. The results are coming soon!");
  });
});

describe("results page (decision 13)", () => {
  function revealed(placings: NonNullable<PublicView["categories"][number]["placings"]>, extraCategory = false): PublicView {
    const v = view("revealed");
    v.categories[0]!.entries = [
      { id: "n1", number: 1, dishName: "Red chili", photoKey: "events/e1/n1", cookName: "Grandma", votes: 1 },
      { id: "n2", number: 2, dishName: "White chili", photoKey: null, cookName: "Kiana", votes: 4 },
      { id: "n3", number: 3, dishName: "Verde", photoKey: null, cookName: "Shannon", votes: 4 },
    ];
    v.categories[0]!.placings = placings;
    if (extraCategory) v.categories.push({ id: "c2", name: "Dessert", entries: [], placings: [] });
    return v;
  }

  it("shows co-champions, cooks and vote counts", async () => {
    fakeApi({ "GET /api/public/events/e1": revealed([{ place: 1, entryIds: ["n2", "n3"], votes: 4 }, { place: 3, entryIds: ["n1"], votes: 1 }]) });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    const places = [...ctx.root.querySelectorAll(".place")].map((p) => p.textContent);
    expect(places).toEqual(["Co-champions!", "3rd place"]);
    // Each placing carries its place, for the gold, silver and bronze styling.
    expect([...ctx.root.querySelectorAll(".placings > li")].map((li) => li.getAttribute("data-place"))).toEqual(["1", "3"]);
    expect(ctx.root.textContent).toContain("by Kiana");
    expect(ctx.root.textContent).toContain("4 votes");
    expect(ctx.root.textContent).toContain("1 vote");
    expect(ctx.root.querySelector("h2")).toBeNull();
    // SW-59: a full page load (no data-link), so the Worker can count the ref.
    const link = ctx.root.querySelector<HTMLAnchorElement>(".made-with a")!;
    expect(link.getAttribute("href")).toBe("/?ref=results");
    expect(link.hasAttribute("data-link")).toBe(false);
    expect(link.textContent).toBe("Run your own cookoff, free");
  });

  it("marks a shared lower place as tied, and heads each category", async () => {
    fakeApi({ "GET /api/public/events/e1": revealed([{ place: 1, entryIds: ["n1"], votes: 5 }, { place: 2, entryIds: ["n2", "n3"], votes: 4 }], true) });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect([...ctx.root.querySelectorAll(".place")].map((p) => p.textContent)).toEqual(["1st place", "2nd place (tied)"]);
    expect([...ctx.root.querySelectorAll("h2")].map((x) => x.textContent)).toEqual(["Main", "Dessert"]);
  });
});
