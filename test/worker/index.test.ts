import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { matchPath } from "../../src/worker/index";
import { call } from "./helpers";

afterEach(() => vi.restoreAllMocks());

describe("worker routing", () => {
  it("reports health once the database answers", async () => {
    const res = await call("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns JSON 404 for unknown API paths and 405 for the wrong method", async () => {
    const res = await call("/api/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "Not found" });
    expect((await call("/api/health", { method: "POST" })).status).toBe(405);
  });

  it("hands everything else to the static assets", async () => {
    const res = await call("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Cookoff Champs");
  });

  it("counts home-page visits from the made-with links, per source and day (SW-59)", async () => {
    const hits = () =>
      env.DB.prepare("SELECT ref, hits FROM ref_counts ORDER BY ref").all<{ ref: string; hits: number }>().then((r) => r.results);
    expect((await call("/?ref=results")).status).toBe(200);
    await call("/?ref=results");
    await call("/?ref=reveal");
    await call("/?ref=chili&lang=es"); // a printable's QR code (SW-62)
    await call("/?ref=guide-pie"); // a guide's closing link (SW-63)
    for (const ref of ["fb", "ig", "yt", "pin"]) await call(`/?ref=${ref}`); // social posts (BIZ-57)
    // Unknown refs, other paths and other methods aren't counted.
    await call("/?ref=spam");
    await call("/help/?ref=results");
    await call("/?ref=reveal", { method: "HEAD" });
    await call("/");
    expect(await hits()).toEqual([
      { ref: "chili", hits: 1 },
      { ref: "fb", hits: 1 },
      { ref: "guide-pie", hits: 1 },
      { ref: "ig", hits: 1 },
      { ref: "pin", hits: 1 },
      { ref: "results", hits: 2 },
      { ref: "reveal", hits: 1 },
      { ref: "yt", hits: 1 },
    ]);
  });

  it("still serves the page if the ref can't be counted", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await env.DB.exec("ALTER TABLE ref_counts RENAME TO ref_counts_gone");
    try {
      expect((await call("/?ref=results")).status).toBe(200);
      expect(error).toHaveBeenCalled();
    } finally {
      await env.DB.exec("ALTER TABLE ref_counts_gone RENAME TO ref_counts");
    }
  });

  it("redirects www to the bare domain, keeping the path and query", async () => {
    const res = await worker.fetch(new Request("https://www.cookoffchamps.com/e/abc?x=1"), env);
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://cookoffchamps.com/e/abc?x=1");
  });

  it("turns unexpected errors into a plain 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { ...env, DB: { prepare: () => { throw new Error("boom"); } } as unknown as D1Database };
    const res = await worker.fetch(new Request("https://x/api/health"), broken);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong" });
  });

  it("reports a database that answers oddly as unhealthy", async () => {
    const odd = { ...env, DB: { prepare: () => ({ first: async () => null }) } as unknown as D1Database };
    const res = await worker.fetch(new Request("https://x/api/health"), odd);
    expect(await res.json()).toEqual({ ok: false });
  });
});

describe("matchPath", () => {
  it("captures segments and the rest", () => {
    expect(matchPath("/api/events/:id", "/api/events/abc")).toEqual(["abc"]);
    expect(matchPath("/api/x/:a/y/:b", "/api/x/1/y/a%40b")).toEqual(["1", "a@b"]);
    expect(matchPath("/api/photos/*", "/api/photos/events/1/2")).toEqual(["events/1/2"]);
  });

  it("rejects mismatches, extra or missing segments and empty captures", () => {
    expect(matchPath("/api/events/:id", "/api/events")).toBeNull();
    expect(matchPath("/api/events/:id", "/api/events/")).toBeNull();
    expect(matchPath("/api/events/:id", "/api/events/a/b")).toBeNull();
    expect(matchPath("/api/events", "/api/other")).toBeNull();
    expect(matchPath("/api/photos/*", "/api/photos/")).toBeNull();
  });
});
