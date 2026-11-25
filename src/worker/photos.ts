import type { Env } from "./env";
import { HttpError } from "./http";
import { stripMetadata } from "./strip";

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * The image type from the file's first bytes, or null if it isn't a JPEG, PNG or
 * WebP. The declared type is whatever the uploader said, so it isn't trusted.
 */
export function sniffImageType(head: Uint8Array): string | null {
  const starts = (sig: number[], at = 0) => sig.every((b, i) => head[at + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp"; // RIFF....WEBP
  return null;
}

/**
 * Checks an uploaded photo and returns its real type. The phone shrinks photos
 * before upload (decision 10), so anything near the limit means the resize was
 * skipped.
 */
export async function checkPhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) throw new HttpError(415, "Photos must be JPEG, PNG or WebP", "photoType");
  if (file.size > MAX_PHOTO_BYTES) throw new HttpError(413, "That photo is too large", "photoTooLarge");
  const type = sniffImageType(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!type) throw new HttpError(415, "Photos must be JPEG, PNG or WebP", "photoType");
  return type;
}

/**
 * Stores a photo under a new key each time, so a replaced photo gets a new URL
 * and the year-long cache on the old one can never serve stale. `type` is the
 * sniffed type from checkPhoto, not the uploader's claim. Location and other
 * hidden metadata are stripped first (SW-28).
 */
export async function putPhoto(env: Env, eventId: string, entryId: string, file: File, type: string): Promise<string> {
  const clean = stripMetadata(new Uint8Array(await file.arrayBuffer()), type);
  const key = `events/${eventId}/${entryId}-${crypto.randomUUID()}`;
  await env.PHOTOS.put(key, clean, { httpMetadata: { contentType: type } });
  return key;
}

/**
 * GET /api/photos/<key> — public, like the event page itself.
 *
 * Served from the edge cache when it can be, so a room full of phones loading the
 * same dishes costs one R2 read per photo per data center, not one per phone. Keys
 * never repeat, so a cached copy can't go stale; a deleted photo may linger at the
 * edge, but only under a URL nothing links to any more.
 */
export async function getPhoto(env: Env, key: string, request: Request): Promise<Response> {
  if (!key.startsWith("events/")) throw new HttpError(404, "Not found");
  // Cache on the path alone: a made-up query string must not turn every request
  // into an R2 read.
  const url = new URL(request.url);
  const cacheKey = new Request(url.origin + url.pathname);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const object = await env.PHOTOS.get(key);
  if (!object) throw new HttpError(404, "Not found");
  const response = new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      // Even opened directly, a photo can never run as a page.
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
  await cache.put(cacheKey, response.clone());
  return response;
}

export async function deletePhotoPrefix(env: Env, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor });
    if (page.objects.length) await env.PHOTOS.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
