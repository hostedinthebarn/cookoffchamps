import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { requireKind } from "../../src/worker/access";
import type { Env } from "../../src/worker/env";
import { call, login, makeEntry, send } from "./helpers";

// Pro events, part 1 (SW-25): the kind of event, raffle-ticket numbers and judges.
// The tests run with PRO_PREVIEW "on" (vitest.config.ts).

async function makePro(cookie: string, name = "Judged Chili") {
  const res = await send("/api/events", "POST", { name, kind: "pro" }, cookie);
  expect(res.status).toBe(201);
  const { id } = await res.json<{ id: string }>();
  const manage = await (await call(`/api/events/${id}`, { cookie })).json<{ categories: { id: string }[] }>();
  return { id, categoryId: manage.categories[0]!.id };
}

function entryForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

function addEntry(cookie: string, categoryId: string, fields: Record<string, string>) {
  return call(`/api/categories/${categoryId}/entries`, { method: "POST", cookie, body: entryForm(fields) });
}

function patchEntry(cookie: string, entryId: string, fields: Record<string, string>) {
  return call(`/api/entries/${entryId}`, { method: "PATCH", cookie, body: entryForm(fields) });
}

async function manage(cookie: string, id: string) {
  return (await call(`/api/events/${id}`, { cookie })).json<{
    event: { kind: string };
    proPreview: boolean;
    entries: { id: string; ticket: string | null; dishName: string }[];
    judges: { id: string; name: string }[];
  }>();
}

describe("the kind of event (rule 1)", () => {
  it("creates a pro event while the preview is on, and lists it as one", async () => {
    const cookie = await login("pro-host@example.com");
    const { id } = await makePro(cookie);
    const view = await manage(cookie, id);
    expect(view.event.kind).toBe("pro");
    expect(view.proPreview).toBe(true);
    expect(view.judges).toEqual([]);
    const { events } = await (await call("/api/events", { cookie })).json<{ events: { id: string; kind: string }[] }>();
    expect(events.find((e) => e.id === id)!.kind).toBe("pro");
  });

  it("makes a family event when no kind is given, and refuses an unknown one", async () => {
    const cookie = await login("kinds@example.com");
    const res = await send("/api/events", "POST", { name: "Plain" }, cookie);
    expect((await manage(cookie, (await res.json<{ id: string }>()).id)).event.kind).toBe("family");
    expect((await send("/api/events", "POST", { name: "Odd", kind: "gala" }, cookie)).status).toBe(400);
  });

  it("refuses Pro when the preview is off", () => {
    const off = { ...env, PRO_PREVIEW: "off" } as Env;
    expect(() => requireKind("pro", off)).toThrow(expect.objectContaining({ status: 403, code: "proUnavailable" }));
    expect(requireKind(null, off)).toBe("family");
    expect(requireKind("family", off)).toBe("family");
  });

  it("can change while setting up, and is fixed once voting opens", async () => {
    const cookie = await login("switch@example.com");
    const { id } = await makePro(cookie);
    expect((await send(`/api/events/${id}`, "PATCH", { kind: "family" }, cookie)).status).toBe(200);
    expect((await manage(cookie, id)).event.kind).toBe("family");
    expect((await send(`/api/events/${id}`, "PATCH", { kind: "pro", name: "Back to pro" }, cookie)).status).toBe(200);
    expect((await manage(cookie, id)).event.kind).toBe("pro");

    await send(`/api/events/${id}/status`, "POST", { status: "open" }, cookie);
    const fixed = await send(`/api/events/${id}`, "PATCH", { kind: "family" }, cookie);
    expect(fixed.status).toBe(409);
    expect(await fixed.json()).toMatchObject({ code: "kindFixed" });
    // Sending the kind it already is, as the edit form does, is fine.
    expect((await send(`/api/events/${id}`, "PATCH", { kind: "pro", name: "Renamed" }, cookie)).status).toBe(200);
  });
});

