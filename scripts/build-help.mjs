// Also writes the printables (SW-62) and the holiday guides (SW-63).
// Writes the public help pages (SW-24) into public/ at build time:
//   public/help/index.html (English), public/es/ayuda/index.html (Spanish, SW-27),
//   public/help/filter.js, public/sitemap.xml, public/robots.txt
// The words come from src/help/content.ts and the HTML from src/help/render.ts;
// esbuild bundles them so plain Node can run them. Run by `npm run build`.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.join(import.meta.dirname, "..");
const pub = path.join(root, "public");
const tmp = path.join(root, ".wrangler", "help-build.mjs");

await build({
  stdin: {
    contents: [
      `export { helpPage, sitemap, robots } from "./src/help/render.ts";`,
      `export { en } from "./src/help/content.ts"; export { es } from "./src/help/content-es.ts";`,
      `export { sheetPage, indexPage, printablePaths, pdfPath, qrTarget } from "./src/printables/render.ts";`,
      `export { en as printEn } from "./src/printables/content.ts"; export { es as printEs } from "./src/printables/content-es.ts";`,
      `export { guidePage, guidePaths } from "./src/guides/render.ts";`,
      `export { en as guidesEn } from "./src/guides/content.ts"; export { es as guidesEs } from "./src/guides/content-es.ts";`,
      `export { qrSvg } from "./src/client/qr.ts";`,
      `export { privacyPage } from "./src/privacy/render.ts";`,
      `export { en as privacyEn, es as privacyEs } from "./src/privacy/content.ts";`,
    ].join("\n"),
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  // qrcode is CommonJS with Node built-ins; Node loads it from node_modules.
  external: ["qrcode"],
  outfile: tmp,
  logLevel: "warning",
});
const { helpPage, sitemap, robots, en, es, sheetPage, indexPage, printablePaths, printEn, printEs, guidePage, guidePaths, guidesEn, guidesEs, qrSvg, qrTarget, privacyPage, privacyEn, privacyEs } = await import(`${pathToFileURL(tmp).href}?t=${Date.now()}`);

const versions = [en, es]; // English first: it's the x-default for search engines
for (const content of versions) {
  const dir = path.join(pub, ...content.path.split("/").filter(Boolean));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), helpPage(content, versions));
}
// The printables (SW-62): an index and a page per sheet, in each language. The
// PDFs are printed from these pages afterwards by scripts/build-printables.mjs.
const printVersions = [printEn, printEs];
const write = (p, html) => {
  const dir = path.join(pub, ...p.split("/").filter(Boolean));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
};
for (const content of printVersions) {
  write(content.path, indexPage(content, printVersions));
  for (const sheet of content.sheets) {
    write(sheet.path, sheetPage(content, printVersions, sheet.id, await qrSvg(qrTarget(sheet, content))));
  }
}

// The holiday guides (SW-63): a page per search intent, in each language.
const guideVersions = [guidesEn, guidesEs];
for (const content of guideVersions) {
  for (const guide of content.guides) write(guide.path, guidePage(content, guideVersions, printVersions, guide.id));
}

// The privacy page (BIZ-38). /privacy/ and /es/privacidad/ are already in the sitemap (PUBLIC_PATHS).
const privacyVersions = [privacyEn, privacyEs];
for (const content of privacyVersions) write(content.path, privacyPage(content, privacyVersions));

fs.writeFileSync(path.join(pub, "sitemap.xml"), sitemap([...printablePaths(printVersions), ...guidePaths(guideVersions)]));
fs.writeFileSync(path.join(pub, "robots.txt"), robots());

await build({
  entryPoints: [path.join(root, "src/help/filter-main.ts")],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  outfile: path.join(pub, "help", "filter.js"),
  logLevel: "warning",
});
console.log("help, printables and guides pages written");
