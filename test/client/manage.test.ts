import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ManageView } from "../../src/client/types";
import { entryForm, manageView, PEEK_MS, POLL_MS, stepper } from "../../src/client/views/manage";
import { answerDialog, byText, fakeApi, fill, flush, makeCtx, submit } from "./helpers";

vi.mock("../../src/client/photo", () => ({ resizePhoto: vi.fn(async () => new Blob(["small"], { type: "image/jpeg" })) }));

function view(overrides: Partial<ManageView> = {}, status: ManageView["event"]["status"] = "setup"): ManageView {
  return {
    event: { id: "e1", code: "K7QM2X", name: "Chili Night", date: "2026-11-01", status },
    role: "creator",
    categories: [{ id: "c1", name: "Main", position: 1 }],
    entries: [
      { id: "n1", categoryId: "c1", number: 1, cookName: "Grandma", dishName: "Red chili", photoKey: "events/e1/n1-x", ticket: null },
      { id: "n2", categoryId: "c1", number: 2, cookName: "Kiana", dishName: "White chili", photoKey: null, ticket: null },
    ],
    organizers: [
      { email: "gary@example.com", role: "creator" },
      { email: "kiana@example.com", role: "co" },
    ],
    votesCast: [{ categoryId: "c1", votes: 7 }],
    proPreview: true,
    judges: [],
    judging: { criteria: [], dropOutliers: true, showDishNames: false, peoplesChoice: true, grandChampion: false, cookComments: false, scored: [] },
    ...overrides,
  };
}

let calls: ReturnType<typeof fakeApi>;

function serve(data: ManageView, extra: Record<string, unknown> = {}) {
  calls = fakeApi({ "GET /api/events/e1": () => data, ...extra });
}

async function open(data: ManageView, extra: Record<string, unknown> = {}) {
  serve(data, extra);
  const ctx = makeCtx("/e/e1");
  const cleanup = await manageView(ctx, "e1");
  return { ctx, cleanup };
}

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "prompt").mockReturnValue("Dessert");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("entryForm", () => {
  it("includes only the fields given, with the photo shrunk", async () => {
    const empty = await entryForm({});
    expect([...empty.keys()]).toEqual([]);
    const full = await entryForm({ cookName: "A", dishName: "B", ticket: "214", photo: new File(["big"], "x.heic") });
    expect(full.get("ticket")).toBe("214");
    expect(full.get("cookName")).toBe("A");
    expect(full.get("dishName")).toBe("B");
    expect((full.get("photo") as File).name).toBe("dish.jpg");
    expect(await (full.get("photo") as File).text()).toBe("small");
    expect((await entryForm({ photo: null })).has("photo")).toBe(false);
  });
});

describe("progress stepper", () => {
  const state = (status: string) =>
    [...stepper(status).children].map((li) => `${li.textContent}:${li.className || "-"}:${li.getAttribute("aria-current") ?? "-"}`);

  it("marks earlier steps done and the current one as the step", () => {
    expect(state("setup")).toEqual(["Set up:-:step", "Voting:-:-", "Closed:-:-", "Results:-:-"]);
    expect(state("closed")).toEqual(["Set up:done:-", "Voting:done:-", "Closed:-:step", "Results:-:-"]);
    expect(state("revealed")).toEqual(["Set up:done:-", "Voting:done:-", "Closed:done:-", "Results:-:step"]);
  });
});

