import { describe, expect, it } from "vitest";
import { en as helpEn } from "../../src/help/content";
import { es as helpEs } from "../../src/help/content-es";
import { helpPage, ORIGIN, sitemap } from "../../src/help/render";
import { en, es, PRIVACY_EMAIL } from "../../src/privacy/content";
import { privacyFooterLink, privacyPage } from "../../src/privacy/render";

const versions = [en, es];
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("the privacy page", () => {
  it("has the same sections in both languages", () => {
    expect(es.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
    for (const c of versions) expect(c.sections.length).toBeGreaterThan(5);
  });

  it("is titled, canonical and linked to its other language", () => {
    const doc = parse(privacyPage(en, versions));
    expect(doc.documentElement.lang).toBe("en");
    expect(doc.title).toBe("Privacy at Cookoff Champs · Cookoff Champs");
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute("href")).toBe(`${ORIGIN}/privacy/`);
    expect(doc.querySelector('link[hreflang="es"]')!.getAttribute("href")).toBe(`${ORIGIN}/es/privacidad/`);
    expect(doc.querySelector('link[hreflang="x-default"]')!.getAttribute("href")).toBe(`${ORIGIN}/privacy/`);
    expect(doc.querySelector("a.lang")!.getAttribute("href")).toBe("/es/privacidad/");
    expect(parse(privacyPage(es, versions)).documentElement.lang).toBe("es");
  });

  it("works on its own, with no other language", () => {
    expect(parse(privacyPage(en)).querySelector("a.lang")).toBeNull();
  });

  it("states the facts the code backs up, in both languages", () => {
    for (const c of versions) {
      const text = parse(privacyPage(c, versions)).body.textContent!;
      expect(text).toContain(PRIVACY_EMAIL);
      expect(text).toContain("Hosted in the Barn");
      expect(text).toContain("localStorage");
      expect(text).toContain("Resend");
      expect(text).toContain("Cloudflare");
      expect(text).toContain("secret");
      expect(text).toContain("Pinterest"); // our own social accounts' analytics (BIZ-61)
    }
  });

  it("is dated", () => {
    const time = parse(privacyPage(en)).querySelector("time")!;
    expect(time.getAttribute("datetime")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("escapes what it prints", () => {
    const html = privacyPage({ ...en, title: "<b>x</b>", sections: [{ id: "a", title: "<i>", body: ["<script>"] }] });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>x</b>");
  });

  it("is in the sitemap and in the footer links", () => {
    const xml = sitemap();
    expect(xml).toContain(`${ORIGIN}/privacy/`);
    expect(xml).toContain(`${ORIGIN}/es/privacidad/`);
    expect(privacyFooterLink("en")).toBe('<a href="/privacy/">Privacy</a>');
    expect(privacyFooterLink("es")).toBe('<a href="/es/privacidad/">Privacidad</a>');
  });
});

describe("the Q&A and the privacy page agree", () => {
  const answers = (c: typeof helpEn) =>
    c.sections.find((s) => s.id === "privacy")!.questions.map((q) => [q.id, q.a.filter((b): b is string => typeof b === "string").join(" ")] as const);

  it("links to the privacy page from the Privacy section and the footer", () => {
    for (const [c, href] of [[helpEn, "/privacy/"], [helpEs, "/es/privacidad/"]] as const) {
      const doc = parse(helpPage(c));
      expect(doc.querySelector(`#privacy-title ~ p a`)!.getAttribute("href")).toBe(href);
      expect(doc.querySelector(`.site-footer a[href="${href}"]`)).not.toBeNull();
      expect(doc.querySelector(`#guests-title ~ p a[href="${href}"]`)).toBeNull(); // only the Privacy section
    }
  });

  it("has the corrected answers and no more 'no analytics' claim", () => {
    const en = Object.fromEntries(answers(helpEn));
    expect(en["tracking"]).toContain("Cloudflare Web Analytics");
    expect(en["tracking"]).not.toMatch(/no analytics/i);
    expect(en["ip-addresses"]).toContain("without a secret key that only the app holds");
    expect(en["cook-data"]).toContain(PRIVACY_EMAIL);
    expect(en["other-handlers"]).toContain("Resend");
    const es = Object.fromEntries(answers(helpEs));
    expect(es["tracking"]).toContain("Cloudflare Web Analytics");
    expect(es["ip-addresses"]).toContain("clave secreta que solo tiene la app");
    expect(es["cook-data"]).toContain(PRIVACY_EMAIL);
    expect(es["other-handlers"]).toContain("Resend");
  });
});
