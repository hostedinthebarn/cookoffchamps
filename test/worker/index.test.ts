import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { matchPath } from "../../src/worker/index";
import { call } from "./helpers";

afterEach(() => vi.restoreAllMocks());

const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

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

  it("counts page visits from ref links, per source and day (SW-59, BIZ-60)", async () => {
    const hits = () =>
      env.DB.prepare("SELECT ref, hits FROM ref_counts ORDER BY ref").all<{ ref: string; hits: number }>().then((r) => r.results);
    const visit = (path: string, init: RequestInit = {}) =>
      call(path, { ...init, headers: { "user-agent": BROWSER, ...(init.headers as Record<string, string>) } });
    expect((await visit("/?ref=results")).status).toBe(200);
    await visit("/?ref=results");
    await visit("/?ref=reveal");
    await visit("/?ref=chili&lang=es"); // a printable's QR code (SW-62)
    await visit("/?ref=guide-pie"); // a guide's closing link (SW-63)
    for (const ref of ["fb", "ig", "yt", "pin"]) await visit(`/?ref=${ref}`); // social posts (BIZ-57)
    // Pins open the printables and guides, so static pages count too (BIZ-60).
    await visit("/printables/pie-contest-ballot/?ref=pin");
    await visit("/es/imprimibles/boleta-concurso-de-pays/?ref=pin");
    await visit("/guides/thanksgiving-pie-contest/?ref=pin");
    // Links from our blog posts (BLOG-35).
    await visit("/guides/thanksgiving-pie-contest/?ref=blog");
    // Unknown refs, files that aren't pages and other methods aren't counted.
    await visit("/?ref=spam");
    await visit("/app.js?ref=fb");
    await visit("/printables/pie-contest-ballot.pdf?ref=pin");
    await visit("/?ref=reveal", { method: "HEAD" });
    // Nor are link previews, crawlers, scripts, or requests with no User-Agent (BIZ-60).
    for (const agent of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "meta-externalagent/1.1",
      "Mozilla/5.0 (compatible; Pinterestbot/1.0; +http://www.pinterest.com/bot.html)",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Twitterbot/1.0",
      "WhatsApp/2.23.20.0 A",
      "TelegramBot (like TwitterBot)",
      "curl/8.7.1",
    ]) {
      await visit("/?ref=fb", { headers: { "user-agent": agent } });
    }
    await call("/?ref=fb");
    // A phone whose model name ends in "bot" is still a person.
    await visit("/?ref=ig", { headers: { "user-agent": "Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" } });
    // A browser that mentions WhatsApp later on is a person opening the link, so it counts.
    await visit("/?ref=yt", { headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 WhatsApp/2.24.1" } });
    expect(await hits()).toEqual([
      { ref: "blog", hits: 1 },
      { ref: "chili", hits: 1 },
      { ref: "fb", hits: 1 },
      { ref: "guide-pie", hits: 1 },
      { ref: "ig", hits: 2 },
      { ref: "pin", hits: 4 },
      { ref: "results", hits: 2 },
      { ref: "reveal", hits: 1 },
      { ref: "yt", hits: 2 },
    ]);
  });

  it("still serves the page if the ref can't be counted", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await env.DB.exec("ALTER TABLE ref_counts RENAME TO ref_counts_gone");
    try {
      expect((await call("/?ref=results", { headers: { "user-agent": BROWSER } })).status).toBe(200);
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
