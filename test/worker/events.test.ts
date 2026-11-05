import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { insertEvent } from "../../src/worker/events";
import { call, latestLink, login, makeEntry, makeEvent, jpeg, send } from "./helpers";

describe("events", () => {
  it("needs a login to list or create", async () => {
    expect((await call("/api/events")).status).toBe(401);
    expect((await send("/api/events", "POST", { name: "x" })).status).toBe(401);
  });

  it("creates an event with one 'Main' category, owned by its creator", async () => {
    const cookie = await login("host@example.com");
    const res = await send("/api/events", "POST", { name: "  Chili Night  ", date: "2026-11-01" }, cookie);
    expect(res.status).toBe(201);
    const { id, code } = await res.json<{ id: string; code: string }>();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);

    const manage = await (await call(`/api/events/${id}`, { cookie })).json<Record<string, unknown>>();
    expect(manage).toMatchObject({
      event: { id, code, name: "Chili Night", date: "2026-11-01", status: "setup" },
      role: "creator",
      organizers: [{ email: "host@example.com", role: "creator" }],
      entries: [],
    });
    expect(manage.categories).toEqual([{ id: expect.any(String), name: "Main", position: 1 }]);
    expect(manage.votesCast).toEqual([{ categoryId: expect.any(String), votes: 0 }]);
  });

  it("lists my events, newest date first, with my role", async () => {
    const cookie = await login("list@example.com");
    await send("/api/events", "POST", { name: "Older", date: "2025-06-01" }, cookie);
    await send("/api/events", "POST", { name: "Undated" }, cookie);
    await send("/api/events", "POST", { name: "Newer", date: "2027-06-01" }, cookie);
    const other = await login("someone@example.com");
    await send("/api/events", "POST", { name: "Not mine" }, other);

    const { events } = await (await call("/api/events", { cookie })).json<{ events: { name: string; role: string }[] }>();
    expect(events.map((e) => e.name)).toEqual(["Newer", "Undated", "Older"]);
    expect(events.every((e) => e.role === "creator")).toBe(true);
  });

  it("validates the name and date", async () => {
    const cookie = await login("v@example.com");
    expect((await send("/api/events", "POST", { name: "" }, cookie)).status).toBe(400);
    expect((await send("/api/events", "POST", { name: 5 }, cookie)).status).toBe(400);
    expect((await send("/api/events", "POST", { name: "x".repeat(121) }, cookie)).status).toBe(400);
    expect((await send("/api/events", "POST", { name: "ok", date: "Nov 1" }, cookie)).status).toBe(400);
    expect((await send("/api/events", "POST", { name: "ok", date: 20261101 }, cookie)).status).toBe(400);
    expect((await send("/api/events", "POST", { name: "ok", date: null }, cookie)).status).toBe(201);
  });

  it("keeps strangers out with 403, and unknown events are 404", async () => {
    const host = await login("own@example.com");
    const { id } = await makeEvent(host);
    const stranger = await login("stranger@example.com");
    expect((await call(`/api/events/${id}`, { cookie: stranger })).status).toBe(403);
    expect((await call(`/api/events/nope`, { cookie: host })).status).toBe(404);
  });

  it("updates the name and date, leaving out what isn't sent", async () => {
    const cookie = await login("upd@example.com");
    const { id } = await makeEvent(cookie);
    await send(`/api/events/${id}`, "PATCH", { name: "Chili Bowl" }, cookie);
    let ev = (await (await call(`/api/events/${id}`, { cookie })).json<{ event: { name: string; date: string | null } }>()).event;
    expect(ev).toMatchObject({ name: "Chili Bowl", date: "2026-11-01" });
    await send(`/api/events/${id}`, "PATCH", { date: "" }, cookie);
    ev = (await (await call(`/api/events/${id}`, { cookie })).json<{ event: { name: string; date: string | null } }>()).event;
    expect(ev).toMatchObject({ name: "Chili Bowl", date: null });
  });

  it("moves through setup → open → closed → (reopen) → revealed → (undo) → closed", async () => {
    const cookie = await login("status@example.com");
    const { id } = await makeEvent(cookie);
    const go = (status: unknown) => send(`/api/events/${id}/status`, "POST", { status }, cookie);

    expect((await go("closed")).status).toBe(409);
    expect(await (await go("open")).json()).toEqual({ status: "open" });
    expect((await go("revealed")).status).toBe(409);
    expect((await go("closed")).status).toBe(200);
    expect((await go("open")).status).toBe(200);
    expect((await go("closed")).status).toBe(200);
    expect((await go("revealed")).status).toBe(200);
    // An undone reveal goes back to closed, never straight to voting (decision 17).
    const skip = await go("open");
    expect(skip.status).toBe(409);
    expect(await skip.json()).toEqual({ error: "Can't go from revealed to open", code: "badStatusChange" });
    expect((await go("setup")).status).toBe(409);
    expect(await (await go("closed")).json()).toEqual({ status: "closed" });
    expect((await go("open")).status).toBe(200);
    expect((await go(42)).status).toBe(409);
  });

  it("hides the results from guests again when a reveal is undone", async () => {
    const cookie = await login("undo@example.com");
    const { id, categoryId } = await makeEvent(cookie);
    await makeEntry(cookie, categoryId, "Al", "Stew", jpeg());
    const go = (status: string) => send(`/api/events/${id}/status`, "POST", { status }, cookie);
    await go("open");
    await go("closed");
    await go("revealed");
    const cook = async () =>
      (await (await call(`/api/public/events/${id}`)).json<{ categories: { entries: { cookName?: string }[] }[] }>()).categories[0]!.entries[0]!.cookName;
    expect(await cook()).toBe("Al");
    await go("closed");
    expect(await cook()).toBeUndefined();
  });

  it("lets a co-organizer undo a reveal", async () => {
    const host = await login("undo-host@example.com");
    const { id } = await makeEvent(host);
    await send(`/api/events/${id}/organizers`, "POST", { email: "undo-co@example.com" }, host);
    const co = await login("undo-co@example.com");
    for (const status of ["open", "closed", "revealed"]) await send(`/api/events/${id}/status`, "POST", { status }, host);
    expect((await send(`/api/events/${id}/status`, "POST", { status: "closed" }, co)).status).toBe(200);
  });

  it("lets only the creator delete, and removes the photos with the event", async () => {
    const host = await login("del@example.com");
    const { id, categoryId } = await makeEvent(host);
    const entry = await makeEntry(host, categoryId, "Al", "Stew", jpeg());
    expect(await env.PHOTOS.head(entry.photoKey!)).not.toBeNull();

    const co = await login("co-del@example.com");
    await send(`/api/events/${id}/organizers`, "POST", { email: "co-del@example.com" }, host);
    expect((await call(`/api/events/${id}`, { method: "DELETE", cookie: co })).status).toBe(403);

    expect((await call(`/api/events/${id}`, { method: "DELETE", cookie: host })).status).toBe(200);
    expect((await call(`/api/events/${id}`, { cookie: host })).status).toBe(404);
    expect(await env.PHOTOS.head(entry.photoKey!)).toBeNull();
    const left = await env.DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE category_id = ?").bind(categoryId).first<{ n: number }>();
    expect(left!.n).toBe(0);
  });

  it("deletes an event that never had photos", async () => {
    const host = await login("bare@example.com");
    const { id } = await makeEvent(host);
    expect((await call(`/api/events/${id}`, { method: "DELETE", cookie: host })).status).toBe(200);
  });

  it("deletes photos past the first page of an R2 listing", async () => {
    const host = await login("many@example.com");
    const { id } = await makeEvent(host);
    for (let i = 0; i < 1005; i++) await env.PHOTOS.put(`events/${id}/x${i}`, "x");
    expect((await call(`/api/events/${id}`, { method: "DELETE", cookie: host })).status).toBe(200);
    expect((await env.PHOTOS.list({ prefix: `events/${id}/` })).objects).toHaveLength(0);
  });

  it("retries the short code on a clash, and gives up after five", async () => {
    const host = await login("code@example.com");
    const { code } = await makeEvent(host);
    const now = new Date().toISOString();
    const codes = [code, code, "ZZZZZZ"];
    const got = await insertEvent(env, { id: "retry-1", name: "R", date: null, kind: "family", email: "code@example.com", now }, () => codes.shift()!);
    expect(got).toBe("ZZZZZZ");
    await expect(
      insertEvent(env, { id: "retry-2", name: "R", date: null, kind: "family", email: "code@example.com", now }, () => code),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe("live totals", () => {
  it("are for organizers only, with zero for unvoted entries", async () => {
    const host = await login("tot@example.com");
    const { id, categoryId } = await makeEvent(host);
    const a = await makeEntry(host, categoryId, "A", "One");
    const stranger = await login("nosy@example.com");
    expect((await call(`/api/events/${id}/totals`, { cookie: stranger })).status).toBe(403);
    const { totals } = await (await call(`/api/events/${id}/totals`, { cookie: host })).json<{ totals: unknown[] }>();
    expect(totals).toEqual([{ entryId: a.id, categoryId, votes: 0 }]);
  });
});

describe("categories", () => {
  it("adds, renames and deletes, keeping at least one", async () => {
    const cookie = await login("cat@example.com");
    const { id, categoryId } = await makeEvent(cookie);

    const added = await send(`/api/events/${id}/categories`, "POST", { name: "Dessert" }, cookie);
    expect(added.status).toBe(201);
    const { id: dessert } = await added.json<{ id: string }>();

    await send(`/api/categories/${dessert}`, "PATCH", { name: "Desserts" }, cookie);
    const manage = await (await call(`/api/events/${id}`, { cookie })).json<{ categories: { name: string; position: number }[] }>();
    expect(manage.categories).toEqual([
      { id: categoryId, name: "Main", position: 1 },
      { id: dessert, name: "Desserts", position: 2 },
    ]);

    const photo = await makeEntry(cookie, dessert, "B", "Pie", jpeg());
    await makeEntry(cookie, dessert, "C", "Cake");
    expect((await call(`/api/categories/${dessert}`, { method: "DELETE", cookie })).status).toBe(200);
    expect(await env.PHOTOS.head(photo.photoKey!)).toBeNull();
    const last = await call(`/api/categories/${categoryId}`, { method: "DELETE", cookie });
    expect(last.status).toBe(409);
  });

  it("checks the category exists and belongs to the caller", async () => {
    const cookie = await login("cat2@example.com");
    const { categoryId } = await makeEvent(cookie);
    expect((await send(`/api/categories/nope`, "PATCH", { name: "x" }, cookie)).status).toBe(404);
    const stranger = await login("cat-stranger@example.com");
    expect((await send(`/api/categories/${categoryId}`, "PATCH", { name: "x" }, stranger)).status).toBe(403);
    expect((await send(`/api/categories/${categoryId}`, "PATCH", { name: "" }, cookie)).status).toBe(400);
  });

  it("freezes once voting closes", async () => {
    const cookie = await login("cat3@example.com");
    const { id } = await makeEvent(cookie);
    const { id: second } = await (await send(`/api/events/${id}/categories`, "POST", { name: "Two" }, cookie)).json<{ id: string }>();
    await send(`/api/events/${id}/status`, "POST", { status: "open" }, cookie);
    await send(`/api/events/${id}/status`, "POST", { status: "closed" }, cookie);
    expect((await send(`/api/events/${id}/categories`, "POST", { name: "Three" }, cookie)).status).toBe(409);
    expect((await call(`/api/categories/${second}`, { method: "DELETE", cookie })).status).toBe(409);
    expect((await send(`/api/categories/${second}`, "PATCH", { name: "Renamed" }, cookie)).status).toBe(409);
  });
});

describe("co-organizers", () => {
  it("are invited by email, can run the event, and see it in their list", async () => {
    const host = await login("lead@example.com");
    const { id } = await makeEvent(host, "Family Cookoff");
    const res = await send(`/api/events/${id}/organizers`, "POST", { email: "Kiana@Example.com" }, host);
    expect(res.status).toBe(201);

    const invite = await env.DB.prepare("SELECT subject, body FROM dev_outbox WHERE to_addr = ? ORDER BY id DESC")
      .bind("kiana@example.com")
      .first<{ subject: string; body: string }>();
    expect(invite!.subject).toBe("You're helping run Family Cookoff");
    expect(invite!.body).toContain("lead@example.com has made you a co-organizer");
    expect(invite!.body).toContain("expires in 15 minutes");
    expect(new URL(await latestLink("kiana@example.com")).searchParams.get("next")).toBe(`/e/${id}`);

    const kiana = await login("kiana@example.com");
    const { events } = await (await call("/api/events", { cookie: kiana })).json<{ events: { id: string; role: string }[] }>();
    expect(events).toEqual([expect.objectContaining({ id, role: "co" })]);
    expect((await send(`/api/events/${id}/status`, "POST", { status: "open" }, kiana)).status).toBe(200);
    expect((await call(`/api/events/${id}/totals`, { cookie: kiana })).status).toBe(200);

    // A co-organizer can't invite or remove anyone.
    expect((await send(`/api/events/${id}/organizers`, "POST", { email: "x@example.com" }, kiana)).status).toBe(403);
  });

  it("are invited in the inviter's language (SW-27)", async () => {
    const host = await login("anfitrion@example.com");
    const { id } = await makeEvent(host, "Concurso Familiar");
    expect((await send(`/api/events/${id}/organizers`, "POST", { email: "tia@example.com", lang: "es" }, host)).status).toBe(201);
    const invite = await env.DB.prepare("SELECT subject, body FROM dev_outbox WHERE to_addr = ? ORDER BY id DESC")
      .bind("tia@example.com")
      .first<{ subject: string; body: string }>();
    expect(invite!.subject).toBe("Te invitaron a organizar Concurso Familiar");
    expect(invite!.body).toContain("anfitrion@example.com te agregó al equipo organizador de \"Concurso Familiar\"");
    expect(invite!.body).toContain("vence en 15 minutos");
  });

  it("refuses duplicates and bad addresses", async () => {
    const host = await login("dup@example.com");
    const { id } = await makeEvent(host);
    expect((await send(`/api/events/${id}/organizers`, "POST", { email: "dup@example.com" }, host)).status).toBe(409);
    expect((await send(`/api/events/${id}/organizers`, "POST", { email: "nope" }, host)).status).toBe(400);
  });

  it("can be removed by the creator, but the creator can't be", async () => {
    const host = await login("rm@example.com");
    const { id } = await makeEvent(host);
    await send(`/api/events/${id}/organizers`, "POST", { email: "helper@example.com" }, host);
    const helper = await login("helper@example.com");

    expect((await call(`/api/events/${id}/organizers/rm%40example.com`, { method: "DELETE", cookie: host })).status).toBe(404);
    expect((await call(`/api/events/${id}/organizers/HELPER%40example.com`, { method: "DELETE", cookie: host })).status).toBe(200);
    expect((await call(`/api/events/${id}`, { cookie: helper })).status).toBe(403);
  });
});