describe("raffle-ticket numbers (rules 3 and 4)", () => {
  it("lists a cook before turn-in with no dish or ticket, then adds them at turn-in", async () => {
    const cookie = await login("tickets@example.com");
    const { id, categoryId } = await makePro(cookie);
    const res = await addEntry(cookie, categoryId, { cookName: "Ana" });
    expect(res.status).toBe(201);
    const entry = await res.json<{ id: string; ticket: string | null }>();
    expect(entry.ticket).toBeNull();

    const turnIn = await patchEntry(cookie, entry.id, { dishName: "Brisket chili", ticket: " 0214a " });
    expect(await turnIn.json()).toMatchObject({ ticket: "0214A" });
    // A later edit that doesn't send the ticket keeps it.
    await patchEntry(cookie, entry.id, { cookName: "Ana B." });
    expect((await manage(cookie, id)).entries[0]).toMatchObject({ ticket: "0214A", dishName: "Brisket chili" });
    // An empty ticket takes it off again, and an empty dish is allowed in a pro event.
    await patchEntry(cookie, entry.id, { ticket: "", dishName: "" });
    expect((await manage(cookie, id)).entries[0]).toMatchObject({ ticket: null, dishName: "" });
  });

  it("takes a ticket when the dish is added at the table", async () => {
    const cookie = await login("walkup@example.com");
    const { categoryId } = await makePro(cookie);
    const res = await addEntry(cookie, categoryId, { cookName: "Walk-up", dishName: "Verde", ticket: "77" });
    expect(await res.json()).toMatchObject({ ticket: "77" });
  });

  it("refuses a malformed ticket, and one already on another dish in any category", async () => {
    const cookie = await login("clash@example.com");
    const { id, categoryId } = await makePro(cookie);
    const bad = await addEntry(cookie, categoryId, { cookName: "A", ticket: "12 34" });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ code: "badTicket" });
    expect((await addEntry(cookie, categoryId, { cookName: "A", ticket: "1".repeat(13) })).status).toBe(400);
    const asFile = new FormData();
    asFile.set("cookName", "A");
    asFile.set("ticket", new File(["214"], "ticket.txt"));
    expect((await call(`/api/categories/${categoryId}/entries`, { method: "POST", cookie, body: asFile })).status).toBe(400);

    await addEntry(cookie, categoryId, { cookName: "A", ticket: "500" });
    await send(`/api/events/${id}/categories`, "POST", { name: "Dessert" }, cookie);
    const second = (await manage(cookie, id)) as unknown as { categories: { id: string }[] };
    const dessert = second.categories[1]!.id;
    const taken = await addEntry(cookie, dessert, { cookName: "B", ticket: "500" });
    expect(taken.status).toBe(409);
    expect(await taken.json()).toMatchObject({ code: "ticketTaken" });

    // Re-saving a dish with its own ticket isn't a clash.
    const own = (await manage(cookie, id)).entries.find((e) => e.ticket === "500")!;
    expect((await patchEntry(cookie, own.id, { ticket: "500" })).status).toBe(200);
  });

  it("keeps family events as they were: a dish is required and tickets are ignored", async () => {
    const cookie = await login("family-tickets@example.com");
    const res = await send("/api/events", "POST", { name: "Family" }, cookie);
    const { id } = await res.json<{ id: string }>();
    const categoryId = ((await manage(cookie, id)) as unknown as { categories: { id: string }[] }).categories[0]!.id;
    expect((await addEntry(cookie, categoryId, { cookName: "A" })).status).toBe(400);
    const added = await addEntry(cookie, categoryId, { cookName: "A", dishName: "Red", ticket: "9" });
    expect(await added.json()).toMatchObject({ ticket: null });
    const entry = await makeEntry(cookie, categoryId);
    expect(await (await patchEntry(cookie, entry.id, { ticket: "9" })).json()).toMatchObject({ ticket: null });
  });
});