describe("status controls", () => {
  it("opens voting from setup", async () => {
    const { ctx } = await open(view(), { "POST /api/events/e1/status": { status: "open" } });
    expect(ctx.root.querySelector('.stepper [aria-current="step"]')!.textContent).toBe("Set up");
    expect(ctx.root.textContent).toContain("Add the dishes, print the poster, then open voting.");
    byText(ctx.root, "button", "Open voting").click();
    await flush();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ status: "open" });
  });

  it("closes voting while open, after a confirmation, and shows the live votes-cast count", async () => {
    const { ctx, cleanup } = await open(view({}, "open"), { "POST /api/events/e1/status": { status: "closed" } });
    expect(ctx.root.querySelector("[data-testid=votes-cast]")!.textContent).toBe("7");
    byText(ctx.root, "button", "Close voting").click();
    await flush();
    expect(document.querySelector("dialog.confirm")!.textContent).toContain("Guests can't vote until you reopen it.");
    await answerDialog("Cancel");
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    byText(ctx.root, "button", "Close voting").click();
    await flush();
    await answerDialog("Close voting");
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ status: "closed" });
    cleanup();
  });

  it("starts the reveal only after a confirmation", async () => {
    const { ctx } = await open(view({}, "closed"));
    byText(ctx.root, "button", "Start the reveal").click();
    await flush();
    expect(document.querySelector("dialog.confirm")!.textContent).toContain("the results go public");
    await answerDialog("Cancel");
    expect(ctx.navigate).not.toHaveBeenCalled();

    byText(ctx.root, "button", "Start the reveal").click();
    await flush();
    await answerDialog("Reveal the winners");
    expect(ctx.navigate).toHaveBeenCalledWith("/e/e1/reveal");
  });

  it("offers a reopen once closed, without asking, and says votes are kept", async () => {
    const { ctx } = await open(view({}, "closed"), { "POST /api/events/e1/status": { status: "open" } });
    expect(ctx.root.textContent).toContain("Closed too soon? Reopen voting: every vote so far is kept.");
    byText(ctx.root, "button", "Reopen voting").click();
    await flush();
    expect(document.querySelector("dialog.confirm")).toBeNull();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ status: "open" });
  });

  it("links to the results once revealed, and freezes the dishes", async () => {
    const { ctx } = await open(view({}, "revealed"));
    expect(byText(ctx.root, "a", "See the results page").getAttribute("href")).toBe("/v/e1");
    expect(ctx.root.querySelector(".entry-form")).toBeNull();
    expect(ctx.root.textContent).not.toContain("Delete entry");
  });

  it("undoes a reveal back to closed, after warning that the standings could change", async () => {
    const { ctx } = await open(view({}, "revealed"), { "POST /api/events/e1/status": { status: "closed" } });
    byText(ctx.root, "button", "Undo the reveal").click();
    await flush();
    expect(document.querySelector("dialog.confirm")!.textContent).toContain("the standings people have already seen could change");
    await answerDialog("Cancel");
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    byText(ctx.root, "button", "Undo the reveal").click();
    await flush();
    await answerDialog("Undo the reveal");
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ status: "closed" });
  });

  it("shows a failed action in the notice line", async () => {
    const { ctx } = await open(view(), { "POST /api/events/e1/status": [409, { error: "Can't go from setup to open" }] });
    byText(ctx.root, "button", "Open voting").click();
    await flush();
    expect(ctx.root.querySelector(".status")!.textContent).toBe("Can't go from setup to open");
  });
});

describe("live polling while open", () => {
  it("refreshes the count, survives a failed refresh, and stops on cleanup", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
    const data = view({}, "open");
    const { ctx, cleanup } = await open(data);
    data.votesCast = [{ categoryId: "c1", votes: 9 }];
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(ctx.root.querySelector("[data-testid=votes-cast]")!.textContent).toBe("9");

    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(ctx.root.querySelector("[data-testid=votes-cast]")!.textContent).toBe("9");

    cleanup();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("redraws when the status changes under it", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
    const data = view({}, "open");
    const { ctx, cleanup } = await open(data);
    data.event = { ...data.event, status: "closed" };
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(ctx.root.textContent).toContain("Voting is closed.");
    expect(vi.getTimerCount()).toBe(0);
    cleanup();
  });
});

describe("peek (decision 15)", () => {
  const totals = { totals: [{ entryId: "n1", categoryId: "c1", votes: 2 }, { entryId: "n2", categoryId: "c1", votes: 5 }] };

  it("is hidden until tapped, lists the standings, and hides again", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
    const { ctx, cleanup } = await open(view({}, "open"), { "GET /api/events/e1/totals": totals });
    const panel = ctx.root.querySelector<HTMLElement>(".peek")!;
    expect(panel.hidden).toBe(true);
    const button = byText(ctx.root, "button", "Peek");
    button.click();
    await vi.waitFor(() => expect(panel.hidden).toBe(false));
    expect([...panel.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "Entry 2, White chili (Kiana): 5",
      "Entry 1, Red chili (Grandma): 2",
    ]);
    expect(panel.querySelector("h3")).toBeNull();
    expect(ctx.root.querySelector<HTMLElement>(".per-category")!.hidden).toBe(true);
    expect(button.textContent).toBe("Hide the standings");

    // Tapping again hides it.
    button.click();
    expect(panel.hidden).toBe(true);
    expect(button.textContent).toBe("Peek at the standings");

    // Left open, it hides itself.
    button.click();
    await vi.waitFor(() => expect(panel.hidden).toBe(false));
    await vi.advanceTimersByTimeAsync(PEEK_MS);
    expect(panel.hidden).toBe(true);
    cleanup();
  });

  it("splits by category when there are several", async () => {
    const data = view({ categories: [{ id: "c1", name: "Chili", position: 1 }, { id: "c2", name: "Dessert", position: 2 }], votesCast: [{ categoryId: "c1", votes: 3 }] }, "open");
    const { ctx, cleanup } = await open(data, { "GET /api/events/e1/totals": totals });
    expect([...ctx.root.querySelectorAll(".per-category li")].map((li) => li.textContent)).toEqual(["Chili: 3", "Dessert: 0"]);
    byText(ctx.root, "button", "Peek").click();
    await vi.waitFor(() => expect(ctx.root.querySelectorAll(".peek h3")).toHaveLength(2));
    cleanup();
  });
});

