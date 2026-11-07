// Writes public/third-party-notices.txt (SW-89): the licence text of every
// production dependency, taken from the lockfile's non-dev packages. MIT, ISC
// and BSD require their notice to travel with copies, and esbuild's minified
// bundle (public/app.js) carries none. Run by `npm run build`; fails if a
// production package has no licence file, so a new dependency can't ship bare.
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));

const LICENCE_FILE = /^(licen[sc]e|copying)(\.|$|-)/i;
const sections = [];
const missing = [];
for (const [dir, pkg] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!dir || pkg.dev || pkg.devOptional) continue;
  const name = dir.slice(dir.lastIndexOf("node_modules/") + "node_modules/".length);
  const full = path.join(root, dir);
  const file = fs.existsSync(full) && fs.readdirSync(full).find((f) => LICENCE_FILE.test(f));
  if (!file) {
    missing.push(`${name}@${pkg.version}`);
    continue;
  }
  const text = fs.readFileSync(path.join(full, file), "utf8").trim();
  sections.push(`${name}@${pkg.version} (${pkg.license ?? "unknown licence"})\n${"-".repeat(60)}\n${text}`);
}

if (missing.length) {
  console.error(`No licence file for: ${missing.join(", ")}. Run npm ci, or add the notice by hand.`);
  process.exit(1);
}
const header = "Third-party software in Cookoff Champs\n\nCookoff Champs' own code is MIT licensed. The packages below are included in\nthe site, each under its own licence, reproduced here as those licences require.\n";
fs.writeFileSync(path.join(root, "public", "third-party-notices.txt"), `${header}\n${sections.join("\n\n\n")}\n`);
console.log(`third-party notices written: ${sections.length} packages`);
