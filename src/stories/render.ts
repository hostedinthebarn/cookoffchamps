import { escapeHtml, ORIGIN } from "../help/render";
import { privacyFooterLink } from "../privacy/render";
import type { Part, StoriesContent, Story } from "./content";

// Story pages (SW-124) are plain HTML written at build time, like the guides, so
// search engines can read them. The Article structured data is made from the same
// words as the page.

function part(p: Part): string {
  if (typeof p === "string") return escapeHtml(p);
  return `<a href="${escapeHtml(p.href)}" rel="noopener">${escapeHtml(p.text)}</a>`;
}

function storyIn(c: StoriesContent, id: string): Story {
  const s = c.stories.find((x) => x.id === id);
  if (!s) throw new Error(`no story "${id}" in ${c.lang}`);
  return s;
}

/** schema.org Article. Every "<" is written as \u003c, so no text can close the script element. */
export function storyJsonLd(content: StoriesContent, story: Story): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.heading,
    description: story.description,
    inLanguage: content.lang,
    datePublished: story.datePublished,
    mainEntityOfPage: `${ORIGIN}${story.path}`,
    image: `${ORIGIN}/apple-touch-icon.png`,
    publisher: { "@type": "Organization", name: content.publisher, url: `${ORIGIN}/` },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function head(title: string, description: string, url: string, type: string, extra: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${ORIGIN}/apple-touch-icon.png" />
    <meta name="theme-color" content="#fffaf3" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#1a1310" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/app.css" />${extra}
  </head>
  <body class="help guide story">
    <header class="masthead">
      <a class="brand" href="/"><img src="/favicon.svg" alt="" width="34" height="34" />Cookoff Champs</a>
    </header>
`;
}

function foot(content: StoriesContent): string {
  return `    <footer class="site-footer">
      ${privacyFooterLink(content.lang)} · ${escapeHtml(content.partOf)} <a href="https://hostedinthebarn.com">Hosted in the Barn</a>
    </footer>
  </body>
</html>
`;
}

/** One story's page. */
export function storyPage(content: StoriesContent, id: string): string {
  const story = storyIn(content, id);
  const c = content.closing;
  return `${head(story.title, story.description, `${ORIGIN}${story.path}`, "article", `\n    <script type="application/ld+json">${storyJsonLd(content, story)}</script>`)}    <main>
      <h1>${escapeHtml(story.heading)}</h1>
      <p class="muted">${escapeHtml(content.publishedOn)} <time datetime="${escapeHtml(story.datePublished)}">${escapeHtml(story.datePublished)}</time></p>
${story.paragraphs.map((p) => `      <p>${p.map(part).join("")}</p>`).join("\n")}
      <section class="card guide-cta" aria-labelledby="closing-title">
        <h2 id="closing-title">${escapeHtml(c.title)}</h2>
        <p>${escapeHtml(c.before)}<a href="${escapeHtml(c.guideHref)}">${escapeHtml(c.guideText)}</a>${escapeHtml(c.middle)}<a href="${escapeHtml(c.sheetHref)}">${escapeHtml(c.sheetText)}</a>${escapeHtml(c.after)}</p>
      </section>
      <section aria-labelledby="sources-title">
        <h2 id="sources-title">${escapeHtml(content.sourcesTitle)}</h2>
        <ul>${story.sources.map((s) => `<li><a href="${escapeHtml(s.href)}" rel="noopener">${escapeHtml(s.text)}</a></li>`).join("")}</ul>
      </section>
      <p class="muted"><a href="${escapeHtml(content.indexPath)}">${escapeHtml(content.allStories)}</a></p>
    </main>
${foot(content)}`;
}

/** The /stories/ index: one line per story. */
export function storiesIndexPage(content: StoriesContent): string {
  return `${head(`${content.indexTitle} · ${content.publisher}`, content.indexDescription, `${ORIGIN}${content.indexPath}`, "website", "")}    <main>
      <h1>${escapeHtml(content.indexTitle)}</h1>
      <p class="lede">${escapeHtml(content.indexIntro)}</p>
      <ul>${content.stories.map((s) => `<li><a href="${escapeHtml(s.path)}">${escapeHtml(s.heading)}</a></li>`).join("")}</ul>
    </main>
${foot(content)}`;
}

/** The index and every story, for the sitemap. With no story live yet, nothing. */
export function storyPaths(content: StoriesContent): string[] {
  return content.stories.length ? [content.indexPath, ...content.stories.map((s) => s.path)] : [];
}

// Gary, 2026-11-20: a page waiting for its date is held back here, in the code, never by leaving
// its PR open (open PRs get left behind or merged by accident). The build leaves out every story
// whose datePublished is still ahead, and the daily scheduled deploy (ci.yml) publishes it on the day.

/** Today's date in Texas (America/Chicago) as YYYY-MM-DD, the day each datePublished is compared with. */
export function todayInTexas(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The same content with only the stories whose datePublished has arrived. */
export function publishedStories(content: StoriesContent, today: string): StoriesContent {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`not a YYYY-MM-DD date: "${today}"`);
  return { ...content, stories: content.stories.filter((s) => s.datePublished <= today) };
}

/** Guide content with its links to stories that aren't live yet left out, so no page links to a held-back story. */
export function withLiveStoryLinks<G extends { guides: { stories?: { href: string }[] }[] }>(
  guides: G,
  live: StoriesContent,
): G {
  const paths = new Set(live.stories.map((s) => s.path));
  return {
    ...guides,
    guides: guides.guides.map((g) => (g.stories ? { ...g, stories: g.stories.filter((l) => paths.has(l.href)) } : g)),
  };
}