describe("dishes", () => {
  it("lists entries with a photo or a placeholder", async () => {
    const { ctx } = await open(view());
    const rows = ctx.root.querySelectorAll(".entry");
    expect(rows[0]!.querySelector("img")!.getAttribute("src")).toBe("/api/photos/events/e1/n1-x");
    expect(rows[1]!.querySelector(".none")!.textContent).toBe("No photo");
    expect(rows[0]!.textContent).toContain("Entry 1 Red chili by Grandma");
    expect(ctx.root.querySelector(".category-name")).toBeNull();
  });

  it("says when a category has no dishes", async () => {
    const { ctx } = await open(view({ entries: [] }));
    expect(ctx.root.textContent).toContain("No dishes yet.");
  });

  it("adds a dish with its photo", async () => {
    const { ctx } = await open(view(), { "POST /api/categories/c1/entries": [201, { id: "n3", number: 3 }] });
    const form = ctx.root.querySelector<HTMLFormElement>(".entry-form")!;
    fill(form, "cookName", "Shannon");
    fill(form, "dishName", "Verde");
    const input = form.querySelector<HTMLInputElement>("[name=photo]")!;
    expect(input.getAttribute("capture")).toBe("environment");
    Object.defineProperty(input, "files", { value: [new File(["big"], "p.jpg")] });
    submit(form);
    await flush();
    const post = calls.find((c) => c.method === "POST")!;
    const body = post.body as FormData;
    expect([body.get("cookName"), body.get("dishName")]).toEqual(["Shannon", "Verde"]);
    expect(body.get("photo")).toBeInstanceOf(File);
  });

  it("adds a dish without a photo", async () => {
    const { ctx } = await open(view(), { "POST /api/categories/c1/entries": [201, {}] });
    submit(ctx.root.querySelector(".entry-form")!);
    await flush();
    expect((calls.find((c) => c.method === "POST")!.body as FormData).has("photo")).toBe(false);
  });

  it("edits a dish, or cancels the edit", async () => {
    const { ctx } = await open(view(), { "PATCH /api/entries/n1": { ok: true } });
    byText(ctx.root, "button", "Edit").click();
    const form = ctx.root.querySelector<HTMLFormElement>("form.entry-form")!;
    expect((form.querySelector("[name=cookName]") as HTMLInputElement).value).toBe("Grandma");
    byText(form, "button", "Cancel").click();
    expect(ctx.root.querySelectorAll(".entry")).toHaveLength(2);

    byText(ctx.root, "button", "Edit").click();
    const again = ctx.root.querySelector<HTMLFormElement>("form.entry-form")!;
    fill(again, "dishName", "Texas red");
    submit(again);
    await flush();
    const patch = calls.find((c) => c.method === "PATCH")!.body as FormData;
    expect([patch.get("cookName"), patch.get("dishName"), patch.has("photo")]).toEqual(["Grandma", "Texas red", false]);
  });

  it("edits a dish's photo", async () => {
    const { ctx } = await open(view(), { "PATCH /api/entries/n1": { ok: true } });
    byText(ctx.root, "button", "Edit").click();
    const form = ctx.root.querySelector<HTMLFormElement>("form.entry-form")!;
    Object.defineProperty(form.querySelector("[name=photo]"), "files", { value: [new File(["x"], "p.jpg")] });
    submit(form);
    await flush();
    expect((calls.find((c) => c.method === "PATCH")!.body as FormData).has("photo")).toBe(true);
  });

  it("deletes a dish only after confirming", async () => {
    const { ctx } = await open(view(), { "DELETE /api/entries/n1": { ok: true } });
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    byText(ctx.root, "button", "Delete").click();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    byText(ctx.root, "button", "Delete").click();
    await flush();
    expect(calls.find((c) => c.method === "DELETE")!.path).toBe("/api/entries/n1");
  });
});

