import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against `wrangler dev` with local D1 and R2. Turnstile uses
// Cloudflare's published always-pass test keys (.dev.vars.example), so the vote
// check still makes a real round trip.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // Agent containers set CI and cap processes; they set PW_WORKERS=1 so Chrome
  // doesn't start a worker per core and hit the cap (GEN-240). Unset elsewhere.
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : undefined,
  use: { baseURL: "http://localhost:8787", trace: "retain-on-failure" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npm run build && wrangler d1 migrations apply cookoffchamps --local && wrangler dev --port 8787",
    url: "http://localhost:8787/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
