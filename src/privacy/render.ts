import { escapeHtml, ORIGIN } from "../help/render";
import { en, es, type PrivacyContent } from "./content";

// The privacy page (BIZ-38) is plain HTML written at build time, like the help
// pages. Everything that comes from content.ts is escaped.

/** The footer link to the privacy page, in the language of the page it sits on. */
export function privacyFooterLink(lang: string): string {
  const c = lang === "es" ? es : en;
  return `<a href="${escapeHtml(c.path)}">${escapeHtml(c.linkText)}</a>`;
}

export function privacyPage(content: PrivacyContent, versions: PrivacyContent[] = [content]): string {
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
  </head>
  <body class="help privacy">
    <header class="masthead">
      <a class="brand" href="${escapeHtml(content.appHref)}"><img src="/favicon.svg" alt="" width="34" height="34" />Cookoff Champs</a>
      ${switches}
    </header>
    <main>
      <h1>${escapeHtml(content.title)}</h1>
      <p class="lede">${escapeHtml(content.updatedLabel)}: <time datetime="${escapeHtml(content.updated)}">${escapeHtml(content.updated)}</time></p>
${content.sections
  .map(
    (s) => `      <section id="${escapeHtml(s.id)}" aria-labelledby="${escapeHtml(s.id)}-title">
        <h2 id="${escapeHtml(s.id)}-title">${escapeHtml(s.title)}</h2>
        ${s.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n        ")}
      </section>`,
  )
  .join("\n")}
      <p><a href="${escapeHtml(content.helpHref)}">${escapeHtml(content.helpLink)}</a></p>
    </main>
    <footer class="site-footer">
      ${escapeHtml(content.partOf)} <a href="https://hostedinthebarn.com">Hosted in the Barn</a>
    </footer>
  </body>
</html>
`;
}
