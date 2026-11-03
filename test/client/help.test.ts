import { afterEach, describe, expect, it, vi } from "vitest";
import { en, type HelpContent } from "../../src/help/content";
import { es } from "../../src/help/content-es";
import { applyFilter, matches, openTarget, start, words } from "../../src/help/filter";
import { answerText, escapeHtml, faqJsonLd, helpPage, ORIGIN, robots, sitemap } from "../../src/help/render";

/** The generated page, parsed, with its body placed in the test document. */
function load(content: HelpContent = en): Document {
  const doc = new DOMParser().parseFromString(helpPage(content), "text/html");
  const copy = (from: Element) => [...from.childNodes].map((n) => document.importNode(n, true));
  document.documentElement.lang = doc.documentElement.lang;
  document.head.replaceChildren(...copy(doc.head));
  document.body.replaceChildren(...copy(doc.body));
  return doc;
}

afterEach(() => {
  history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("the help page", () => {
  it("has every question as plain HTML, with a stable anchor and its section", () => {
    const doc = load();
    const ids = en.sections.flatMap((s) => s.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length); // anchors are unique
    for (const s of en.sections) {
      const section = doc.getElementById(s.id)!;
      expect(section.querySelector("h2")!.textContent).toBe(s.title);
      for (const q of s.questions) expect(section.querySelector(`#${q.id} summary h3`)!.textContent).toBe(q.q);
    }
    expect(doc.querySelectorAll("details.faq")).toHaveLength(ids.length);
  });

  it("is titled, described and canonical for search engines", () => {
    const doc = load();
    expect(doc.documentElement.lang).toBe("en");
    expect(doc.title).toBe("Help and questions · Cookoff Champs");
    expect(doc.querySelector('meta[name="description"]')!.getAttribute("content")).toBe(en.description);
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(`${ORIGIN}/help/`);
    expect(doc.querySelector('meta[property="og:url"]')!.getAttribute("content")).toBe(`${ORIGIN}/help/`);
  });

  it("renders numbered steps as a list", () => {
    const doc = load();
    expect([...doc.querySelectorAll("#set-up ol li")].map((li) => li.textContent)).toHaveLength(5);
  });

  it("carries FAQ structured data for every question", () => {
    const data = JSON.parse(load().querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(en.sections.flatMap((s) => s.questions).length);
    expect(data.mainEntity[0]).toEqual({
      "@type": "Question",
      name: "How do I vote?",
      acceptedAnswer: { "@type": "Answer", text: en.sections[0]!.questions[0]!.a[0] },
    });
  });

  it("covers the decisions Gary asked to see explained", () => {
    const text = load().body.textContent!;
    for (const phrase of ["Undo the reveal", "Reopen voting", "soft limit", "strip all of it", "15 minutes", "30 days", "Cloudflare Web Analytics"]) {
      expect(text).toContain(phrase);
    }
  });

  it("escapes everything that comes from the content", () => {
    const evil: HelpContent = {
      ...en,
      title: "<script>alert(1)</script>",
      sections: [{ id: "s", title: "T & \"x\" 'y'", questions: [{ id: "q", q: "<b>Q</b>", a: ["</script><img src=x onerror=alert(1)>", { steps: ["<i>1</i>"] }] }] }],
    };
    const html = helpPage(evil);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Q</b>");
    expect(html).not.toContain("<i>1</i>");
    const ld = faqJsonLd(evil);
    expect(ld).not.toContain("<");
    expect(JSON.parse(ld).mainEntity[0].acceptedAnswer.text).toBe("</script><img src=x onerror=alert(1)> 1. <i>1</i>");
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("has a Spanish version with the same sections and anchors (SW-27)", () => {
    const ids = (c: HelpContent) => c.sections.map((s) => [s.id, s.questions.map((q) => [q.id, q.a.length, q.a.map((b) => typeof b)])]);
    expect(ids(es)).toEqual(ids(en));
    const doc = new DOMParser().parseFromString(helpPage(es, [en, es]), "text/html");
    expect(doc.documentElement.lang).toBe("es");
    expect(doc.title).toBe("Ayuda y preguntas · Cookoff Champs");
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(`${ORIGIN}/es/ayuda/`);
    expect(doc.querySelector(".faq-link a")!.textContent).toBe("Enlace a esta respuesta");
    expect(doc.querySelector(".site-footer")!.textContent).toContain("Parte de");
    expect([...doc.querySelectorAll(".site-footer a")].map((a) => a.getAttribute("href"))).toContain("/es/guias/como-juzgar-un-concurso-de-chili/");
    expect(doc.querySelector("main .button")!.getAttribute("href")).toBe("/?lang=es");
    const other = doc.querySelector<HTMLAnchorElement>("a.lang")!;
    expect([other.getAttribute("href"), other.lang, other.textContent]).toEqual(["/help/", "en", "English"]);
    expect(JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!).inLanguage).toBe("es");
  });

  it("points search engines at each language, English by default", () => {
    for (const content of [en, es]) {
      const doc = new DOMParser().parseFromString(helpPage(content, [en, es]), "text/html");
      const alt = [...doc.querySelectorAll('link[rel="alternate"]')].map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")]);
      expect(alt).toEqual([["en", `${ORIGIN}/help/`], ["es", `${ORIGIN}/es/ayuda/`], ["x-default", `${ORIGIN}/help/`]]);
    }
    // On its own, a page has no other language to link to.
    expect(load().querySelector("a.lang")).toBeNull();
  });

  it("flattens answers to text, numbering steps", () => {
    expect(answerText(["One.", { steps: ["a", "b"] }])).toBe("One. 1. a 2. b");
  });
});

describe("sitemap and robots", () => {
  it("lists only the public pages", () => {
    const xml = sitemap();
    expect(xml).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/help/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/es/ayuda/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/privacy/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/es/privacidad/</loc>`);
    expect(xml.match(/<loc>/g)).toHaveLength(5);
  });

  it("keeps event, results and organizer pages out of search engines", () => {
    const txt = robots();
    for (const path of ["/api/", "/e/", "/v/", "/c/"]) expect(txt).toContain(`Disallow: ${path}`);
    expect(txt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });
});

describe("the question filter", () => {
  const visible = () => [...document.querySelectorAll<HTMLElement>("details.faq")].filter((d) => !d.hidden).map((d) => d.id);

  it("splits the query into lower-case words, and matches only if all are present", () => {
    expect(words("  Undo   REVEAL ")).toEqual(["undo", "reveal"]);
    expect(matches("undo the reveal", ["undo", "reveal"])).toBe(true);
    expect(matches("undo the reveal", ["undo", "photo"])).toBe(false);
  });

  it("shows the box only once the script runs, and filters as you type", () => {
    load();
    expect(document.querySelector<HTMLElement>(".help-filter")!.hidden).toBe(true);
    start(document, window);
    expect(document.querySelector<HTMLElement>(".help-filter")!.hidden).toBe(false);

    const input = document.querySelector<HTMLInputElement>("#faq-filter")!;
    input.value = "undo reveal";
    input.dispatchEvent(new Event("input"));
    expect(visible()).toEqual(["co-organizers", "undo-reveal"]); // co-organizers can "run the reveal and undo it"
    expect(document.querySelector<HTMLDetailsElement>("#undo-reveal")!.open).toBe(true);
    expect(document.getElementById("guests")!.hidden).toBe(true); // empty sections go too
    expect(document.querySelector<HTMLElement>(".help-filter .status")!.hidden).toBe(true);
  });

  it("searches the answers as well as the questions", () => {
    load();
    expect(applyFilter(document, "fingerprint")).toBe(1);
    expect(visible()).toEqual(["one-vote-per-phone"]);
  });

  it("says so when nothing matches, and shows everything again when cleared", () => {
    load();
    expect(applyFilter(document, "zzzz")).toBe(0);
    expect(document.querySelector<HTMLElement>(".help-filter .status")!.hidden).toBe(false);
    const all = en.sections.flatMap((s) => s.questions).length;
    expect(applyFilter(document, "")).toBe(all);
    expect(document.querySelector<HTMLDetailsElement>("#how-to-vote")!.open).toBe(false); // clearing doesn't open everything
  });

  it("opens the question a link points at, on load and when the link changes", () => {
    load();
    history.replaceState(null, "", "/help/#photo-location");
    start(document, window);
    expect(document.querySelector<HTMLDetailsElement>("#photo-location")!.open).toBe(true);
    history.replaceState(null, "", "/help/#ties");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(document.querySelector<HTMLDetailsElement>("#ties")!.open).toBe(true);
  });

  it("ignores empty or non-question anchors", () => {
    load();
    openTarget(document, "");
    openTarget(document, "#guests"); // a section, not a question
    openTarget(document, "#nope");
    expect(document.querySelectorAll("details[open]")).toHaveLength(0);
  });

  it("does nothing on a page without the filter, and copes with a question missing its text", () => {
    document.body.replaceChildren();
    expect(() => start(document, window)).not.toThrow();
    document.body.innerHTML = '<section class="faq-section"><details class="faq" id="x"></details></section>';
    expect(applyFilter(document, "")).toBe(1);
    expect(applyFilter(document, "a")).toBe(0);
  });

  it("starts itself when the bundled script loads", async () => {
    load();
    await import("../../src/help/filter-main");
    expect(document.querySelector<HTMLElement>(".help-filter")!.hidden).toBe(false);
  });
});
