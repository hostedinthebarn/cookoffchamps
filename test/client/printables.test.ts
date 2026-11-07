import { describe, expect, it } from "vitest";
import { en as helpEn } from "../../src/help/content";
import { es as helpEs } from "../../src/help/content-es";
import { helpPage, ORIGIN, sitemap } from "../../src/help/render";
import { en, type PrintablesContent } from "../../src/printables/content";
import { es } from "../../src/printables/content-es";
import {
  indexPage,
  pdfPath,
  printablePaths,
  qrTarget,
  SCORE_ROWS,
  SLIPS_PER_PAGE,
  sheetPage,
  TALLY_ROWS,
} from "../../src/printables/render";

const versions = [en, es];
const QR = '<svg data-test="qr"></svg>';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function sheetDoc(content: PrintablesContent, id: string): Document {
  return parse(sheetPage(content, versions, id, QR));
}

describe("printables content (SW-62)", () => {
  it("has the same sheets, in the same order, in both languages", () => {
    expect(es.sheets.map((s) => [s.id, s.ref, s.parts.map((p) => p.kind)])).toEqual(
      en.sheets.map((s) => [s.id, s.ref, s.parts.map((p) => p.kind)]),
    );
    for (const c of versions) for (const s of c.sheets) expect(s.path.startsWith(c.path)).toBe(true);
  });

  it("puts each PDF beside its page, and points the QR at the app with a counted ref", () => {
    const pie = en.sheets[0]!;
    expect(pdfPath(pie)).toBe("/printables/pie-contest-ballot.pdf");
    expect(qrTarget(pie, en)).toBe(`${ORIGIN}/?ref=pie`);
    expect(qrTarget(es.sheets[0]!, es)).toBe(`${ORIGIN}/?ref=pie&lang=es`);
  });

  it("lists every printables page for the sitemap, after the help pages", () => {
    const paths = printablePaths(versions);
    expect(paths).toContain("/printables/");
    expect(paths).toContain("/es/imprimibles/boleta-concurso-de-chili/");
    expect(paths).toHaveLength(8);
    const xml = sitemap(paths);
    expect(xml).toContain(`<loc>${ORIGIN}/help/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/printables/chili-cookoff-ballot/</loc>`);
  });
});

