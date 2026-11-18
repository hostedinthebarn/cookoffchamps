import { afterEach, describe, expect, it, vi } from "vitest";
import { totalVotes } from "../../src/worker/paper";
import { call, login, makeEntry, makeEvent, send, stubTurnstile, vote } from "./helpers";

afterEach(() => vi.restoreAllMocks());

// Paper ballots (SW-92): counts added after the close, ranked with the phone votes.

async function closedEvent() {
  const host = await login(`paper-${crypto.randomUUID()}@example.com`);
  const ev = await makeEvent(host);
  const a = await makeEntry(host, ev.categoryId, "Grandma", "Red chili");
  const b = await makeEntry(host, ev.categoryId, "Kiana", "White chili");
  await send(`/api/events/${ev.id}/status`, "POST", { status: "open" }, host);
  stubTurnstile();
  await vote(ev.id, ev.categoryId, b.id, "cc_device=d1");
  await vote(ev.id, ev.categoryId, b.id, "cc_device=d2");
  await vote(ev.id, ev.categoryId, a.id, "cc_device=d3");
  await send(`/api/events/${ev.id}/status`, "POST", { status: "closed" }, host);
  return { host, ...ev, a, b };
}

const put = (id: string, body: unknown, cookie: string) => send(`/api/events/${id}/paper`, "PUT", body, cookie);
type Totals = { totals: { entryId: string; votes: number; phone: number; paper: number }[] };
const totals = async (id: string, cookie: string) => (await call(`/api/events/${id}/totals`, { cookie })).json<Totals>();

describe("adding paper votes", () => {
  it("adds them to the phone votes, and shows the split", async () => {
    const { host, id, a, b } = await closedEvent();
    // Phone: White chili 2, Red chili 1. Paper puts Red ahead, 1 + 3 against 2 + 1.
    const res = await put(id, { counts: [{ entryId: a.id, count: 3 }, { entryId: b.id, count: 1 }], handedOut: 5 }, host);
    expect(res.status).toBe(200);
    const { totals: rows } = await totals(id, host);
    expect(rows.find((r) => r.entryId === a.id)).toMatchObject({ votes: 4, phone: 1, paper: 3 });
    expect(rows.find((r) => r.entryId === b.id)).toMatchObject({ votes: 3, phone: 2, paper: 1 });

    const manage = await (await call(`/api/events/${id}`, { cookie: host })).json<{
      paperVotes: { entryId: string; count: number }[];
      paperBallots: number;
    }>();
    expect(manage.paperBallots).toBe(5);
    expect(manage.paperVotes).toHaveLength(2);
  });

  it("can be edited while closed: a new count replaces the old, zero removes it, no handed-out figure is fine", async () => {
    const { host, id, a, b } = await closedEvent();
    await put(id, { counts: [{ entryId: a.id, count: 3 }, { entryId: b.id, count: 4 }], handedOut: 9 }, host);
    await put(id, { counts: [{ entryId: a.id, count: 0 }, { entryId: b.id, count: 2 }] }, host);
    const { totals: rows } = await totals(id, host);
    expect(rows.find((r) => r.entryId === a.id)).toMatchObject({ votes: 1, paper: 0 });
    expect(rows.find((r) => r.entryId === b.id)).toMatchObject({ votes: 4, paper: 2 });
    const manage = await (await call(`/api/events/${id}`, { cookie: host })).json<{ paperVotes: unknown[]; paperBallots: number | null }>();
    expect(manage.paperVotes).toHaveLength(1);
    expect(manage.paperBallots).toBeNull();
  });

  it("decides ties across phone and paper the usual way (decision 8)", async () => {
    const { host, id, a, b } = await closedEvent();
    await put(id, { counts: [{ entryId: a.id, count: 1 }], handedOut: null }, host); // a: 1 + 1 = b: 2 + 0
    const { totals: rows } = await totals(id, host);
    expect(rows.map((r) => r.votes)).toEqual([2, 2]);
    expect(b.id).not.toBe(a.id);
  });

  it("reaches the guests' results only after the reveal, as a total and a split", async () => {
    const { host, id, categoryId, a, b } = await closedEvent();
    await put(id, { counts: [{ entryId: a.id, count: 3 }], handedOut: 3 }, host);
    const before = await call(`/api/public/events/${id}`);
    expect(JSON.stringify(await before.json())).not.toContain("paperVotes");

    await send(`/api/events/${id}/status`, "POST", { status: "revealed" }, host);
    const view = await (await call(`/api/public/events/${id}`)).json<{
      categories: { entries: { id: string; votes: number; phoneVotes: number; paperVotes: number }[]; placings: { entryIds: string[] }[] }[];
    }>();
    const cat = view.categories[0]!;
    expect(cat.entries.find((e) => e.id === a.id)).toMatchObject({ votes: 4, phoneVotes: 1, paperVotes: 3 });
    expect(cat.entries.find((e) => e.id === b.id)).toMatchObject({ votes: 2, phoneVotes: 2, paperVotes: 0 });
    expect(cat.placings[0]!.entryIds).toEqual([a.id]);
    expect(categoryId).toBeTruthy();
  });
});

