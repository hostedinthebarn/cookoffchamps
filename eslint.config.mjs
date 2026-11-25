// ESLint flat config. `npm run lint` runs this after the typecheck, and the Guards workflow's Lint job runs `npm run lint`.
// Rules: ESLint's and typescript-eslint's recommended sets (no type-aware rules yet: they need both tsconfigs and are slower).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["public/**", "coverage/**", "test-results/**", "playwright-report/**", "node_modules/**", ".wrangler/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `_name` marks an argument or binding as deliberately unused.
      // A destructuring with one binding reassigned later stays `let` (judging.test.ts).
      "prefer-const": ["error", { destructuring: "all" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  { files: ["src/client/**/*.ts"], languageOptions: { globals: globals.browser } },
  { files: ["scripts/**/*.mjs", "*.config.{ts,mjs}"], languageOptions: { globals: globals.node } },
  { files: ["e2e/**/*.ts", "test/**/*.ts"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);
