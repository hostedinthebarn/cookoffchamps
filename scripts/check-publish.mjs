// The deploy gate (Gary's deploy rules 1 and 2). Wrangler uploads everything in
// public/, so before it does:
//   1. every file must have an allowed web extension: an allowlist, never a
//      denylist, so a stray .md, .env or key file fails closed;
//   2. nothing may match a secret pattern.
// Any problem prints and exits non-zero, which stops `npm run deploy`.
// Adding a new file type here is a deliberate change, reviewed like code.
import fs from "node:fs";
import path from "node:path";

const pub = path.join(import.meta.dirname, "..", "public");

export const ALLOWED = new Set([".html", ".css", ".js", ".map", ".svg", ".png", ".webmanifest", ".xml", ".txt", ".pdf"]);
// .txt covers robots.txt and, deliberately, third-party-notices.txt (SW-89).
// .pdf added for the printables (SW-62); they are printed at build time from our own pages.

export const SECRET_PATTERNS = [
  /client_secret/i,
  /GOCSPX-/,
  /api[_-]?key\s*[:=]/i,
  /BEGIN [A-Z ]*PRIVATE KEY/,
  /refresh_token/i,
  /AKIA[0-9A-Z]{16}/,
  /Bearer [A-Za-z0-9._-]{20,}/,
  /password\s*[:=]\s*\S/i,
  /token=[A-Za-z0-9._-]{12,}/,
  /\bre_[A-Za-z0-9]{20,}/, // Resend API keys
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

const problems = [];
const files = walk(pub);
for (const file of files) {
  const rel = path.relative(pub, file);
  if (path.basename(file).startsWith(".")) problems.push(`hidden file: ${rel}`);
  if (!ALLOWED.has(path.extname(file).toLowerCase())) problems.push(`file type not on the allowlist: ${rel}`);
  const text = fs.readFileSync(file, "latin1");
  for (const pattern of SECRET_PATTERNS) if (pattern.test(text)) problems.push(`looks like a secret (${pattern}): ${rel}`);
}

if (problems.length) {
  console.error(`Not deploying. public/ has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`public/ ok: ${files.length} files, all allowed types, no secret patterns`);