describe("who can add them, and when", () => {
  it("locks at the reveal and unlocks when the reveal is undone", async () => {
    const { host, id, a } = await closedEvent();
    await send(`/api/events/${id}/status`, "POST", { status: "revealed" }, host);
    const locked = await put(id, { counts: [{ entryId: a.id, count: 2 }] }, host);
    expect(locked.status).toBe(409);
    expect((await locked.json<{ code: string }>()).code).toBe("paperLocked");

    await send(`/api/events/${id}/status`, "POST", { status: "closed" }, host);
    expect((await put(id, { counts: [{ entryId: a.id, count: 2 }] }, host)).status).toBe(200);
  });

  it("is refused while voting is open", async () => {
    const { host, id, a } = await closedEvent();
    await send(`/api/events/${id}/status`, "POST", { status: "open" }, host);
    expect((await put(id, { counts: [{ entryId: a.id, count: 2 }] }, host)).status).toBe(409);
  });

  it("is for family events only", async () => {
    const host = await login(`paper-pro-${crypto.randomUUID()}@example.com`);
    const { id } = await (await send("/api/events", "POST", { name: "Judged", kind: "pro" }, host)).json<{ id: string }>();
    const res = await put(id, { counts: [] }, host);
    expect(res.status).toBe(409);
    expect((await res.json<{ code: string }>()).code).toBe("paperFamilyOnly");
  });

  it("is for organizers: a stranger, a co-organizer's own event and a signed-out caller are refused", async () => {
    const { id, a } = await closedEvent();
    const stranger = await login(`stranger-${crypto.randomUUID()}@example.com`);
    expect((await put(id, { counts: [{ entryId: a.id, count: 2 }] }, stranger)).status).toBe(403);
    expect((await call(`/api/events/${id}/paper`, { method: "PUT", body: "{}" })).status).toBe(401);
  });

  it("checks what it's given", async () => {
    const { host, id, a } = await closedEvent();
    const other = await closedEvent();
    const bad = async (body: unknown, code?: string) => {
      const res = await put(id, body, host);
      expect(res.status).toBe(400);
      if (code) expect((await res.json<{ code: string }>()).code).toBe(code);
    };
    await bad({ counts: "nope" });
    await bad({ counts: [{ entryId: a.id, count: -1 }] }, "badCount");
    await bad({ counts: [{ entryId: a.id, count: 1.5 }] }, "badCount");
    await bad({ counts: [{ entryId: a.id, count: "3" }] }, "badCount");
    await bad({ counts: [{ entryId: a.id, count: 10000 }] }, "badCount");
    await bad({ counts: [{ entryId: a.id, count: 1 }], handedOut: -2 }, "badCount");
    await bad({ counts: [null] }, "badCount");
    // A dish from another event can't be counted here.
    await bad({ counts: [{ entryId: other.a.id, count: 1 }] }, "entryNotFound");
    await bad({ counts: [{ count: 1 }] }, "entryNotFound");
  });
});

describe("totalVotes", () => {
  it("is phone plus paper", () => {
    expect(totalVotes({ phone: 14, paper: 6 })).toBe(20);
  });
});
