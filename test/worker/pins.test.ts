import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOARDS, readPin, renderFeed, type Pin } from "../../src/worker/pins";
import { call } from "./helpers";
import { pngBytes } from "./images";

const SITE = env.APP_ORIGIN;
const NOW = new Date("2026-11-30T16:00:00Z");

function pin(over: Partial<Pin> = {}): Pin {
  return {
    id: "2026-11-28-pin-10",
    board: "cookie",
    title: "Christmas cookie contest categories: 4 that work",
    description: "Best classic, best decorated, most creative & best chocolate.",
    link: `${SITE}/guides/christmas-cookie-contest/?ref=pin`,
    image: "2026-11-28-pin-10-cookie-categories.png",
    alt: "Four Christmas cookie contest categories.",
    publishAt: "2026-11-30T15:00:00Z",
    ...over,
  };
}

async function upload(pins: unknown) {
  await env.PINS.put("pins.json", typeof pins === "string" ? pins : JSON.stringify(pins));
}

beforeEach(async () => {
  await env.PINS.delete("pins.json");
});
afterEach(() => vi.restoreAllMocks());

describe("readPin", () => {
  it("accepts a well-formed pin", () => {
    expect(readPin(pin(), SITE)).toEqual(pin());
  });

  it.each([
    ["not an object", null],
    ["a string", "pin"],
    ["an unknown board", pin({ board: "cake" })],
    ["a board name inherited from Object", pin({ board: "toString" })],
    ["a missing id", { ...pin(), id: undefined }],
    ["a blank title", pin({ title: "  " })],
    ["a long description", pin({ description: "x".repeat(801) })],
    ["no alt text", pin({ alt: "" })],
    ["a link off this site", pin({ link: "https://example.org/guides/" })],
    ["a lookalike domain", pin({ link: `${SITE}.evil.example/` })],
    ["an image in a folder", pin({ image: "../pins.json" })],
    ["an image that isn't png or jpg", pin({ image: "pin.svg" })],
    ["a date that doesn't parse", pin({ publishAt: "next Monday" })],
  ])("refuses %s", (_why, raw) => {
    expect(readPin(raw, SITE)).toBeNull();
  });
});

describe("renderFeed", () => {
  it("lists only the board's due pins, oldest first, escaped", () => {
    const pins = [
      pin({ id: "later", publishAt: "2026-11-30T15:30:00Z" }),
      pin({ id: "first", publishAt: "2026-11-29T15:00:00Z" }),
      pin({ id: "future", publishAt: "2026-12-02T15:00:00Z" }),
      pin({ id: "pie", board: "pie" }),
    ];
    const out = renderFeed("cookie", pins, SITE, NOW);
    expect(out).toContain('<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">');
    expect(out).toContain("<title>Cookoff Champs: Cookie exchange voting</title>");
    expect(out.indexOf(">first<")).toBeLessThan(out.indexOf(">later<"));
    expect(out).not.toContain("future");
    expect(out).not.toContain(">pie<");
    expect(out).toContain("most creative &amp; best chocolate");
    expect(out).toContain(`<media:content url="${SITE}/pins/img/2026-11-28-pin-10-cookie-categories.png" type="image/png" medium="image">`);
    expect(out).toContain("<pubDate>Sun, 29 Nov 2026 15:00:00 GMT</pubDate>");
  });

  it("gives jpg images the jpeg type, and an empty channel when nothing is due", () => {
    expect(renderFeed("pie", [pin({ board: "pie", image: "a.jpg" })], SITE, NOW)).toContain('type="image/jpeg"');
    const empty = renderFeed("chili", [], SITE, NOW);
    expect(empty).toContain("<title>Cookoff Champs: Chili cook-off ideas</title>");
    expect(empty).not.toContain("<item>");
  });
});

describe("GET /pins/", () => {
  it("serves each board's feed as RSS, empty until pins are uploaded", async () => {
    for (const board of Object.keys(BOARDS)) {
      const res = await call(`/pins/${board}.xml`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
      expect(res.headers.get("cache-control")).toBe("public, max-age=900");
      expect(await res.text()).not.toContain("<item>");
    }
  });

  it("shows uploaded pins once due and skips invalid ones", async () => {
    await upload({ pins: [pin({ publishAt: "2020-01-01T00:00:00Z" }), pin({ id: "bad", link: "https://example.org/" }), "junk"] });
    const body = await (await call("/pins/cookie.xml")).text();
    expect(body).toContain("<guid isPermaLink=\"false\">2026-11-28-pin-10</guid>");
    expect(body).not.toContain(">bad<");
  });

  it("treats broken or oddly shaped pins.json as no pins", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await upload("{not json");
    expect(await (await call("/pins/cookie.xml")).text()).not.toContain("<item>");
    expect(logged).toHaveBeenCalled();
    for (const shape of ["null", '{"pins": "x"}', "[]"]) {
      await upload(shape);
      expect(await (await call("/pins/cookie.xml")).text()).not.toContain("<item>");
    }
  });

  it("answers HEAD without a body and refuses other methods", async () => {
    const head = await call("/pins/pie.xml", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect((await call("/pins/pie.xml", { method: "POST" })).status).toBe(405);
  });

  it("404s an unknown board, including names Object inherits", async () => {
    expect((await call("/pins/cake.xml")).status).toBe(404);
    expect((await call("/pins/constructor.xml")).status).toBe(404);
  });

  it("serves uploaded images, and 404s missing or badly named ones", async () => {
    await env.PINS.put("img/pin-10.png", pngBytes());
    const res = await call("/pins/img/pin-10.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(pngBytes());
    const head = await call("/pins/img/pin-10.png", { method: "HEAD" });
    expect(await head.text()).toBe("");
    expect((await call("/pins/img/missing.png")).status).toBe(404);
    expect((await call("/pins/img/PIN.PNG")).status).toBe(404);
    expect((await call("/pins/img/%2e%2e%2fpins.json")).status).toBe(404);
  });

  it("never serves pins.json itself, and leaves other /pins/ paths to the site", async () => {
    await upload({ pins: [pin()] });
    const res = await call("/pins/pins.json");
    expect(await res.text()).not.toContain("2026-11-28-pin-10");
    expect((await call("/pins/")).status).toBe(200); // the app shell, like any unknown page
  });
});