describe("judges (rule 5)", () => {
  it("adds a judge whose personal link opens their page, with no login", async () => {
    const cookie = await login("judges@example.com");
    const { id } = await makePro(cookie, "Fair Chili");
    const res = await send(`/api/events/${id}/judges`, "POST", { name: "  Pat  " }, cookie);
    expect(res.status).toBe(201);
    const judge = await res.json<{ id: string; name: string }>();
    expect(judge).toEqual({ id: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/), name: "Pat" });
    expect((await manage(cookie, id)).judges).toEqual([{ id: judge.id, name: "Pat" }]);

    const page = await call(`/api/public/judges/${judge.id}`);
    expect(page.status).toBe(200);
    expect(await page.json()).toEqual({
      judge: { name: "Pat" },
      event: { id, name: "Fair Chili", date: null, status: "setup" },
    });
  });

  it("revokes a judge: the link stops working at once and they leave the list", async () => {
    const cookie = await login("revoke@example.com");
    const { id } = await makePro(cookie);
    const { id: judgeId } = await (await send(`/api/events/${id}/judges`, "POST", { name: "Lee" }, cookie)).json<{ id: string }>();
    const stranger = await login("not-an-organizer@example.com");
    expect((await call(`/api/judges/${judgeId}`, { method: "DELETE", cookie: stranger })).status).toBe(403);

    expect((await call(`/api/judges/${judgeId}`, { method: "DELETE", cookie })).status).toBe(200);
    const gone = await call(`/api/public/judges/${judgeId}`);
    expect(gone.status).toBe(404);
    expect(await gone.json()).toMatchObject({ code: "judgeNotFound" });
    expect((await manage(cookie, id)).judges).toEqual([]);
    // Twice, or an id that never existed, is a 404.
    expect((await call(`/api/judges/${judgeId}`, { method: "DELETE", cookie })).status).toBe(404);
    expect((await call("/api/judges/nope", { method: "DELETE", cookie })).status).toBe(404);
    expect((await call("/api/public/judges/nope")).status).toBe(404);
  });

  it("are for pro events only, organizers only, and not after voting closes", async () => {
    const cookie = await login("judge-rules@example.com");
    const family = await (await send("/api/events", "POST", { name: "Family" }, cookie)).json<{ id: string }>();
    const notPro = await send(`/api/events/${family.id}/judges`, "POST", { name: "Pat" }, cookie);
    expect(notPro.status).toBe(409);
    expect(await notPro.json()).toMatchObject({ code: "notPro" });

    const { id } = await makePro(cookie);
    const stranger = await login("judge-stranger@example.com");
    expect((await send(`/api/events/${id}/judges`, "POST", { name: "Pat" }, stranger)).status).toBe(403);
    expect((await send(`/api/events/${id}/judges`, "POST", { name: "" }, cookie)).status).toBe(400);
    expect((await send(`/api/events/${id}/judges`, "POST", { name: "x".repeat(61) }, cookie)).status).toBe(400);
    expect((await send(`/api/events/${id}/judges`, "POST", { name: "Pat" })).status).toBe(401);

    await send(`/api/events/${id}/status`, "POST", { status: "open" }, cookie);
    expect((await send(`/api/events/${id}/judges`, "POST", { name: "Open-time judge" }, cookie)).status).toBe(201);
    await send(`/api/events/${id}/status`, "POST", { status: "closed" }, cookie);
    const late = await send(`/api/events/${id}/judges`, "POST", { name: "Late" }, cookie);
    expect(late.status).toBe(409);
    expect(await late.json()).toMatchObject({ code: "entriesFrozen" });
  });

  it("go with their event when it's deleted", async () => {
    const cookie = await login("judge-cascade@example.com");
    const { id } = await makePro(cookie);
    const { id: judgeId } = await (await send(`/api/events/${id}/judges`, "POST", { name: "Sam" }, cookie)).json<{ id: string }>();
    await call(`/api/events/${id}`, { method: "DELETE", cookie });
    expect((await call(`/api/public/judges/${judgeId}`)).status).toBe(404);
  });
});
