import { describe, expect, it } from "vitest";
import { ORIGIN, sitemap } from "../../src/help/render";
import { en, type GuidesContent } from "../../src/guides/content";
import { es } from "../../src/guides/content-es";
import { guideJsonLd, guidePage, guidePaths } from "../../src/guides/render";
import { en as printEn } from "../../src/printables/content";
import { es as printEs } from "../../src/printables/content-es";
import { printablePaths } from "../../src/printables/render";

const versions = [en, es];
const printables = [printEn, printEs];

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function doc(content: GuidesContent, id: string): Document {
  return parse(guidePage(content, versions, printables, id));
}

describe("guides content (SW-63)", () => {
  it("has the same guides, sections and questions, in the same order, in both languages", () => {
    const shape = (c: GuidesContent) =>
      c.guides.map((g) => [g.id, g.printableId, g.steps.length, g.sections.map((s) => s.id), g.faq.length]);
    expect(shape(es)).toEqual(shape(en));
    expect(en.guides.map((g) => g.id)).toEqual(["pie", "cookie", "sugar-cookies", "chili"]);
  });

  it("publishes English under /guides/ and Spanish under /es/guias/", () => {
    for (const g of en.guides) expect(g.path.startsWith("/guides/")).toBe(true);
    for (const g of es.guides) expect(g.path.startsWith("/es/guias/")).toBe(true);
  });

  it("matches every guide to a printable in both languages", () => {
    for (const [c, p] of [[en, printEn], [es, printEs]] as const) {
      for (const g of c.guides) expect(p.sheets.some((s) => s.id === g.printableId)).toBe(true);
    }
  });

  it("lists every guide in the sitemap", () => {
    const paths = guidePaths(versions);
    expect(paths).toHaveLength(8);
    const xml = sitemap([...printablePaths(printables), ...paths]);
    expect(xml).toContain(`<loc>${ORIGIN}/guides/judge-a-chili-cookoff/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/es/guias/concurso-de-pays-de-accion-de-gracias/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/guides/sugar-cookies-for-decorating/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/es/guias/galletas-de-azucar-para-decorar/</loc>`);
  });
});

describe("a guide's page", () => {
  it("is titled, described and canonical, with hreflang for both languages", () => {
    const d = doc(en, "pie");
    expect(d.documentElement.lang).toBe("en");
    expect(d.title).toBe("How to run a Thanksgiving pie contest · Cookoff Champs");
    expect(d.querySelector('meta[name="description"]')!.getAttribute("content")).toBe(en.guides[0]!.description);
    expect(d.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(`${ORIGIN}/guides/thanksgiving-pie-contest/`);
    const alternates = [...d.querySelectorAll('link[rel="alternate"]')].map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")]);
    expect(alternates).toEqual([
      ["en", `${ORIGIN}/guides/thanksgiving-pie-contest/`],
      ["es", `${ORIGIN}/es/guias/concurso-de-pays-de-accion-de-gracias/`],
      ["x-default", `${ORIGIN}/guides/thanksgiving-pie-contest/`],
    ]);
    expect(d.querySelector("a.lang")!.getAttribute("href")).toBe("/es/guias/concurso-de-pays-de-accion-de-gracias/");
  });

  it("links to its printable's page and PDF in its own language", () => {
    const en1 = doc(en, "cookie");
    const hrefs = [...en1.querySelectorAll(".guide-printable a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/printables/cookie-contest-score-sheet/", "/printables/cookie-contest-score-sheet.pdf"]);
    const es1 = doc(es, "chili");
    expect([...es1.querySelectorAll(".guide-printable a")].map((a) => a.getAttribute("href"))).toEqual([
      "/es/imprimibles/boleta-concurso-de-chili/",
      "/es/imprimibles/boleta-concurso-de-chili.pdf",
    ]);
  });

  it("ends with the run-it-in-the-app call to action, pointing at the app in its language", () => {
    for (const [c, suffix] of [[en, ""], [es, "&lang=es"]] as const) {
      for (const g of c.guides) {
        const d = doc(c, g.id);
        const last = d.querySelector("main")!.lastElementChild!;
        expect(last.id).toBe("run-it");
        expect(last.querySelector("a.button")!.getAttribute("href")).toBe(`/?ref=guide-${g.id}${suffix}`);
      }
    }
  });

  it("covers the advice each guide promises: blind voting, ties and kids", () => {
    for (const g of en.guides.filter((x) => x.id !== "sugar-cookies")) {
      const ids = g.sections.map((s) => s.id);
      expect(ids).toContain("ties");
      expect(ids).toContain("kids");
    }
    expect(en.guides.find((g) => g.id === "pie")!.sections.map((s) => s.id)).toContain("blind");
  });

  it("escapes the words it prints", () => {
    const evil: GuidesContent = {
      ...en,
      guides: en.guides.map((g) => ({ ...g, title: `<script>x</script> ${g.title}` })),
    };
    const html = guidePage(evil, [evil], printables, "pie");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });

  it("throws for a guide or printable that does not exist", () => {
    expect(() => guidePage(en, versions, printables, "nope")).toThrow('no guide "nope" in en');
    const broken: GuidesContent = { ...en, guides: en.guides.map((g) => ({ ...g, printableId: "nope" })) };
    expect(() => guidePage(broken, [broken], printables, "pie")).toThrow('no printable "nope" in en');
  });
});

describe("a guide's structured data", () => {
  it("holds a HowTo with every step and an FAQPage with every question, read back as JSON", () => {
    const g = en.guides.find((x) => x.id === "chili")!;
    const d = doc(en, g.id);
    const data = JSON.parse(d.querySelector('script[type="application/ld+json"]')!.textContent!);
    const [howTo, faq] = data["@graph"];
    expect(howTo["@type"]).toBe("HowTo");
    expect(howTo.step.map((s: { name: string }) => s.name)).toEqual(g.steps.map((s) => s.name));
    expect(howTo.step[0].position).toBe(1);
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(g.faq.map((f) => f.q));
    expect(faq.inLanguage).toBe("en");
  });

  it("never lets text close the script element", () => {
    const g = { ...en.guides[0]!, faq: [{ q: "x", a: "</script><b>" }] };
    const json = guideJsonLd(en, g);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)["@graph"][1].mainEntity[0].acceptedAnswer.text).toBe("</script><b>");
  });
});

