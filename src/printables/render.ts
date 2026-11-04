import { escapeHtml, ORIGIN } from "../help/render";
import { privacyFooterLink } from "../privacy/render";
import type { Part, PrintablesContent, Sheet } from "./content";

// The printables (SW-62) are plain HTML written at build time, like the help
// pages, so search engines can read them. Each sheet's page shows the printed
// pages on screen and prints as just those pages; the PDF is made from the same
// HTML (scripts/build-printables.mjs), so the two can't drift apart.

/** Ballot slips per printed page: two across, three down. */
export const SLIPS_PER_PAGE = 6;
/** Rows on a score sheet and on a tally sheet. */
export const SCORE_ROWS = 12;
export const TALLY_ROWS = 15;

/** The PDF sits beside the page: /printables/pie-contest-ballot/ → /printables/pie-contest-ballot.pdf */
export function pdfPath(sheet: Sheet): string {
  return `${sheet.path.replace(/\/$/, "")}.pdf`;
}

/** What the QR code on the paper opens: the app, tagged so the Worker counts it, in the sheet's language. */
export function qrTarget(sheet: Sheet, content: PrintablesContent): string {
  return `${ORIGIN}/?ref=${sheet.ref}${content.lang === "en" ? "" : `&lang=${content.lang}`}`;
}

function blanks(n: number, cells: number): string {
  const row = `<tr>${"<td></td>".repeat(cells)}</tr>`;
  return row.repeat(n);
}

function part(p: Part, foot: string): string {
  const h = `<h2 class="sheet-title">${escapeHtml(p.heading)}</h2>`;
  if (p.kind === "slips") {
    const slip = `<div class="slip"><p class="slip-title">${escapeHtml(p.heading)}</p>${p.lines
      .map((l) => `<p class="slip-line"><span>${escapeHtml(l)}</span><span class="blank">#</span></p>`)
      .join("")}<p class="slip-url">cookoffchamps.com</p></div>`;
    return `<section class="sheet slips">${slip.repeat(SLIPS_PER_PAGE)}${foot}</section>`;
  }
  if (p.kind === "scores") {
    const head = [p.entry, ...p.criteria, p.total].map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join("");
    return `<section class="sheet">${h}
<p class="sheet-line"><span>${escapeHtml(p.judge)}</span><span class="blank"></span></p>
<p class="sheet-note">${escapeHtml(p.scale)}</p>
<table class="sheet-table"><thead><tr>${head}</tr></thead><tbody>${blanks(SCORE_ROWS, p.criteria.length + 2)}</tbody></table>${foot}</section>`;
  }
  const head = p.columns.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join("");
  return `<section class="sheet">${h}
<table class="sheet-table tally"><thead><tr>${head}</tr></thead><tbody>${blanks(TALLY_ROWS, p.columns.length)}</tbody></table>${foot}</section>`;
}

/** The foot of every printed page: the mark, the QR code and the way to the app. */
function sheetFoot(content: PrintablesContent, qrSvg: string): string {
  return `<footer class="sheet-foot"><div class="qr">${qrSvg}</div><p><img src="/favicon.svg" alt="" width="28" height="28" /> <strong>${escapeHtml(
    content.runItFree,
  )}</strong><br />${escapeHtml(content.skipThePaper)}</p></footer>`;
}

interface Shell {
  title: string;
  description: string;
  /** This page's path in each language, for hreflang and the language switch. */
  pathIn: (c: PrintablesContent) => string;
  main: string;
}

function page(content: PrintablesContent, versions: PrintablesContent[], s: Shell): string {
  const url = `${ORIGIN}${s.pathIn(content)}`;
  const alternates = versions
    .map((v) => `    <link rel="alternate" hreflang="${escapeHtml(v.lang)}" href="${ORIGIN}${escapeHtml(s.pathIn(v))}" />`)
    .concat(`    <link rel="alternate" hreflang="x-default" href="${ORIGIN}${escapeHtml(s.pathIn(versions[0]!))}" />`)
    .join("\n");
  const switches = versions
    .filter((v) => v.lang !== content.lang)
    .map(
      (v) =>
        `<a class="lang" href="${escapeHtml(s.pathIn(v))}" lang="${escapeHtml(v.lang)}" hreflang="${escapeHtml(v.lang)}">${escapeHtml(v.langName)}</a>`,
    )
    .join(" ");
  return `<!doctype html>
<html lang="${escapeHtml(content.lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(s.title)} · Cookoff Champs</title>
    <meta name="description" content="${escapeHtml(s.description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
${alternates}
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(s.title)} · Cookoff Champs" />
    <meta property="og:description" content="${escapeHtml(s.description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="theme-color" content="#fffaf3" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1a1310" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body class="help printables">
    <header class="masthead no-print">
      <a class="brand" href="${escapeHtml(content.appHref)}"><img src="/favicon.svg" alt="" width="34" height="34" />Cookoff Champs</a>
      ${switches}
    </header>
    <main>
