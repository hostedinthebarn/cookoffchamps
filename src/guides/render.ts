import { escapeHtml, ORIGIN } from "../help/render";
import { privacyFooterLink } from "../privacy/render";
import type { PrintablesContent, Sheet } from "../printables/content";
import { pdfPath } from "../printables/render";
import type { Block, Guide, GuidesContent } from "./content";

// The holiday guides (SW-63) are plain HTML written at build time, like the help
// pages, so search engines can read them. Each guide's HowTo and FAQ structured
// data is made from the same words as the page, so the two can't drift apart.

function block(b: Block): string {
  if (typeof b === "string") return `<p>${escapeHtml(b)}</p>`;
  return `<ul>${b.list.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

/**
 * schema.org HowTo (the steps) and FAQPage (the questions) in one graph. Every
 * "<" is written as \u003c, so no text can close the script element or open a
 * comment; JSON parsers read it back as "<".
 */
export function guideJsonLd(content: GuidesContent, guide: Guide): string {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        name: guide.title,
        description: guide.description,
        inLanguage: content.lang,
        step: guide.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
      },
      {
        "@type": "FAQPage",
        inLanguage: content.lang,
        mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function guideIn(c: GuidesContent, id: string): Guide {
  const g = c.guides.find((x) => x.id === id);
  if (!g) throw new Error(`no guide "${id}" in ${c.lang}`);
  return g;
}

function sheetFor(printables: PrintablesContent, guide: Guide): Sheet {
  const s = printables.sheets.find((x) => x.id === guide.printableId);
  if (!s) throw new Error(`no printable "${guide.printableId}" in ${printables.lang}`);
  return s;
}

/**
 * One guide, in one language. `versions` is every language's guides (this one
 * included) and `printables` the matching printables in each, so the guide can
 * link to its sheet in its own language.
 */
export function guidePage(content: GuidesContent, versions: GuidesContent[], printables: PrintablesContent[], id: string): string {
  const guide = guideIn(content, id);
  const sheet = sheetFor(printables.find((p) => p.lang === content.lang)!, guide);
  const url = `${ORIGIN}${guide.path}`;
  const alternates = versions
    .map((v) => `    <link rel="alternate" hreflang="${escapeHtml(v.lang)}" href="${ORIGIN}${escapeHtml(guideIn(v, id).path)}" />`)
    .concat(`    <link rel="alternate" hreflang="x-default" href="${ORIGIN}${escapeHtml(guideIn(versions[0]!, id).path)}" />`)
    .join("\n");
  const switches = versions
    .filter((v) => v.lang !== content.lang)
    .map((v) => `<a class="lang" href="${escapeHtml(guideIn(v, id).path)}" lang="${escapeHtml(v.lang)}" hreflang="${escapeHtml(v.lang)}">${escapeHtml(v.langName)}</a>`)
    .join(" ");
  const others = content.guides.filter((g) => g.id !== id);
  return `<!doctype html>
<html lang="${escapeHtml(content.lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(guide.title)} · Cookoff Champs</title>
    <meta name="description" content="${escapeHtml(guide.description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
${alternates}
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(guide.title)} · Cookoff Champs" />
    <meta property="og:description" content="${escapeHtml(guide.description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="theme-color" content="#fffaf3" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1a1310" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/app.css" />
    <script type="application/ld+json">${guideJsonLd(content, guide)}</script>
  </head>
  <body class="help guide">
    <header class="masthead">
      <a class="brand" href="${escapeHtml(content.appHref)}"><img src="/favicon.svg" alt="" width="34" height="34" />Cookoff Champs</a>
      ${switches}
    </header>
    <main>
      <h1>${escapeHtml(guide.title)}</h1>
      <p class="lede">${escapeHtml(guide.intro)}</p>
      <section class="card guide-steps" aria-labelledby="steps-title">
        <h2 id="steps-title">${escapeHtml(guide.stepsTitle)}</h2>
        <ol>${guide.steps.map((s) => `<li><strong>${escapeHtml(s.name)}.</strong> ${escapeHtml(s.text)}</li>`).join("")}</ol>
      </section>
      <aside class="card guide-printable">
        <h2>${escapeHtml(content.printableTitle)}: ${escapeHtml(sheet.title)}</h2>
        <p>${escapeHtml(sheet.intro)}</p>
        <p><a class="button" href="${escapeHtml(sheet.path)}">${escapeHtml(content.printablePage)}</a> <a href="${escapeHtml(pdfPath(sheet))}" download>${escapeHtml(content.printablePdf)}</a></p>
      </aside>
${guide.sections
  .map(
    (s) => `      <section id="${escapeHtml(s.id)}" aria-labelledby="${escapeHtml(s.id)}-title">
        <h2 id="${escapeHtml(s.id)}-title">${escapeHtml(s.heading)}</h2>
        ${s.body.map(block).join("\n        ")}
      </section>`,
  )
  .join("\n")}
      <section id="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">${escapeHtml(content.faqTitle)}</h2>
${guide.faq.map((f) => `        <h3>${escapeHtml(f.q)}</h3>\n        <p>${escapeHtml(f.a)}</p>`).join("\n")}
      </section>
      <p class="muted">${escapeHtml(content.moreGuides)}: ${others.map((g) => `<a href="${escapeHtml(g.path)}">${escapeHtml(g.title)}</a>`).join(" · ")}</p>
      <section class="card guide-cta" id="run-it" aria-labelledby="run-it-title">
        <h2 id="run-it-title">${escapeHtml(content.runItTitle)}</h2>
        <p>${escapeHtml(content.runItText)}</p>
        <p><a class="button" href="${escapeHtml(runItHref(content, guide))}">${escapeHtml(content.runItButton)}</a></p>
      </section>
    </main>
    <footer class="site-footer">
      ${privacyFooterLink(content.lang)} · ${escapeHtml(content.partOf)} <a href="https://hostedinthebarn.com">Hosted in the Barn</a>
    </footer>
  </body>
</html>
`;
}

/** Every guide's page, for the sitemap. */
export function guidePaths(versions: GuidesContent[]): string[] {
  return versions.flatMap((v) => v.guides.map((g) => g.path));
}

/** The closing link: the app, tagged so the Worker counts it (?ref=guide-pie), in the guide's language. */
export function runItHref(content: GuidesContent, guide: Guide): string {
  return `/?ref=guide-${guide.id}${content.lang === "en" ? "" : `&lang=${content.lang}`}`;
}
