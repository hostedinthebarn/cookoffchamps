import { afterEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../../src/client/i18n";
import type { JudgePage } from "../../src/client/types";
import { judgeView } from "../../src/client/views/judge";
import { answerDialog, byText, fakeApi, flush, makeCtx, submit } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  setLang("en", false);
});

const page = (status: string, date: string | null = "2026-11-21", extra: Partial<JudgePage> = {}) => ({
  judge: { name: "Pat" },
  event: { id: "e1", name: "Fair Chili", date, status },
  criteria: [],
  dishes: [],
  cards: [],
  ...extra,
});

describe("the judge's page (SW-25, rule 5)", () => {
  it("greets the judge and says the score sheet is on its way", async () => {
    const calls = fakeApi({ "GET /api/public/judges/j%201": page("setup") });
    const ctx = makeCtx("/j/j%201");
    await judgeView(ctx, "j 1");
    expect(calls[0]!.path).toBe("/api/public/judges/j%201");
    expect(ctx.root.querySelector("h1")!.textContent).toBe("Judging Fair Chili");
    expect(ctx.root.querySelector("time")!.getAttribute("datetime")).toBe("2026-11-21");
    expect(ctx.root.textContent).toContain("Hello, Pat.");
    expect(ctx.root.textContent).toContain("Your score sheet will appear here when judging begins.");
    expect(ctx.root.textContent).toContain("ticket number only");
  });

  it("thanks the judge once judging is over, and leaves out a missing date", async () => {
    for (const status of ["closed", "revealed"]) {
      fakeApi({ "GET /api/public/judges/j1": page(status, null) });
      const ctx = makeCtx("/j/j1");
      await judgeView(ctx, "j1");
      expect(ctx.root.textContent).toContain("Judging has finished. Thank you!");
      expect(ctx.root.querySelector("time")).toBeNull();
    }
  });

  it("says plainly when the link has been revoked", async () => {
    fakeApi({ "GET /api/public/judges/old": [404, { error: "gone", code: "judgeNotFound" }] });
    const ctx = makeCtx("/j/old");
    await judgeView(ctx, "old");
    expect(ctx.root.querySelector(".error")!.textContent).toContain("ask the organizer for a new one");
  });

  it("leaves other failures to the app's error page", async () => {
    fakeApi({ "GET /api/public/judges/j1": [500, { error: "boom" }] });
    await expect(judgeView(makeCtx("/j/j1"), "j1")).rejects.toMatchObject({ status: 500 });
  });

  it("speaks Spanish too", async () => {
    setLang("es", false);
    fakeApi({ "GET /api/public/judges/j1": page("setup") });
    const ctx = makeCtx("/j/j1");
    await judgeView(ctx, "j1");
    expect(ctx.root.querySelector("h1")!.textContent).toBe("Jurado de Fair Chili");
    expect(ctx.root.textContent).toContain("Hola, Pat.");
  });
});


