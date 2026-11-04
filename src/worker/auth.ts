// Organizer login by magic link (spec decisions 2 and 3). Tokens and session
// ids are random; only their SHA-256 hashes are stored, so a database leak does
// not hand out working logins.

import { cookie, readCookie } from "./cookies";
import { sendEmail } from "./email";
import type { Env } from "./env";
import { HttpError, json, readJson, requireEmail } from "./http";
import { langOf, loginEmail, type LoginEmailText } from "./i18n";
import { newId } from "./ids";

// __Host- makes the browser insist on Secure, Path=/ and no Domain, so neither a
// subdomain nor a plain-http page can plant or overwrite the session cookie.
export const SESSION_COOKIE = "__Host-cc_session";
const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_S = 30 * 24 * 60 * 60;

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * A client IP as HMAC-SHA-256 under the IP_HASH_KEY secret, hex. A bare SHA-256 of
 * an IP can be reversed by trying all 4.3 billion IPv4 addresses; without the key
 * this can't. A missing or empty key makes importKey throw, so a deploy without
 * the secret fails loudly instead of quietly storing weak hashes.
 */
export async function hashIp(env: Env, ip: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.IP_HASH_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Only same-site paths, so a crafted link can't bounce a login off-site.
 * Browsers read "/\evil.example" as "//evil.example" and drop tabs and
 * newlines, so backslashes and control characters are refused outright.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) return "/";
  return next;
}

// Login emails cost money and reputation: Resend's free plan sends 100 a day,
// and a link is an email to an address someone typed. These caps stop one
// address being flooded and one client draining the quota.
export const MAX_LINKS_PER_EMAIL_PER_HOUR = 5;
export const MAX_LINKS_PER_IP_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;
const PURGE_AFTER_MS = 24 * HOUR_MS;

/** The requesting client's IP, as Cloudflare reports it; null outside Cloudflare. */
export function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip");
}

/** Throws 429 if `email` or `ip` has had too many login links in the last hour. */
async function checkLinkQuota(env: Env, email: string, ipHash: string | null): Promise<void> {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const row = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM login_tokens WHERE email = ? AND created_at > ?) AS byEmail,
            (SELECT COUNT(*) FROM login_tokens WHERE ip_hash = ? AND created_at > ?) AS byIp`,
  )
    .bind(email, since, ipHash, since)
    .first<{ byEmail: number; byIp: number }>();
  if (row!.byEmail >= MAX_LINKS_PER_EMAIL_PER_HOUR || row!.byIp >= MAX_LINKS_PER_IP_PER_HOUR) {
    throw new HttpError(429, "Too many login links have been sent. Please wait a while and try again.", "tooManyLinks");
  }
}

/** Drops spent login tokens and expired sessions, so neither table grows forever. */
async function purgeExpired(env: Env): Promise<void> {
  const now = new Date();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM login_tokens WHERE expires_at < ?").bind(new Date(now.getTime() - PURGE_AFTER_MS).toISOString()),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now.toISOString()),
  ]);
}

/** Emails a single-use login link that lands on `next` once signed in; 429 past the rate limits. */
export async function sendLoginLink(
  env: Env,
  request: Request,
  email: string,
  next: string,
  text: LoginEmailText,
): Promise<void> {
  const ip = clientIp(request);
  const ipHash = ip ? await hashIp(env, ip) : null;
  await purgeExpired(env);
  await checkLinkQuota(env, email, ipHash);
  const token = newId() + newId();
  await env.DB.prepare("INSERT INTO login_tokens (token_hash, email, expires_at, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256(token), email, new Date(Date.now() + LINK_TTL_MS).toISOString(), new Date().toISOString(), ipHash)
    .run();
  const link = `${env.APP_ORIGIN}/api/auth/verify?token=${token}&next=${encodeURIComponent(safeNext(next))}`;
  await sendEmail(env, {
    to: email,
    subject: text.subject,
    text: `${text.intro}\n\n${link}\n\n${text.footer}`,
  });
}

/**
 * POST /api/auth/login {email, next?, lang?}. 200 for any valid address, so it can't be
 * used to probe for accounts (anyone can log in; there are no accounts to find).
 */
export async function requestLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const email = requireEmail(body.email);
  await sendLoginLink(env, request, email, safeNext(typeof body.next === "string" ? body.next : null), loginEmail(langOf(body.lang)));
  return json({ ok: true });
}

/** GET /api/auth/verify?token=…&next=… — trades the link for a session cookie. */
export async function verifyLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const hash = await sha256(token);
  const now = new Date().toISOString();

  // Claim the token in one statement, so a link can't be used twice even by two
  // requests racing each other.
  const row = await env.DB.prepare(
    "UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING email",
  )
    .bind(now, hash, now)
    .first<{ email: string }>();

  if (!row) {
    return new Response(null, { status: 302, headers: { location: "/?login=expired" } });
  }

  const sessionId = newId() + newId();
  await env.DB.prepare("INSERT INTO sessions (id_hash, email, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(sessionId), row.email, new Date(Date.now() + SESSION_TTL_S * 1000).toISOString())
    .run();

  return new Response(null, {
    status: 302,
    headers: {
      location: safeNext(url.searchParams.get("next")),
      "set-cookie": cookie(SESSION_COOKIE, sessionId, SESSION_TTL_S),
    },
  });
}

/** The signed-in organizer's email, or null. */
export async function sessionEmail(request: Request, env: Env): Promise<string | null> {
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;
  const row = await env.DB.prepare("SELECT email FROM sessions WHERE id_hash = ? AND expires_at > ?")
    .bind(await sha256(sessionId), new Date().toISOString())
    .first<{ email: string }>();
  return row?.email ?? null;
}

export async function requireSession(request: Request, env: Env): Promise<string> {
  const email = await sessionEmail(request, env);
  if (!email) throw new HttpError(401, "Please log in", "loginRequired");
  return email;
}

/** POST /api/auth/logout */
export async function logout(request: Request, env: Env): Promise<Response> {
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (sessionId) {
    await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(await sha256(sessionId)).run();
  }
  return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", 0) });
}

/** GET /api/me */
export async function me(request: Request, env: Env): Promise<Response> {
  return json({ email: await requireSession(request, env) });
}
