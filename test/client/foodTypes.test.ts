import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en as guidesEn } from "../../src/guides/content";
import { es as guidesEs } from "../../src/guides/content-es";
import { en as printEn } from "../../src/printables/content";
import { es as printEs } from "../../src/printables/content-es";
import {
  type FoodType,
  FOOD_TYPES,
  guideRefs,
  heldBack,
  liveGuides,
  liveSheets,
  PRESET_NAMES,
  printableRefs,
} from "../../src/shared/foodTypes";
import { en as appEn } from "../../src/client/i18n/en";
import { es as appEs } from "../../src/client/i18n/es";

describe("the food type registry (SW-123)", () => {
  it("has unique ids, a known preset, a board and a season for each", () => {
    expect(new Set(FOOD_TYPES.map((t) => t.id)).size).toBe(FOOD_TYPES.length);
    for (const t of FOOD_TYPES) {
      expect(PRESET_NAMES).toContain(t.preset);
      expect(t.board).not.toBe("");
      expect(t.season).not.toBe("");
      expect(t.label.en).not.toBe("");
      expect(t.label.es).not.toBe("");
    }
    expect(FOOD_TYPES.map((t) => t.id)).toContain("bbq");
  });

  it("resolves every printable and guide, in both languages, and nothing is left unlisted", () => {
    for (const [p, g] of [[printEn, guidesEn], [printEs, guidesEs]] as const) {
      for (const t of FOOD_TYPES) {
        const sheet = p.sheets.find((s) => s.id === t.sheetId);
        expect(sheet, `${t.id} printable in ${p.lang}`).toBeDefined();
        expect(sheet!.ref).toBe(t.id);
        expect(sheet!.guidePath).toBe(g.guides.find((x) => x.id === t.guideIds[0])!.path);
        for (const id of t.guideIds) {
          const guide = g.guides.find((x) => x.id === id);
          expect(guide, `${id} guide in ${g.lang}`).toBeDefined();
          expect(guide!.printableId).toBe(t.sheetId);
        }
      }
      expect(p.sheets.map((s) => s.id).sort()).toEqual(FOOD_TYPES.map((t) => t.sheetId).sort());
      expect(g.guides.map((x) => x.id).sort()).toEqual(FOOD_TYPES.flatMap((t) => t.guideIds).sort());
    }
  });

  it("gives each preset a label in the app, in both languages", () => {
    for (const name of PRESET_NAMES) {
      expect(appEn.manage.preset[name]).toBeTruthy();
      expect(appEs.manage.preset[name]).toBeTruthy();
    }
  });

  it("lists the refs the Worker counts: every printable and every guide", () => {
    expect(printableRefs()).toEqual(["pie", "cookie", "chili", "bbq"]);
    expect(guideRefs()).toEqual(["guide-pie", "guide-cookie", "guide-sugar-cookies", "guide-chili", "guide-bbq"]);
  });
});

describe("a food type's publish date", () => {
  const later: FoodType = { ...FOOD_TYPES[3]!, id: "tamales", sheetId: "tamales", guideIds: ["tamales", "tamales-2"], publishDate: "2027-09-01" };
  const types = [...FOOD_TYPES, later];

  it("holds the sheets and guides back until the day, Texas time, and publishes them on it", () => {
    const held = heldBack("2027-08-31", types);
    expect([...held.sheetIds]).toEqual(["tamales"]);
    expect([...held.guideIds]).toEqual(["tamales", "tamales-2"]);
    expect(heldBack("2027-09-01", types).sheetIds.size).toBe(0);
    expect(heldBack("2027-09-02", types).guideIds.size).toBe(0);
  });

  it("holds nothing back when no food type has a date, which is today's registry", () => {
    expect(heldBack("2026-11-24").sheetIds.size).toBe(0);
    expect(FOOD_TYPES.some((t) => t.publishDate)).toBe(false);
  });

  it("rejects a date that isn't YYYY-MM-DD", () => {
    expect(() => heldBack("tomorrow")).toThrow(/YYYY-MM-DD/);
  });

  it("leaves held-back sheets and guides out of the content", () => {
    const held = { sheetIds: new Set(["bbq"]), guideIds: new Set(["bbq"]) };
    expect(liveSheets(printEn, held).sheets.map((s) => s.id)).toEqual(["pie", "cookie", "chili"]);
    expect(liveGuides(guidesEn, held).guides.map((g) => g.id)).toEqual(["pie", "cookie", "sugar-cookies", "chili"]);
    expect(liveSheets(printEn, heldBack("2026-11-24")).sheets).toHaveLength(4);
  });
});

// Gary's audience is American (SW-123): the PR #22 spelling pass missed "Colour". This keeps the
// British spellings out of everything a visitor can read. Identifiers like aria-labelledby are fine.
describe("American spelling", () => {
  const BRITISH = /colour|favourite|flavour|honour|neighbour|centre\b|\bgrey\b|licence|appetis|labelled|organis|recognis|realis|cancelled|whilst|catalogue|programme/i;
  // Identifiers, not words anyone reads: the client's i18n keys and the ARIA attribute.
  const IDENTIFIERS = /tapFavourite|voteFavourite|aria-labelledby/g;

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? sources(full) : full.endsWith(".ts") ? [full] : [];
    });
  }

  it("has no British spellings in the source", () => {
    const bad: string[] = [];
    for (const file of sources("src")) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        const m = line.replace(IDENTIFIERS, "").match(BRITISH);
        if (m) bad.push(`${file}:${i + 1} ${m[0]}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it("notices one", () => {
    expect("a rich colour").toMatch(BRITISH);
    expect("aria-labelledby".replace(IDENTIFIERS, "")).not.toMatch(BRITISH);
    expect("a rich color").not.toMatch(BRITISH);
  });
});