describe("categories (decision 12)", () => {
  it("offers to split a single contest, and creates the category", async () => {
    const { ctx } = await open(view(), { "POST /api/events/e1/categories": [201, { id: "c2" }] });
    byText(ctx.root, "button", "Split into categories").click();
    await flush();
    expect(window.prompt).toHaveBeenCalledWith(expect.stringContaining("your current dishes become the first one"), "Dessert");
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ name: "Dessert" });
  });

  it("does nothing when the prompt is cancelled", async () => {
    const { ctx } = await open(view());
    vi.mocked(window.prompt).mockReturnValue(null);
    byText(ctx.root, "button", "Split into categories").click();
    expect(calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("shows headings, rename and delete once there are several", async () => {
    const data = view({ categories: [{ id: "c1", name: "Chili", position: 1 }, { id: "c2", name: "Dessert", position: 2 }] });
    const { ctx } = await open(data, { "PATCH /api/categories/c1": { ok: true }, "DELETE /api/categories/c2": { ok: true }, "POST /api/events/e1/categories": [201, {}] });
    expect([...ctx.root.querySelectorAll(".category-name")].map((x) => x.textContent)).toEqual(["Chili", "Dessert"]);

    vi.mocked(window.prompt).mockReturnValueOnce("Chili con carne");
    ctx.root.querySelectorAll<HTMLButtonElement>(".category button")[0]!.click();
    await flush();
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ name: "Chili con carne" });

    vi.mocked(window.prompt).mockReturnValueOnce(null);
    byText(ctx.root, "button", "Rename").click();
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(1);

    vi.mocked(window.confirm).mockReturnValueOnce(false);
    byText(ctx.root.querySelectorAll(".category")[1]!, "button", "Delete category").click();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    byText(ctx.root.querySelectorAll(".category")[1]!, "button", "Delete category").click();
    await flush();
    expect(calls.find((c) => c.method === "DELETE")!.path).toBe("/api/categories/c2");

    byText(ctx.root, "button", "Add another category").click();
    expect(window.prompt).toHaveBeenLastCalledWith("Name the new category", "Dessert");
  });

  it("shows headings without edit buttons once closed", async () => {
    const data = view({ categories: [{ id: "c1", name: "Chili", position: 1 }, { id: "c2", name: "Dessert", position: 2 }] }, "closed");
    const { ctx } = await open(data);
    expect(ctx.root.querySelectorAll(".category-name")).toHaveLength(2);
    expect(ctx.root.textContent).not.toContain("Rename");
  });
});

describe("organizers (decision 16)", () => {
  it("lets the creator invite and remove co-organizers", async () => {
    const { ctx } = await open(view(), {
      "POST /api/events/e1/organizers": [201, { ok: true }],
      "DELETE /api/events/e1/organizers/kiana%40example.com": { ok: true },
    });
    expect(ctx.root.textContent).toContain("gary@example.com (created it)");
    byText(ctx.root, "button", "Remove").click();
    await flush();
    expect(calls.find((c) => c.method === "DELETE")!.path).toBe("/api/events/e1/organizers/kiana%40example.com");

    const invite = byText(ctx.root, "form", "Invite a co-organizer");
    fill(invite, "email", "shannon@example.com");
    submit(invite);
    await flush();
    expect(calls.find((c) => c.path === "/api/events/e1/organizers" && c.method === "POST")!.body).toEqual({ email: "shannon@example.com", lang: "en" });
  });

  it("hides creator-only controls from a co-organizer", async () => {
    const { ctx } = await open(view({ role: "co" }));
    expect(ctx.root.textContent).not.toContain("Invite a co-organizer");
    expect(ctx.root.textContent).not.toContain("Remove");
    expect(ctx.root.textContent).not.toContain("Delete this event");
  });
});

describe("share, edit and delete", () => {
  it("links the voting page, the code and both printouts", async () => {
    const { ctx } = await open(view());
    expect(byText(ctx.root, "a", "/v/e1").getAttribute("href")).toBe("/v/e1");
    expect(ctx.root.querySelector(".code")!.textContent).toBe("K7QM2X");
    expect(byText(ctx.root, "a", "Print the poster").getAttribute("href")).toBe("/e/e1/print/poster");
    expect(byText(ctx.root, "a", "Print the table cards").getAttribute("href")).toBe("/e/e1/print/cards");
  });

  it("saves a new name and date", async () => {
    const { ctx } = await open(view({ event: { id: "e1", code: "K", name: "Chili Night", date: null, status: "setup" } }), { "PATCH /api/events/e1": { ok: true } });
    const form = byText(ctx.root, "details", "Edit name or date").querySelector("form")!;
    expect((form.querySelector("[name=date]") as HTMLInputElement).value).toBe("");
    fill(form, "name", "Chili Bowl");
    submit(form);
    await flush();
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ name: "Chili Bowl", date: "", kind: "family" });
  });

  it("deletes the event after confirming, then goes home", async () => {
    const { ctx } = await open(view(), { "DELETE /api/events/e1": { ok: true } });
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    byText(ctx.root, "button", "Delete this event").click();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    byText(ctx.root, "button", "Delete this event").click();
    await flush();
    expect(ctx.navigate).toHaveBeenCalledWith("/");
  });
});