describe("the sugar cookie guide (MKT-123)", () => {
  const find = (c: GuidesContent) => c.guides.find((g) => g.id === "sugar-cookies")!;

  it("links the cookie contest guide's kids section to it, and it back, in both languages", () => {
    for (const [c, other] of [[en, "/guides/sugar-cookies-for-decorating/"], [es, "/es/guias/galletas-de-azucar-para-decorar/"]] as const) {
      expect(find(c).path).toBe(other);
      const kids = doc(c, "cookie").querySelector("#kids")!;
      expect([...kids.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toContain(other);
      const back = [...doc(c, "sugar-cookies").querySelectorAll("a")].map((a) => a.getAttribute("href"));
      expect(back).toContain(c.guides.find((g) => g.id === "cookie")!.path);
    }
  });

  it("links the two languages both ways", () => {
    expect(doc(en, "sugar-cookies").querySelector("a.lang")!.getAttribute("href")).toBe("/es/guias/galletas-de-azucar-para-decorar/");
    expect(doc(es, "sugar-cookies").querySelector("a.lang")!.getAttribute("href")).toBe("/guides/sugar-cookies-for-decorating/");
  });

  it("credits King Arthur with a link, and makes no claim of testing or timing", () => {
    for (const c of [en, es]) {
      const d = doc(c, "sugar-cookies");
      const ka = d.querySelector('a[href^="https://www.kingarthurbaking.com/"]')!;
      expect(ka.getAttribute("rel")).toBe("noopener");
      expect(d.querySelector(".guide-credit")!.textContent).toContain("King Arthur Baking");
      expect(d.querySelector("main")!.textContent).not.toMatch(/within a minute|we (have )?tested|probamos|dentro de un minuto/i);
      expect(d.querySelector("#run-it p")!.textContent).toBe(find(c).runItText);
    }
  });

  it("keeps the quantities the same in both languages", () => {
    const nums = (c: GuidesContent) =>
      JSON.stringify(find(c).sections.slice(0, 2).map((s) => s.body.filter((b) => typeof b !== "string" && "list" in b).map((b) => (b as { list: string[] }).list.map((i) => i.replace(/ g\b/g, "g").match(/\((\d+g?) ?g?\)|\d+ \d\/\d|\d\/\d|\d+/g)))));
    expect(nums(es)).toEqual(nums(en));
  });
});

describe("printables and guides point at each other", () => {
  it("links every sheet to the guide with the same id, in its own language", () => {
    for (const [c, p] of [[en, printEn], [es, printEs]] as const) {
      for (const s of p.sheets) expect(s.guidePath).toBe(c.guides.find((g) => g.id === s.id)!.path);
    }
  });
});
