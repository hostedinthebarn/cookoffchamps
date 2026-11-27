import type { Env } from "./env";

/**
 * Pinterest pin feeds (SW-122): one RSS 2.0 feed per board, which Pinterest's auto-publish reads, so the
 * week's approved pins post themselves on their dates without Gary.
 *
 * The pins live in their own R2 bucket (PINS), not in the repo: approving a social batch on the brain box
 * uploads that week's pins and images, so there is no deploy per week. `pins.json` holds every pin ever
 * uploaded; a feed shows only the ones whose `publishAt` has passed, so a batch can be uploaded days early.
 * The bucket starts empty, so connecting a feed never re-pins the ones Gary posted by hand.
 *
 * Pinterest's rules (help page, read 2026-11-12): RSS 2.0, one board per feed, every link on the claimed
 * domain, the image in <media:content>, oldest items first, up to 200 a day, and an item it has already
 * seen is not posted again (so a published pin must never be edited; the uploader refuses that).
 */

/** Feed name in the URL → the Pinterest board it is connected to (accounts.md). */
export const BOARDS: Record<string, string> = {
  pie: "Pie contest printables",
  cookie: "Cookie exchange voting",
  chili: "Chili cook-off ideas",
};

export interface Pin {
  id: string;
  board: string;
  title: string;
  description: string;
  link: string;
  image: string;
  alt: string;
  publishAt: string;
}

/** Image names the uploader writes: lowercase, dashes, .png or .jpg, no folders. */
const IMAGE_NAME = /^[a-z0-9][a-z0-9-]{0,120}\.(png|jpg)$/;
const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg" };
const FEED_CACHE = "public, max-age=900";
const IMAGE_CACHE = "public, max-age=86400";

function xml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim() !== "" && v.length <= max;

/**
 * A pin from pins.json, or null when anything is off: an unknown board, a link that isn't on this site
 * (Pinterest drops those, and it would be a way to point our pins elsewhere), a bad image name or date.
 */
export function readPin(raw: unknown, origin: string): Pin | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (!text(p.id, 100) || !text(p.board, 20) || !Object.hasOwn(BOARDS, p.board)) return null;
  if (!text(p.title, 100) || !text(p.description, 800) || !text(p.alt, 500)) return null;
  if (!text(p.link, 500) || !p.link.startsWith(`${origin}/`)) return null;
  if (!text(p.image, 130) || !IMAGE_NAME.test(p.image)) return null;
  if (!text(p.publishAt, 40) || Number.isNaN(Date.parse(p.publishAt))) return null;
  return { id: p.id, board: p.board, title: p.title, description: p.description, link: p.link, image: p.image, alt: p.alt, publishAt: p.publishAt };
}

/** Every valid pin in the bucket. A missing or broken pins.json is an empty list, never an error page. */
export async function loadPins(env: Env): Promise<Pin[]> {
  const obj = await env.PINS.get("pins.json");
  if (!obj) return [];
  let data: unknown;
  try {
    data = JSON.parse(await obj.text());
  } catch (err) {
    console.error("pins.json is not JSON", err);
    return [];
  }
  const list = (data as { pins?: unknown } | null)?.pins;
  if (!Array.isArray(list)) return [];
  return list.map((p) => readPin(p, env.APP_ORIGIN)).filter((p): p is Pin => p !== null);
}

/** The board's feed: pins already due, oldest first, as Pinterest reads them. */
export function renderFeed(board: string, pins: Pin[], origin: string, now: Date): string {
  const due = pins
    .filter((p) => p.board === board && Date.parse(p.publishAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt));
  const items = due.map((p) => {
    const type = IMAGE_TYPES[p.image.split(".").pop()!]!;
    return `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(p.link)}</link>
      <description>${xml(p.description)}</description>
      <guid isPermaLink="false">${xml(p.id)}</guid>
      <pubDate>${new Date(p.publishAt).toUTCString()}</pubDate>
      <media:content url="${xml(`${origin}/pins/img/${p.image}`)}" type="${type}" medium="image">
        <media:description type="plain">${xml(p.alt)}</media:description>
      </media:content>
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xml(`Cookoff Champs: ${BOARDS[board]!}`)}</title>
    <link>${xml(`${origin}/`)}</link>
    <description>${xml(`Pins for the ${BOARDS[board]!} board.`)}</description>
${items.join("\n")}
  </channel>
</rss>
`;
}

/** GET /pins/<board>.xml and /pins/img/<name>; null for any other path, which falls through to the site. */
export async function servePins(request: Request, env: Env, path: string): Promise<Response | null> {
  const feed = /^\/pins\/([a-z]+)\.xml$/.exec(path);
  const image = /^\/pins\/img\/([^/]+)$/.exec(path);
  if (!feed && !image) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  if (feed) {
    const board = feed[1]!;
    if (!Object.hasOwn(BOARDS, board)) return new Response("Not found", { status: 404 });
    const body = renderFeed(board, await loadPins(env), env.APP_ORIGIN, new Date());
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": FEED_CACHE },
    });
  }
  const name = image![1]!;
  if (!IMAGE_NAME.test(name)) return new Response("Not found", { status: 404 });
  const obj = await env.PINS.get(`img/${name}`);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(request.method === "HEAD" ? null : obj.body, {
    headers: { "content-type": IMAGE_TYPES[name.split(".").pop()!]!, "cache-control": IMAGE_CACHE },
  });
}