describe("pro events (SW-25)", () => {
  function pro(overrides: Partial<ManageView> = {}, status: ManageView["event"]["status"] = "setup"): ManageView {
    const base = view({}, status);
    return view({
      event: { ...base.event, kind: "pro" },
      entries: [
        { id: "n1", categoryId: "c1", number: 1, cookName: "Ana", dishName: "Brisket chili", photoKey: null, ticket: "214" },
        { id: "n2", categoryId: "c1", number: 2, cookName: "Ben", dishName: "", photoKey: null, ticket: null },
      ],
      judges: [{ id: "j1", name: "Pat" }],
      ...overrides,
    }, status);
  }

  it("says it's a pro event, and a free preview while that's on", async () => {
    const { ctx } = await open(pro());
    expect(ctx.root.querySelector(".pro-line")!.textContent).toBe("Pro Pro event: judges score every dish blind. Pro is a free preview, for a limited time.");
    const { ctx: after } = await open(pro({ proPreview: false }));
    expect(after.root.querySelector(".pro-line")!.textContent).toBe("Pro Pro event: judges score every dish blind.");
    const { ctx: family } = await open(view());
    expect(family.root.querySelector(".pro-line")).toBeNull();
    expect([...family.root.querySelectorAll("h2")].map((e) => e.textContent)).not.toContain("Judges");
  });

  it("names dishes by ticket, and lists cooks who haven't turned in yet", async () => {
    const { ctx } = await open(pro());
    expect(byText(ctx.root, "h2", "Cooks and dishes")).toBeTruthy();
    const rows = [...ctx.root.querySelectorAll(".entry")].map((li) => li.querySelector("span:not(.thumb)")!.textContent);
    expect(rows).toEqual(["Ticket 214 Brisket chili by Ana", "No ticket yet by Ben"]);
    const { ctx: empty } = await open(pro({ entries: [] }));
    expect(empty.root.textContent).toContain("No cooks yet.");
  });

  it("adds a cook with an optional dish and ticket", async () => {
    const { ctx } = await open(pro(), { "POST /api/categories/c1/entries": [201, { id: "n3", number: 3 }] });
    const form = byText(ctx.root, "form", "Add a cook");
    expect((form.querySelector("[name=dishName]") as HTMLInputElement).required).toBe(false);
    expect(form.textContent).toContain("Dish (if known)");
    expect(form.textContent).toContain("Leave it empty until the dish is turned in.");
    fill(form, "cookName", "Cy");
    fill(form, "ticket", "300");
    submit(form);
    await flush();
    const body = calls.find((c) => c.method === "POST")!.body as FormData;
    expect([body.get("cookName"), body.get("dishName"), body.get("ticket")]).toEqual(["Cy", "", "300"]);
  });

  it("edits a cook's ticket at turn-in", async () => {
    const { ctx } = await open(pro(), { "PATCH /api/entries/n2": { ok: true } });
    byText(ctx.root, ".entry", "Ben").querySelector("button")!.click();
    const form = ctx.root.querySelector(".entry-form")!;
    expect((form.querySelector("[name=ticket]") as HTMLInputElement).value).toBe("");
    fill(form, "ticket", "301");
    fill(form, "dishName", "Verde");
    submit(form);
    await flush();
    const body = calls.find((c) => c.method === "PATCH")!.body as FormData;
    expect([body.get("ticket"), body.get("dishName")]).toEqual(["301", "Verde"]);
    // An existing ticket is filled in for editing.
    byText(ctx.root, ".entry", "Ana").querySelector("button")!.click();
    expect((ctx.root.querySelector(".entry-form [name=ticket]") as HTMLInputElement).value).toBe("214");
  });

  it("lists judges with their personal link and a QR code drawn on first open", async () => {
    const { ctx } = await open(pro());
    const judge = ctx.root.querySelector(".judge")!;
    expect(judge.querySelector("strong")!.textContent).toBe("Pat");
    expect(judge.querySelector("a")!.getAttribute("href")).toBe(`${location.origin}/j/j1`);
    const details = judge.querySelector("details")!;
    expect(details.querySelector(".qr svg")).toBeNull();
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    await flush();
    expect(details.querySelector(".qr svg")).not.toBeNull();
    // Closing and opening again doesn't draw a second one.
    details.open = false;
    details.dispatchEvent(new Event("toggle"));
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    await flush();
    expect(details.querySelectorAll(".qr svg").length).toBe(1);
  });

  it("adds a judge by name, and revokes one after confirming", async () => {
    const { ctx } = await open(pro({ judges: [] }), {
      "POST /api/events/e1/judges": [201, { id: "j2", name: "Lee" }],
      "DELETE /api/judges/j1": { ok: true },
    });
    expect(ctx.root.textContent).toContain("No judges yet.");
    const form = byText(ctx.root, "form", "Add judge");
    fill(form, "judgeName", "Lee");
    submit(form);
    await flush();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ name: "Lee" });

    // Revoking asks what happens to the judge's scores: kept or dropped.
    const { ctx: listed } = await open(pro(), { "DELETE /api/judges/j1": { ok: true } });
    byText(listed.root, ".judge button", "Revoke").click();
    await flush();
    expect(document.querySelector("dialog.choose h2")!.textContent).toBe("Revoke Pat's link?");
    await answerDialog("Cancel");
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    byText(listed.root, ".judge button", "Revoke").click();
    await flush();
    await answerDialog("Revoke, keep their scores");
    expect(calls.find((c) => c.method === "DELETE")!.body).toEqual({ keepScores: true });
    byText(listed.root, ".judge button", "Revoke").click();
    await flush();
    await answerDialog("Revoke, drop their scores");
    expect(calls.filter((c) => c.method === "DELETE").at(-1)!.body).toEqual({ keepScores: false });
  });

  it("stops adding judges once voting has closed", async () => {
    const { ctx } = await open(pro({}, "closed"));
    expect(ctx.root.textContent).toContain("Pat");
    expect([...ctx.root.querySelectorAll("form")].some((f) => f.textContent?.includes("Add judge"))).toBe(false);
  });

  it("can switch kind while setting up, but not once voting opens", async () => {
    const { ctx } = await open(pro(), { "PATCH /api/events/e1": { ok: true } });
    const form = byText(ctx.root, "details", "Edit name or date").querySelector("form")!;
    const kinds = [...form.querySelectorAll<HTMLInputElement>('input[name="kind"]')];
    expect(kinds.map((k) => k.checked)).toEqual([false, true]);
    kinds[0]!.checked = true;
    submit(form);
    await flush();
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ name: "Chili Night", date: "2026-11-01", kind: "family" });

    // With the preview off, a family event isn't offered Pro, but a pro one can still go back.
    const { ctx: family } = await open(view({ proPreview: false }));
    expect(byText(family.root, "details", "Edit name or date").querySelector('input[name="kind"]')).toBeNull();
    const { ctx: stillPro } = await open(pro({ proPreview: false }));
    expect(byText(stillPro.root, "details", "Edit name or date").querySelectorAll('input[name="kind"]').length).toBe(2);

    const { ctx: open_ } = await open(pro({}, "open"), { "PATCH /api/events/e1": { ok: true } });
    const later = byText(open_.root, "details", "Edit name or date").querySelector("form")!;
    expect(later.querySelector('input[name="kind"]')).toBeNull();
    submit(later);
    await flush();
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ name: "Chili Night", date: "2026-11-01" });
  });
});