${s.main}
    </main>
    <footer class="site-footer no-print">
      ${privacyFooterLink(content.lang)} · ${escapeHtml(content.partOf)} <a href="https://hostedinthebarn.com">Hosted in the Barn</a>
    </footer>
  </body>
</html>
`;
}

function sheetIn(c: PrintablesContent, id: string): Sheet {
  const sheet = c.sheets.find((s) => s.id === id);
  if (!sheet) throw new Error(`no printable "${id}" in ${c.lang}`);
  return sheet;
}

/**
 * One printable's page. `qrSvg` is the QR code's markup for qrTarget(), made by
 * the build script (the qrcode library is async), so this stays a plain function.
 */
export function sheetPage(content: PrintablesContent, versions: PrintablesContent[], id: string, qrSvg: string): string {
  const sheet = sheetIn(content, id);
  const foot = sheetFoot(content, qrSvg);
  const main = `      <div class="no-print">
        <h1>${escapeHtml(sheet.title)}</h1>
        <p class="lede">${escapeHtml(sheet.intro)}</p>
        <p><a class="button" href="${escapeHtml(pdfPath(sheet))}" download>${escapeHtml(content.downloadPdf)}</a></p>
        <p class="muted">${escapeHtml(content.orPrint)}</p>
        <h2>${escapeHtml(content.tipsTitle)}</h2>
        <ul>${sheet.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        <p><a class="guide-link" href="${escapeHtml(sheet.guidePath)}">${escapeHtml(content.guideLink)}</a></p>
      </div>
      <div class="sheets">
${sheet.parts.map((p) => part(p, foot)).join("\n")}
      </div>
      <p class="no-print"><a href="${escapeHtml(content.path)}">${escapeHtml(content.allPrintables)}</a> · <a href="${escapeHtml(
        content.appHref,
      )}">${escapeHtml(content.backToApp)}</a></p>`;
  return page(content, versions, {
    title: sheet.title,
    description: sheet.description,
    pathIn: (c) => sheetIn(c, id).path,
    main,
  });
}

/** The list of printables in one language. */
export function indexPage(content: PrintablesContent, versions: PrintablesContent[]): string {
  const main = `      <h1>${escapeHtml(content.title)}</h1>
      <p class="lede">${escapeHtml(content.intro)}</p>
${content.sheets
  .map(
    (s) => `      <article class="card">
        <h2><a href="${escapeHtml(s.path)}">${escapeHtml(s.title)}</a></h2>
        <p>${escapeHtml(s.intro)}</p>
        <p><a href="${escapeHtml(pdfPath(s))}" download>${escapeHtml(content.downloadPdf)}</a></p>
      </article>`,
  )
  .join("\n")}
      <p><a class="button" href="${escapeHtml(content.appHref)}">${escapeHtml(content.backToApp)}</a></p>`;
  return page(content, versions, { title: content.title, description: content.description, pathIn: (c) => c.path, main });
}

/** Every printables page, for the sitemap. */
export function printablePaths(versions: PrintablesContent[]): string[] {
  return versions.flatMap((v) => [v.path, ...v.sheets.map((s) => s.path)]);
}
