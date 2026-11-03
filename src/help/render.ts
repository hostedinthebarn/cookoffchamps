import type { Block, HelpContent, Question } from "./content";

// The public help pages are plain HTML written at build time (SW-24), not drawn
// by the app's JavaScript, so search engines and link previews can read them.
// Everything that comes from content.ts is escaped.

export const ORIGIN = "https://cookoffchamps.com";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function block(b: Block): string {
  if (typeof b === "string") return `<p>${escapeHtml(b)}</p>`;
  return `<ol>${b.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
}

/** An answer as plain text, for the structured data and the filter. */
export function answerText(blocks: Block[]): string {
  return blocks.map((b) => (typeof b === "string" ? b : b.steps.map((s, i) => `${i + 1}. ${s}`).join(" "))).join(" ");
}

/**
 * schema.org FAQPage, which lets search engines show the questions directly.
 * Every "<" is written as \u003c, so no answer can close the script element or
 * open a comment; JSON parsers read it back as "<".
 */
export function faqJsonLd(content: HelpContent): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: content.lang,
    mainEntity: content.sections.flatMap((s) =>
      s.questions.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: answerText(q.a) } })),
    ),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function question(q: Question, linkLabel: string): string {
  // data-text is what the filter searches: the question and its answer.
  return `<details class="faq card" id="${escapeHtml(q.id)}" data-text="${escapeHtml(`${q.q} ${answerText(q.a)}`.toLowerCase())}">
<summary><h3>${escapeHtml(q.q)}</h3></summary>
${q.a.map(block).join("\n")}
<p class="faq-link"><a href="#${escapeHtml(q.id)}">${escapeHtml(linkLabel)}</a></p>
</details>`;
}

/**
 * One language's help page. `versions` is every language's content (this one
 * included): each gets an hreflang alternate, so search engines send people to
 * their own language, and the others get a link in the masthead.
 */
export function helpPage(content: HelpContent, versions: HelpContent[] = [content]): string {
  const url = `${ORIGIN}${content.path}`;
  const alternates = versions
    .map((v) => `    <link rel="alternate" hreflang="${escapeHtml(v.lang)}" href="${ORIGIN}${escapeHtml(v.path)}" />`)
    .concat(`    <link rel="alternate" hreflang="x-default" href="${ORIGIN}${escapeHtml(versions[0]!.path)}" />`)
    .join("\n");
  const switches = versions
    .filter((v) => v.lang !== content.lang)
    .map((v) => `<a class="lang" href="${escapeHtml(v.path)}" lang="${escapeHtml(v.lang)}" hreflang="${escapeHtml(v.lang)}">${escapeHtml(v.langName)}</a>`)
    .join(" ");
  return `<!doctype html>
<html lang="${escapeHtml(content.lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(content.title)} · Cookoff Champs</title>
    <meta name="description" content="${escapeHtml(content.description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
${alternates}
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(content.title)} · Cookoff Champs" />
    <meta property="og:description" content="${escapeHtml(content.description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="theme-color" content="#fffaf3" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1a1310" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/app.css" />
    <script type="module" src="/help/filter.js"></script>
    <script type="application/ld+json">${faqJsonLd(content)}</script>
  </head>
  <body class="help">
    <header class="masthead">
      <a class="brand" href="${escapeHtml(content.appHref)}"><img src="/favicon.svg" alt="" width="34" height="34" />Cookoff Champs</a>
      ${switches}
    </header>
    <main>
      <h1>${escapeHtml(content.title)}</h1>
      <p class="lede">${escapeHtml(content.intro)}</p>
      <div class="help-filter" hidden>
        <label for="faq-filter">${escapeHtml(content.filterLabel)}</label>
        <input id="faq-filter" type="search" autocomplete="off" />
        <p class="status" role="status" hidden>${escapeHtml(content.noMatches)}</p>
      </div>
${content.sections
  .map(
    (s) => `      <section class="faq-section" id="${escapeHtml(s.id)}" aria-labelledby="${escapeHtml(s.id)}-title">
        <h2 id="${escapeHtml(s.id)}-title">${escapeHtml(s.title)}</h2>
${s.questions.map((q) => question(q, content.linkLabel)).join("\n")}
      </section>`,
  )
  .join("\n")}
      <p><a class="button" href="${escapeHtml(content.appHref)}">${escapeHtml(content.backToApp)}</a></p>
    </main>
    <footer class="site-footer">
      <a href="${escapeHtml(content.printablesHref)}">${escapeHtml(content.printablesLink)}</a> · ${content.guides.map((g) => `<a href="${escapeHtml(g.href)}">${escapeHtml(g.text)}</a>`).join(" · ")} · <a href="/third-party-notices.txt">${escapeHtml(content.noticesLink)}</a> · ${escapeHtml(content.partOf)} <a href="https://hostedinthebarn.com">Hosted in the Barn</a>
    </footer>
  </body>
</html>
`;
}

/** The pages search engines should know about. Event pages are private, so never listed. */
export const PUBLIC_PATHS = ["/", "/help/", "/es/ayuda/"];

/** `extra` is the other build-time pages, such as the printables (SW-62). */
export function sitemap(extra: string[] = []): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...PUBLIC_PATHS, ...extra].map((p) => `  <url><loc>${ORIGIN}${p}</loc></url>`).join("\n")}
</urlset>
`;
}

// Event, results and organizer pages are reached by unguessable links (decision
// 13) and must stay out of search results; so must the API.
export function robots(): string {
  return `User-agent: *
Disallow: /api/
Disallow: /e/
Disallow: /v/
Disallow: /c/
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`;
}