describe("pro scoring (SW-25, part 2)", () => {
  const criteria = [
    { id: "taste", name: "Taste", weight: 2, position: 1 },
    { id: "aroma", name: "Aroma", weight: 1, position: 2 },
  ];

  function scoring(overrides: Partial<ManageView> = {}, status: ManageView["event"]["status"] = "setup", judging: Partial<ManageView["judging"]> = {}): ManageView {
    const base = view({}, status);
    return view({
      event: { ...base.event, kind: "pro" },
      entries: [
        { id: "n1", categoryId: "c1", number: 1, cookName: "Ana", dishName: "Brisket chili", photoKey: null, ticket: "214" },
        { id: "n2", categoryId: "c1", number: 2, cookName: "Ben", dishName: "", photoKey: null, ticket: "300" },
        { id: "n3", categoryId: "c1", number: 3, cookName: "Cy", dishName: "", photoKey: null, ticket: null },
      ],
      judges: [{ id: "j1", name: "Pat" }, { id: "j2", name: "Lee" }],
      judging: { criteria, dropOutliers: true, showDishNames: false, peoplesChoice: true, grandChampion: false, cookComments: false, scored: [{ judgeId: "j1", entryId: "n1" }], ...judging },
      ...overrides,
    }, status);
  }

  const judgingCard = (root: HTMLElement) => byText(root, "section", "Criteria");

  it("starts the criteria from a preset, asking before it replaces any", async () => {
    const { ctx } = await open(scoring({}, "setup", { criteria: [] }), { "POST /api/events/e1/criteria/preset": { criteria: [] } });
    const card = judgingCard(ctx.root);
    expect(card.textContent).toContain("No criteria yet.");
    byText(card, "button", "BBQ").click();
    await flush();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ preset: "bbq", lang: "en" });

    const { ctx: withSome } = await open(scoring(), { "POST /api/events/e1/criteria/preset": { criteria: [] } });
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    byText(judgingCard(withSome.root), "button", "Chili").click();
    await flush();
    expect(window.confirm).toHaveBeenLastCalledWith("Replace the criteria with the Chili preset?");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    byText(judgingCard(withSome.root), "button", "General").click();
    await flush();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ preset: "general", lang: "en" });
  });

  it("reweights, renames, removes and adds criteria while setting up", async () => {
    const { ctx } = await open(scoring(), {
      "PATCH /api/criteria/taste": { ok: true },
      "DELETE /api/criteria/aroma": { ok: true },
      "POST /api/events/e1/criteria": [201, { id: "new" }],
    });
    const card = judgingCard(ctx.root);
    const rows = [...card.querySelectorAll(".criteria li")];
    expect(rows.map((li) => li.querySelector("strong")!.textContent)).toEqual(["Taste", "Aroma"]);
    const weight = rows[0]!.querySelector("select") as HTMLSelectElement;
    expect(weight.value).toBe("2");
    weight.value = "2.5";
    weight.dispatchEvent(new Event("change"));
    await flush();
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ weight: 2.5 });

    vi.mocked(window.prompt).mockReturnValueOnce("Flavour");
    byText(judgingCard(ctx.root), ".criteria li", "Taste").querySelector<HTMLButtonElement>("button.link:not(.danger)")!.click();
    await flush();
    expect(calls.filter((c) => c.method === "PATCH").at(-1)!.body).toEqual({ name: "Flavour" });
    vi.mocked(window.prompt).mockReturnValueOnce(null);
    byText(judgingCard(ctx.root), ".criteria li", "Taste").querySelector<HTMLButtonElement>("button.link:not(.danger)")!.click();
    await flush();
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2);

    byText(judgingCard(ctx.root), ".criteria li", "Aroma").querySelector<HTMLButtonElement>("button.danger")!.click();
    await flush();
    expect(calls.some((c) => c.method === "DELETE" && c.path === "/api/criteria/aroma")).toBe(true);

    const form = judgingCard(ctx.root).querySelector("form.criterion-form")!;
    fill(form, "criterionName", "Heat");
    (form.querySelector("select") as HTMLSelectElement).value = "0.5";
    submit(form);
    await flush();
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ name: "Heat", weight: 0.5 });
  });

  it("shows the criteria read-only once voting opens", async () => {
    const { ctx } = await open(scoring({}, "open"));
    const card = judgingCard(ctx.root);
    expect([...card.querySelectorAll(".criteria li")].map((li) => li.textContent)).toEqual(["Taste ×2", "Aroma ×1"]);
    expect(card.querySelector("form")).toBeNull();
    expect(card.textContent).toContain("The criteria are fixed now that voting has opened.");
    expect(card.textContent).not.toContain("Start from a preset");
  });

  it("saves the judging settings as they're ticked, and fixes them once the results are out", async () => {
    const { ctx } = await open(scoring(), { "PATCH /api/events/e1": { ok: true } });
    const drop = judgingCard(ctx.root).querySelector("[name=dropOutliers]") as HTMLInputElement;
    const names = judgingCard(ctx.root).querySelector("[name=showDishNames]") as HTMLInputElement;
    expect([drop.checked, names.checked]).toEqual([true, false]);
    names.checked = true;
    names.dispatchEvent(new Event("change"));
    await flush();
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ showDishNames: true });

    const { ctx: revealed } = await open(scoring({}, "revealed"));
    expect((judgingCard(revealed.root).querySelector("[name=dropOutliers]") as HTMLInputElement).disabled).toBe(true);
  });

  it("shows each judge's progress, with submitted cards unlockable before the reveal", async () => {
    const { ctx } = await open(scoring({}, "open"), { "POST /api/judges/j1/unlock": { ok: true } });
    const panel = ctx.root.querySelector(".progress")!;
    expect([...panel.querySelectorAll("summary")].map((s) => s.textContent)).toEqual(["Pat: 1 of 2 scored", "Lee: 0 of 2 scored"]);
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    byText(panel, "button", "Unlock").click();
    await flush();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    byText(panel, "button", "Unlock").click();
    await flush();
    expect(window.confirm).toHaveBeenLastCalledWith(
      "Unlock Pat's scores for ticket 214? They can change them, and must submit again for them to count.",
    );
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ entryId: "n1" });

    const { ctx: revealed } = await open(scoring({}, "revealed"));
    expect(revealed.root.querySelector(".progress button")).toBeNull();
    const { ctx: noJudges } = await open(scoring({ judges: [] }, "open"));
    expect(noJudges.root.querySelector(".progress")).toBeNull();
    const { ctx: setup } = await open(scoring());
    expect(setup.root.querySelector(".progress")).toBeNull();
  });

  it("warns before closing when scores are missing, naming the first few", async () => {
    const { ctx } = await open(scoring({}, "open"), { "POST /api/events/e1/status": { status: "closed" } });
    byText(ctx.root, "button", "Close voting").click();
    await flush();
    expect(document.querySelector("dialog.confirm p")!.textContent).toBe(
      "Guests can't vote until you reopen it. Not every judge has scored every dish: Pat hasn't scored ticket 300; Lee hasn't scored ticket 214; Lee hasn't scored ticket 300. Missed dishes are averaged over the judges who scored them.",
    );
    await answerDialog("Cancel");

    const judges = ["A", "B", "C"].map((name, i) => ({ id: `x${i}`, name }));
    const { ctx: many } = await open(scoring({ judges }, "open", { scored: [] }));
    byText(many.root, "button", "Close voting").click();
    await flush();
    expect(document.querySelector("dialog.confirm p")!.textContent).toContain("C hasn't scored ticket 214; and 1 more.");
    await answerDialog("Cancel");

    const all = [{ judgeId: "j1", entryId: "n1" }, { judgeId: "j1", entryId: "n2" }, { judgeId: "j2", entryId: "n1" }, { judgeId: "j2", entryId: "n2" }];
    const { ctx: done } = await open(scoring({}, "open", { scored: all }));
    byText(done.root, "button", "Close voting").click();
    await flush();
    expect(document.querySelector("dialog.confirm p")!.textContent).toBe("Guests can't vote until you reopen it.");
    await answerDialog("Cancel");
  });

  it("peeks at the judged standings instead of votes", async () => {
    const judged = {
      scores: [
        { entryId: "n2", categoryId: "c1", score: 8.746, judges: 3, counted: 3, byCriterion: {} },
        { entryId: "n1", categoryId: "c1", score: null, judges: 0, counted: 0, byCriterion: {} },
      ],
      placings: { c1: [{ place: 1, entryIds: ["n2"], score: 8.746 }, { place: 2, entryIds: ["n1"], score: null }] },
      criteria: [],
      peoplesChoice: null,
      grandChampion: null,
      comments: [{ entryId: "n2", judgeId: "j1", judge: "Pat", comment: "Great heat" }],
    };
    const { ctx, cleanup } = await open(scoring({}, "open"), { "GET /api/events/e1/totals": { totals: [], judged } });
    byText(ctx.root, "button", "Peek").click();
    await vi.waitFor(() => expect(ctx.root.querySelectorAll(".peek ol > li")).toHaveLength(2));
    expect([...ctx.root.querySelectorAll(".peek ol > li")].map((li) => li.firstChild!.textContent)).toEqual([
      "Ticket 300 (Ben): 8.75 from 3 judges",
      "Ticket 214 (Ana): not scored yet",
    ]);
    // The organizer sees who wrote each comment (rules 14 and 19).
    expect(ctx.root.querySelector(".peek .comments")!.textContent).toBe("Pat: “Great heat”");
    cleanup();

    const two = scoring({ categories: [{ id: "c1", name: "Chili", position: 1 }, { id: "c2", name: "Dessert", position: 2 }] }, "open");
    const { ctx: multi, cleanup: done } = await open(two, { "GET /api/events/e1/totals": { totals: [], judged: { ...judged, scores: [{ ...judged.scores[0]!, counted: 1 }, judged.scores[1]!] } } });
    byText(multi.root, "button", "Peek").click();
    await vi.waitFor(() => expect(multi.root.querySelectorAll(".peek h3")).toHaveLength(2));
    expect(multi.root.querySelector(".peek li")!.firstChild!.textContent).toBe("Ticket 300 (Ben): 8.75 from 1 judge");
    done();
  });
});

