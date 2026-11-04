// Deadline-based cleanup of the scrambled IP addresses (BIZ-38, CodeRabbit on #7). The privacy
// page promises they're kept "a day at most", and the Q&A says 20 minutes at most for typed
// codes. The lazy cleanups in auth.ts and public.ts only run when another request comes in, so
// on a quiet site rows could outlive both. The cron trigger in wrangler.jsonc runs this every
// PURGE_EVERY_MS. It also clears the unkeyed SHA-256 hashes from before HMAC within a day of
// the deploy, so they need no migration.

import type { Env } from "./env";

const MINUTE_MS = 60 * 1000;
/** How often the cron trigger runs ("*\/10 * * * *" in wrangler.jsonc). */
export const PURGE_EVERY_MS = 10 * MINUTE_MS;
/** The privacy page's "a day at most" for login rows, which carry an IP hash. */
export const LOGIN_ROW_MAX_AGE_MS = 24 * 60 * MINUTE_MS;
/** Code misses only matter inside the 10-minute lookup window (public.ts). */
export const CODE_MISS_MAX_AGE_MS = 10 * MINUTE_MS;

/**
 * Deletes login tokens old enough that the next run would pass the one-day limit (a login link
 * is only valid for 15 minutes, so no usable token goes) and code misses past their window.
 */
export async function purgeIpHashes(env: Env, now = new Date()): Promise<void> {
  const loginCutoff = new Date(now.getTime() - (LOGIN_ROW_MAX_AGE_MS - PURGE_EVERY_MS)).toISOString();
  const codeCutoff = new Date(now.getTime() - CODE_MISS_MAX_AGE_MS).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM login_tokens WHERE created_at < ? OR expires_at < ?").bind(loginCutoff, loginCutoff),
    env.DB.prepare("DELETE FROM code_misses WHERE at < ?").bind(codeCutoff),
  ]);
}