describe("the score sheet (rules 6, 9 and 10)", () => {
  const sheet: Partial<JudgePage> = {
    criteria: [
      { id: "taste", name: "Taste", weight: 2 },
      { id: "aroma", name: "Aroma", weight: 1 },
    ],
    dishes: [
      { entryId: "a", ticket: "214", category: null },
      { entryId: "b", ticket: "300", category: "Dessert", dishName: "Pecan pie" },
    ],
    cards: [{ entryId: "a", scores: { taste: 8, aroma: 7 }, comment: "Good heat", locked: true }],
  };

  async function openSheet(extra: Record<string, unknown> = {}, data: Partial<JudgePage> = sheet) {
    const calls = fakeApi({ "GET /api/public/judges/j1": page("open", null, data), ...extra });
    const ctx = makeCtx("/j/j1");
    await judgeView(ctx, "j1");
    return { ctx, calls };
  }

  it("lists the dishes by ticket, with what's scored, under the 1–10 guide", async () => {
    const { ctx } = await openSheet();
    expect(ctx.root.textContent).toContain("5 is average, 8 is excellent, and 10 is the best you've had.");
    expect(ctx.root.textContent).toContain("1 of 2 scored");
    const rows = [...ctx.root.querySelectorAll(".dishes button")].map((b) => b.textContent);
    expect(rows).toEqual(["Ticket 214 ✓ Scored", "Ticket 300 · Dessert · Pecan pie To score"]);
  });

  it("says when no dish has been turned in yet", async () => {
    const { ctx } = await openSheet({}, { ...sheet, dishes: [], cards: [] });
    expect(ctx.root.textContent).toContain("No dishes have been turned in yet.");
  });

  it("scores a dish on every criterion, asks first, then locks it", async () => {
    let scored = false;
    const { ctx, calls } = await openSheet({
      "GET /api/public/judges/j1": () => page("open", null, scored ? { ...sheet, cards: [...sheet.cards!, { entryId: "b", scores: { taste: 9, aroma: 6 }, comment: null, locked: true }] } : sheet),
      "POST /api/public/judges/j1/scores": () => {
        scored = true;
        return [201, { ok: true }];
      },
    });
    byText(ctx.root, ".dishes button", "300").click();
    expect(ctx.root.querySelector("h1")!.textContent).toBe("Ticket 300 · Dessert · Pecan pie");
    const form = ctx.root.querySelector("form.scorecard")!;
    expect([...form.querySelectorAll("label")].map((l) => l.firstChild!.textContent)).toEqual(["Taste (×2) ", "Aroma (×1) ", "Comment (optional) "]);
    (form.querySelector("[name=taste]") as HTMLSelectElement).value = "9";
    (form.querySelector("[name=aroma]") as HTMLSelectElement).value = "6";
    submit(form);
    await flush();
    await answerDialog("Cancel");
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    submit(form);
    await flush();
    expect(document.querySelector("dialog.confirm h2")!.textContent).toBe("Submit your scores for ticket 300?");
    await answerDialog("Submit scores");
    expect(calls.find((c) => c.method === "POST")!.body).toEqual({ entryId: "b", scores: { taste: 9, aroma: 6 }, comment: "" });
    expect(ctx.root.textContent).toContain("2 of 2 scored");
  });

  it("shows a locked card read-only, and goes back to the list", async () => {
    const { ctx } = await openSheet();
    byText(ctx.root, ".dishes button", "214").click();
    const form = ctx.root.querySelector("form.scorecard")!;
    expect((form.querySelector("[name=taste]") as HTMLSelectElement).value).toBe("8");
    expect((form.querySelector("[name=taste]") as HTMLSelectElement).disabled).toBe(true);
    expect((form.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Good heat");
    expect(form.querySelector("button[type=submit]")).toBeNull();
    expect(ctx.root.textContent).toContain("Submitted and locked.");
    byText(ctx.root, "button", "All dishes").click();
    expect(ctx.root.querySelector(".dishes")).not.toBeNull();
  });

  it("refills an unlocked card so the judge can change it", async () => {
    const { ctx } = await openSheet({}, { ...sheet, cards: [{ entryId: "a", scores: { taste: 8, aroma: 7 }, comment: null, locked: false }] });
    expect(byText(ctx.root, ".dishes button", "214").textContent).toContain("To score");
    byText(ctx.root, ".dishes button", "214").click();
    const taste = ctx.root.querySelector("[name=taste]") as HTMLSelectElement;
    expect([taste.value, taste.disabled]).toEqual(["8", false]);
    expect((ctx.root.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");
  });

  it("shows why a submission failed", async () => {
    const { ctx } = await openSheet({ "POST /api/public/judges/j1/scores": [409, { error: "x", code: "scoreLocked" }] });
    byText(ctx.root, ".dishes button", "300").click();
    const form = ctx.root.querySelector("form.scorecard")!;
    submit(form);
    await flush();
    await answerDialog("Submit scores");
    expect(ctx.root.querySelector(".status")!.textContent).toBe("x");
  });

  it("checks again for a new status while waiting, and reports a failed check", async () => {
    let status = "setup";
    const calls = fakeApi({ "GET /api/public/judges/j1": () => page(status, null, sheet) });
    const ctx = makeCtx("/j/j1");
    await judgeView(ctx, "j1");
    status = "open";
    byText(ctx.root, "button", "Check again").click();
    await flush();
    expect(ctx.root.querySelector(".dishes")).not.toBeNull();
    expect(calls.length).toBe(2);
    fakeApi({ "GET /api/public/judges/j1": [500, { error: "down" }] });
    byText(ctx.root, "button", "Check again").click();
    await flush();
    expect(ctx.root.querySelector(".status")!.textContent).toBe("down");
  });
});
