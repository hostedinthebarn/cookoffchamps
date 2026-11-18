import { describe, expect, it } from "vitest";
import { ORIGIN, sitemap } from "../../src/help/render";
import { en as guidesEn } from "../../src/guides/content";
import { guidePage } from "../../src/guides/render";
import { en as printEn } from "../../src/printables/content";
import { es as printEs } from "../../src/printables/content-es";
import { es as guidesEs } from "../../src/guides/content-es";
import { en, type StoriesContent } from "../../src/stories/content";
import { storiesIndexPage, storyJsonLd, storyPage, storyPaths } from "../../src/stories/render";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const story = en.stories[0]!;

describe("story pages (SW-124)", () => {
  it("has a title and description of search-friendly length", () => {
    for (const s of en.stories) {
      expect(s.title.length).toBeLessThanOrEqual(65);
      expect(s.description.length).toBeLessThanOrEqual(165);
      expect(s.path).toBe(`/stories/${s.id}/`);
      expect(s.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("is titled, described and canonical, with Open Graph tags", () => {
    const d = parse(storyPage(en, story.id));
    expect(d.title).toBe("Where do Christmas cookies come from? A short history");
    expect(d.querySelector('meta[name="description"]')!.getAttribute("content")).toBe(story.description);
    expect(d.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(`${ORIGIN}/stories/christmas-cookie-history/`);
    expect(d.querySelector('meta[property="og:image"]')!.getAttribute("content")).toBe(`${ORIGIN}/apple-touch-icon.png`);
    expect(d.querySelector("h1")!.textContent).toBe("Where do Christmas cookies come from?");
    expect(d.querySelector("time")!.getAttribute("datetime")).toBe(story.datePublished);
  });

  it("carries Article structured data that parses and matches the page", () => {
    const d = parse(storyPage(en, story.id));
    const data = JSON.parse(d.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe(story.heading);
    expect(data.datePublished).toBe(story.datePublished);
    expect(data.publisher.name).toBe("Cookoff Champs");
    expect(data.author).toBeUndefined();
  });

  it("escapes '<' in the structured data and in the words it prints", () => {
    const evil: StoriesContent = { ...en, stories: [{ ...story, heading: "</script><b>x", paragraphs: [["<i>hi</i>", { text: "<u>", href: 'x"y' }]] }] };
    expect(storyJsonLd(evil, evil.stories[0]!)).not.toContain("<");
    const html = storyPage(evil, story.id);
    expect(html).not.toContain("<i>hi");
    expect(html).not.toContain('href="x"y"');
  });

  it("links the guide and the score sheet, and every source", () => {
    const d = parse(storyPage(en, story.id));
    const hrefs = [...d.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/guides/christmas-cookie-contest/");
    expect(hrefs).toContain("/printables/cookie-contest-score-sheet/");
    for (const s of story.sources) expect(hrefs).toContain(s.href);
    expect(d.querySelector(".guide-cta")!.textContent).toContain("vote on their phones, free");
  });

  it("links only to pages that exist", () => {
    expect(guidesEn.guides.some((g) => g.path === en.closing.guideHref)).toBe(true);
    expect(printEn.sheets.some((s) => s.path === en.closing.sheetHref)).toBe(true);
  });

  it("throws for an unknown story", () => {
    expect(() => storyPage(en, "nope")).toThrow('no story "nope"');
  });

  it("lists every story on the index and in the sitemap", () => {
    const d = parse(storiesIndexPage(en));
    expect([...d.querySelectorAll("main li a")].map((a) => a.getAttribute("href"))).toEqual(en.stories.map((s) => s.path));
    expect(d.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(`${ORIGIN}/stories/`);
    const xml = sitemap(storyPaths(en));
    expect(xml).toContain(`<loc>${ORIGIN}/stories/</loc>`);
    for (const s of en.stories) expect(xml).toContain(`<loc>${ORIGIN}${s.path}</loc>`);
  });
});

describe("the cookie guide's link to its story", () => {
  it("points at the story, and other guides have none", () => {
    const d = parse(guidePage(guidesEn, [guidesEn, guidesEs], [printEn, printEs], "cookie"));
    const a = d.querySelector(".guide-story a")!;
    expect(a.getAttribute("href")).toBe(story.path);
    expect(d.querySelector(".guide-story")!.textContent).toContain("The story behind the cookie");
    expect(parse(guidePage(guidesEn, [guidesEn, guidesEs], [printEn, printEs], "pie")).querySelector(".guide-story")).toBeNull();
  });
});
