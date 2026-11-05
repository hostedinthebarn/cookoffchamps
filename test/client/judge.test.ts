import { afterEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../../src/client/i18n";
import { judgeView } from "../../src/client/views/judge";
import { fakeApi, makeCtx } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  setLang("en", false);
});

const page = (status: string, date: string | null = "2026-11-21") => ({
  judge: { name: "Pat" },
  event: { id: "e1", name: "Fair Chili", date, status },
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
