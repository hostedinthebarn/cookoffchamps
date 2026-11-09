import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// SW-102: Search Console reported "Duplicate without user-selected canonical". The app shell is served for every
// app route and unknown path, so it must name the home page as its canonical, or Google picks one for us.
describe("the app shell", () => {
  const shell = readFileSync("public/index.html", "utf8");

  it("names the home page as its one canonical URL", () => {
    const canonicals = shell.match(/<link rel="canonical"[^>]*>/g) ?? [];
    expect(canonicals).toEqual(['<link rel="canonical" href="https://cookoffchamps.com/" />']);
  });
});
