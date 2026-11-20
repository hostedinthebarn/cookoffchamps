import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "../../src/worker/turnstile";
import { call, deviceCookie, login, makeEntry, makeEvent, send, stubTurnstile, vote } from "./helpers";

afterEach(() => vi.restoreAllMocks());

async function openEvent() {
  const host = await login(`host-${crypto.randomUUID()}@example.com`);
  const ev = await makeEvent(host);
  const a = await makeEntry(host, ev.categoryId, "Grandma", "Red chili");
  const b = await makeEntry(host, ev.categoryId, "Kiana", "White chili");
  await send(`/api/events/${ev.id}/status`, "POST", { status: "open" }, host);
  return { host, ...ev, a, b };
}

describe("code lookup", () => {
  it("finds an event by its typed code, in any case", async () => {
    const { id, code } = await openEvent();
    expect(await (await call(`/api/public/codes/${code.toLowerCase()}`)).json()).toEqual({ id });
    expect((await call(`/api/public/codes/NOPE99`)).status).toBe(404);
  });
});

describe("the guest view", () => {
  it("is blind while voting: no cooks, no counts (decision 9)", async () => {
    const { id, a } = await openEvent();
    const view = await (await call(`/api/public/events/${id}`)).json<{
      event: { status: string };
      turnstileSiteKey: string;
      myVotes: object;
      categories: { name: string; entries: Record<string, unknown>[]; placings?: unknown }[];
    }>();
    expect(view.event.status).toBe("open");
    expect(view.turnstileSiteKey).toBe("1x00000000000000000000AA");
    expect(view.myVotes).toEqual({});
    expect(view.categories[0]!.name).toBe("Main");
    expect(view.categories[0]!.entries[0]).toEqual({ id: a.id, number: 1, dishName: "Red chili", photoKey: null });
    expect(view.categories[0]).not.toHaveProperty("placings");
    expect(JSON.stringify(view)).not.toContain("Grandma");
  });

  it("is a 404 for an unknown event", async () => {
    expect((await call(`/api/public/events/nope`)).status).toBe(404);
  });
});

describe("voting", () => {
  it("records one vote per device, replaceable until close (decisions 5 and 14)", async () => {
    stubTurnstile();
    const { id, categoryId, a, b } = await openEvent();

    const first = await vote(id, categoryId, a.id);
    expect(first.status).toBe(200);
    const device = deviceCookie(first);
    expect(first.headers.get("set-cookie")).toContain("Max-Age=31536000; HttpOnly; Secure; SameSite=Lax");

    let view = await (await call(`/api/public/events/${id}`, { cookie: device })).json<{ myVotes: object }>();
    expect(view.myVotes).toEqual({ [categoryId]: a.id });

    // Changing the vote replaces it and doesn't set a new cookie.
    const change = await vote(id, categoryId, b.id, device);
    expect(change.headers.get("set-cookie")).toBeNull();
    view = await (await call(`/api/public/events/${id}`, { cookie: device })).json<{ myVotes: object }>();
    expect(view.myVotes).toEqual({ [categoryId]: b.id });

    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM votes WHERE category_id = ?").bind(categoryId).first<{ n: number }>();
    expect(n!.n).toBe(1);
  });

  it("sends the visitor's IP to Turnstile with the token", async () => {
    const spy = stubTurnstile();
    const { id, categoryId, a } = await openEvent();
    await vote(id, categoryId, a.id);
    const body = spy.mock.calls[0]![1]!.body as FormData;
    expect(body.get("secret")).toBe("test-secret");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("203.0.113.9");
  });

  it("refuses a vote Turnstile doesn't confirm", async () => {
    stubTurnstile(false);
    const { id, categoryId, a } = await openEvent();
    expect((await vote(id, categoryId, a.id)).status).toBe(403);
  });

  it("refuses votes outside the open window", async () => {
    stubTurnstile();
    const { host, id, categoryId, a } = await openEvent();
    await send(`/api/events/${id}/status`, "POST", { status: "closed" }, host);
    const res = await vote(id, categoryId, a.id);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Voting isn't open", code: "votingNotOpen" });
  });

  it("refuses an entry from another category or event", async () => {
    stubTurnstile();
    const one = await openEvent();
    const two = await openEvent();
    expect((await vote(one.id, one.categoryId, two.a.id)).status).toBe(400);
    expect((await vote(one.id, two.categoryId, two.a.id)).status).toBe(400);
    const missing = await call(`/api/public/events/${one.id}/votes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(missing.status).toBe(400);
  });

  it("shows the votes-cast count to organizers, not the standings", async () => {
    stubTurnstile();
    const { host, id, categoryId, a, b } = await openEvent();
    await vote(id, categoryId, a.id);
    await vote(id, categoryId, b.id);
    await vote(id, categoryId, b.id);
    const manage = await (await call(`/api/events/${id}`, { cookie: host })).json<{ votesCast: unknown }>();
    expect(manage.votesCast).toEqual([{ categoryId, votes: 3 }]);
    const { totals } = await (await call(`/api/events/${id}/totals`, { cookie: host })).json<{ totals: unknown }>();
    expect(totals).toEqual([
      { entryId: a.id, categoryId, votes: 1, phone: 1, paper: 0 },
      { entryId: b.id, categoryId, votes: 2, phone: 2, paper: 0 },
    ]);
  });
});

describe("results", () => {
  it("show cooks, counts and placings once revealed (decision 13)", async () => {
    stubTurnstile();
    const { host, id, categoryId, a, b } = await openEvent();
    await vote(id, categoryId, b.id);
    await vote(id, categoryId, b.id);
    await vote(id, categoryId, a.id);
    await send(`/api/events/${id}/status`, "POST", { status: "closed" }, host);

    // Closed but not yet revealed: still blind.
    let view = await (await call(`/api/public/events/${id}`)).json<{ categories: Record<string, unknown>[] }>();
    expect(view.categories[0]).not.toHaveProperty("placings");

    await send(`/api/events/${id}/status`, "POST", { status: "revealed" }, host);
    view = await (await call(`/api/public/events/${id}`)).json<{ categories: Record<string, unknown>[] }>();
    expect(view.categories[0]!.placings).toEqual([
      { place: 1, entryIds: [b.id], votes: 2 },
      { place: 2, entryIds: [a.id], votes: 1 },
    ]);
    expect(view.categories[0]!.entries).toEqual([
      { id: a.id, number: 1, dishName: "Red chili", photoKey: null, cookName: "Grandma", votes: 1, phoneVotes: 1, paperVotes: 0 },
      { id: b.id, number: 2, dishName: "White chili", photoKey: null, cookName: "Kiana", votes: 2, phoneVotes: 2, paperVotes: 0 },
    ]);
  });
});

describe("verifyTurnstile", () => {
  it("fails closed on a missing token, an HTTP error or a bad answer", async () => {
    expect(await verifyTurnstile(env, undefined, null)).toBe(false);
    expect(await verifyTurnstile(env, "", null)).toBe(false);

    stubTurnstile(true, false);
    expect(await verifyTurnstile(env, "tok", null)).toBe(false);
    vi.restoreAllMocks();

    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    expect(await verifyTurnstile(env, "tok", null)).toBe(false);
    expect((spy.mock.calls[0]![1]!.body as FormData).has("remoteip")).toBe(false);
  });
});