describe("a printable's page", () => {
  it("is titled, described and canonical, with the other language as an alternate", () => {
    const doc = sheetDoc(en, "pie");
    expect(doc.documentElement.lang).toBe("en");
    expect(doc.title).toBe("Pie contest ballot · Cookoff Champs");
    expect(doc.querySelector('meta[name="description"]')!.getAttribute("content")).toBe(en.sheets[0]!.description);
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(`${ORIGIN}/printables/pie-contest-ballot/`);
    const alternates = [...doc.querySelectorAll('link[rel="alternate"]')].map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")]);
    expect(alternates).toEqual([
      ["en", `${ORIGIN}/printables/pie-contest-ballot/`],
      ["es", `${ORIGIN}/es/imprimibles/boleta-concurso-de-pays/`],
      ["x-default", `${ORIGIN}/printables/pie-contest-ballot/`],
    ]);
    // The switch goes to the same sheet in the other language.
    expect(doc.querySelector("a.lang")!.getAttribute("href")).toBe("/es/imprimibles/boleta-concurso-de-pays/");
  });

  it("offers the PDF and the tips, and links back to the list and the app", () => {
    const doc = sheetDoc(es, "cookie");
    expect(doc.querySelector("h1")!.textContent).toBe("Hoja de puntos para concurso de galletas");
    const pdf = doc.querySelector<HTMLAnchorElement>("a.button[download]")!;
    expect(pdf.getAttribute("href")).toBe("/es/imprimibles/hoja-de-puntos-concurso-de-galletas.pdf");
    expect(doc.querySelectorAll("ul li")).toHaveLength(es.sheets[1]!.tips.length);
    const links = [...doc.querySelectorAll("main > p.no-print a")].map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/es/imprimibles/", "/?lang=es"]);
    expect(doc.querySelector("a.guide-link")!.getAttribute("href")).toBe("/es/guias/concurso-de-galletas-de-navidad/");
    expect(doc.querySelector("a.guide-link")!.textContent).toBe("Lee la guía");
  });

  it("draws ballot slips, a score sheet and a tally sheet, each with the QR foot", () => {
    const doc = sheetDoc(en, "chili");
    const sheets = doc.querySelectorAll(".sheet");
    expect(sheets).toHaveLength(3);

    const slips = sheets[0]!.querySelectorAll(".slip");
    expect(slips).toHaveLength(SLIPS_PER_PAGE);
    expect([...slips[0]!.querySelectorAll(".slip-line span:first-child")].map((s) => s.textContent)).toEqual(["Best chili", "Best heat"]);
    expect(slips[0]!.querySelector(".slip-url")!.textContent).toBe("cookoffchamps.com");

    const scores = sheets[1]!;
    expect(scores.querySelector("h2")!.textContent).toBe("Chili judging sheet");
    expect(scores.querySelector(".sheet-line")!.textContent).toBe("Judge");
    expect([...scores.querySelectorAll("th")].map((th) => th.textContent)).toEqual([
      "Chili #", "Aroma", "Colour", "Consistency", "Taste", "Aftertaste", "Total",
    ]);
    expect(scores.querySelectorAll("tbody tr")).toHaveLength(SCORE_ROWS);
    expect(scores.querySelectorAll("tbody tr:first-child td")).toHaveLength(7);

    const tally = sheets[2]!;
    expect(tally.querySelectorAll("tbody tr")).toHaveLength(TALLY_ROWS);
    expect(tally.querySelectorAll("tbody tr:first-child td")).toHaveLength(5);

    for (const sheet of sheets) {
      expect(sheet.querySelector(".sheet-foot .qr [data-test=qr]")).not.toBeNull();
      expect(sheet.querySelector(".sheet-foot")!.textContent).toContain("Run your own cookoff, free at cookoffchamps.com");
    }
  });

  it("escapes the words it prints", () => {
    const sneaky: PrintablesContent = {
      ...en,
      sheets: [{ ...en.sheets[0]!, title: "<b>Pies</b>", parts: [{ kind: "tally", heading: "A & B", columns: ['"x"'] }] }],
    };
    const html = sheetPage(sneaky, [sneaky], "pie", QR);
    expect(html).toContain("&lt;b&gt;Pies&lt;/b&gt;");
    expect(html).toContain("A &amp; B");
    expect(html).toContain("&quot;x&quot;");
  });

  it("refuses a sheet that doesn't exist in a language", () => {
    expect(() => sheetPage(en, versions, "cake", QR)).toThrow('no printable "cake" in en');
  });
});

describe("the printables list", () => {
  it("links each sheet and its PDF, in the page's language", () => {
    const doc = parse(indexPage(es, versions));
    expect(doc.documentElement.lang).toBe("es");
    expect(doc.title).toBe("Imprimibles gratis para tu concurso · Cookoff Champs");
    expect([...doc.querySelectorAll("article h2 a")].map((a) => a.getAttribute("href"))).toEqual(es.sheets.map((s) => s.path));
    expect([...doc.querySelectorAll("article a[download]")].map((a) => a.getAttribute("href"))).toEqual(es.sheets.map(pdfPath));
    expect(doc.querySelector("a.lang")!.getAttribute("href")).toBe("/printables/");
  });
});

describe("the help pages' footer", () => {
  it("links the printables in the page's language", () => {
    for (const c of [helpEn, helpEs]) {
      const doc = parse(helpPage(c));
      expect(doc.querySelector(`.site-footer a[href="${c.printablesHref}"]`)!.textContent).toBe(c.printablesLink);
    }
  });

  it("links the third-party licence notices in the page's language (SW-89)", () => {
    for (const c of [helpEn, helpEs]) {
      const doc = parse(helpPage(c));
      expect(doc.querySelector('.site-footer a[href="/third-party-notices.txt"]')!.textContent).toBe(c.noticesLink);
    }
  });
});
