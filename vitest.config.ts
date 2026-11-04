import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  return {
    test: {
      projects: [
        {
          // The API, run inside the Workers runtime against local D1 and R2.
          plugins: [
            cloudflareTest({
              wrangler: { configPath: "./wrangler.jsonc" },
              miniflare: {
                // Dev-mode values, so tests never depend on the production vars.
                bindings: {
                  TEST_MIGRATIONS: migrations,
                  EMAIL_MODE: "log",
                  APP_ORIGIN: "http://localhost:8787",
                  TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
                  TURNSTILE_SECRET: "test-secret",
                  IP_HASH_KEY: "test-ip-hash-key",
                },
              },
            }),
          ],
          test: {
            name: "worker",
            include: ["test/worker/**/*.test.ts", "test/shared/**/*.test.ts"],
            setupFiles: ["./test/apply-migrations.ts"],
          },
        },
        {
          // The browser app, in jsdom with the API faked.
          test: {
            name: "client",
            environment: "jsdom",
            include: ["test/client/**/*.test.ts"],
          },
        },
      ],
      coverage: {
        // The Workers runtime has no V8 coverage hook, so istanbul instruments instead.
        provider: "istanbul" as const,
        include: ["src/**/*.ts"],
        // 100% is the bar (spec, engineering requirements). Anything excluded
        // must say why inline with an istanbul ignore comment.
        thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
        reporter: ["text", "html", "lcov"],
      },
    },
  };
});
