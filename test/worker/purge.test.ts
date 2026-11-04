import { env } from "cloudflare:workers";
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../../src/worker/index";
import { purgeIpHashes } from "../../src/worker/purge";

const NOW = new Date("2026-11-04T12:00:00Z");
let base = NOW;
const ago = (minutes: number) => new Date(base.getTime() - minutes * 60_000).toISOString();

async function seed(at = NOW) {
  base = at;
  await env.DB.exec("DELETE FROM login_tokens; DELETE FROM code_misses;");
  const token = (hash: string, createdMinutesAgo: number | null) =>
    env.DB.prepare("INSERT INTO login_tokens (token_hash, email, expires_at, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)")
      .bind(hash, `${hash}@example.com`, ago((createdMinutesAgo ?? 2000) - 15), createdMinutesAgo === null ? null : ago(createdMinutesAgo), "h")
      .run();
  await token("fresh", 5); // still usable
  await token("hour", 60); // spent, but needed for the per-hour limits
  await token("next-run", 23 * 60 + 45); // under a day even at the next run, 10 minutes on: stays
  await token("almost-a-day", 23 * 60 + 55); // the next run would be past a day: goes now
  await token("legacy", null); // from before created_at existed: goes on expires_at
  const miss = (minutesAgo: number) => env.DB.prepare("INSERT INTO code_misses (ip_hash, at) VALUES ('h', ?)").bind(ago(minutesAgo)).run();
  await miss(2);
  await miss(11);
}

const tokens = async () =>
  (await env.DB.prepare("SELECT token_hash FROM login_tokens ORDER BY token_hash").all<{ token_hash: string }>()).results.map((r) => r.token_hash);
const misses = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM code_misses").first<{ n: number }>())!.n;

describe("IP-hash purge (BIZ-38)", () => {
  it("keeps the privacy page's limits: no login row reaches a day, no code miss outlives 20 minutes", async () => {
    await seed();
    await purgeIpHashes(env, NOW);
    expect(await tokens()).toEqual(["fresh", "hour", "next-run"]);
    expect(await misses()).toBe(1);
  });

  it("runs from the cron trigger", async () => {
    await seed(new Date());
    const ctx = createExecutionContext();
    await worker.scheduled!(createScheduledController({ scheduledTime: Date.now(), cron: "*/10 * * * *" }), env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await tokens()).toEqual(["fresh", "hour", "next-run"]);
    expect(await misses()).toBe(1);
  });
});
