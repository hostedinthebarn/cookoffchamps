// Prints each printable page (SW-62) to a letter-size PDF beside it, e.g.
// public/printables/pie-contest-ballot/ → public/printables/pie-contest-ballot.pdf.
// Run by `npm run build` after build-help.mjs has written the pages. The PDF is
// the page's own print layout, so the page and the PDF never drift apart.
// public/ is served to a headless Chromium from disk; nothing goes over the network.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const pub = path.join(import.meta.dirname, "..", "public");
const ORIGIN = "http://printables.invalid";
const TYPES = { ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

function sheetDirs(dir) {
  // A sheet is a folder with an index.html under a printables folder, one level down.
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "index.html")))
    .map((e) => path.join(dir, e.name));
}

const roots = [path.join(pub, "printables"), path.join(pub, "es", "imprimibles")];
const sheets = roots.flatMap(sheetDirs);
if (sheets.length === 0) throw new Error("no printable pages found: run build-help.mjs first");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.route(`${ORIGIN}/**`, (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname);
    let file = path.join(pub, rel);
    if (file !== pub && !file.startsWith(pub + path.sep)) return route.abort();
    if (rel.endsWith("/")) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return route.fulfill({ status: 404 });
    return route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] ?? "application/octet-stream" });
  });
  await page.route((url) => url.origin !== ORIGIN, (route) => route.abort());
  for (const dir of sheets) {
    const rel = `/${path.relative(pub, dir).split(path.sep).join("/")}/`;
    await page.goto(`${ORIGIN}${rel}`, { waitUntil: "load" });
    const out = `${dir}.pdf`;
    // The page's @page rule sets letter size and margins.
    await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
    // Each sheet section is one printed page: an overflow would add a blank or split page.
    const pages = (fs.readFileSync(out).toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    const expected = await page.locator("section.sheet").count();
    if (pages !== expected) throw new Error(`${path.relative(pub, out)} has ${pages} pages, expected ${expected}`);
    console.log(`printed ${path.relative(pub, out)}`);
  }
} finally {
  await browser.close();
}