describe("pro results (SW-25, part 3)", () => {
  const pro = (status: ManageView["event"]["status"], overrides: Partial<ManageView> = {}) => {
    const base = view({}, status);
    return view({ event: { ...base.event, kind: "pro" }, ...overrides }, status);
  };

  it("asks for a ticked acknowledgement before a final reveal (rule 18)", async () => {
    const { ctx } = await open(pro("closed"));
    byText(ctx.root, "button", "Start the reveal").click();
    await flush();
    const dialog = document.querySelector("dialog.confirm")!;
    expect(dialog.querySelector("h2")!.textContent).toBe("Reveal the final results?");
    const go = byText(dialog, "button", "Reveal the winners") as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    const box = dialog.querySelector<HTMLInputElement>('input[name="acknowledge"]')!;
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    go.click();
    await flush();
    expect(ctx.navigate).toHaveBeenCalledWith("/e/e1/reveal");
  });

  it("has no undo once a pro event's results are out", async () => {
    const { ctx } = await open(pro("revealed"));
    expect(ctx.root.textContent).toContain("The results are out, and final.");
    expect([...ctx.root.querySelectorAll("button")].some((b) => b.textContent === "Undo the reveal")).toBe(false);
    expect(byText(ctx.root, "a", "See the results page").getAttribute("href")).toBe("/v/e1");
  });

  it("saves the award settings as they're ticked, with Grand Champion only for several categories", async () => {
    const { ctx } = await open(pro("setup"));
    expect(ctx.root.querySelector('input[name="grandChampion"]')).toBeNull();
    const pc = ctx.root.querySelector<HTMLInputElement>('input[name="peoplesChoice"]')!;
    expect(pc.checked).toBe(true);
    pc.checked = false;
    pc.dispatchEvent(new Event("change"));
    await flush();
    expect(calls.find((c) => c.method === "PATCH")!.body).toEqual({ peoplesChoice: false });
    // No export while setting up: there's nothing to export.
    expect(ctx.root.textContent).not.toContain("Download the results");

    const two = pro("closed", { categories: [{ id: "c1", name: "Chili", position: 1 }, { id: "c2", name: "Dessert", position: 2 }] });
    const { ctx: multi } = await open(two);
    expect(multi.root.querySelector('input[name="grandChampion"]')).not.toBeNull();
    expect(multi.root.querySelector<HTMLInputElement>('input[name="cookComments"]')!.checked).toBe(false);
    const link = byText(multi.root, "a", "Download the results (CSV)");
    expect(link.getAttribute("href")).toBe("/api/events/e1/export.csv?lang=en");
    expect(link.hasAttribute("download")).toBe(true);
  });
});
