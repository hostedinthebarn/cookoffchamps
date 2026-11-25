// The food types the site and the app know about (SW-123). Adding one is a data
// change: an entry here, plus its printable (src/printables) and guide (src/guides)
// in both languages. The judging presets, the ?ref= names the Worker counts, the
// organizer's preset picker and the publish dates all read from this list, and
// test/shared/foodTypes.test.ts checks that every id here resolves to real content.

/** The judging presets (src/worker/judging.ts holds each one's criteria). */
export const PRESET_NAMES = ["chili", "bbq", "general"] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

export interface FoodType {
  /** Also the printable's id and its ?ref=, e.g. "bbq". */
  id: string;
  label: { en: string; es: string };
  /** A new preset only when the criteria really differ from "general". */
  preset: PresetName;
  /** The printable (src/printables), by sheet id. */
  sheetId: string;
  /** Guides (src/guides) that belong to this food, by guide id. The first is the sheet's own guide. */
  guideIds: string[];
  /** The Pinterest board its pins go on (marketing/social/accounts.md). */
  board: string;
  /** When people search for it: the push goes live a month or two before. */
  season: string;
  /**
   * YYYY-MM-DD in Texas time. Until that day the build leaves out the printable, its PDF, the
   * guides and their sitemap entries. Left out, the pages are live as soon as they are deployed.
   */
  publishDate?: string;
}

export const FOOD_TYPES: FoodType[] = [
  {
    id: "pie",
    label: { en: "Pie", es: "Pay" },
    preset: "general",
    sheetId: "pie",
    guideIds: ["pie"],
    board: "Pie contest printables",
    season: "Thanksgiving: October to November",
  },
  {
    id: "cookie",
    label: { en: "Cookie", es: "Galletas" },
    preset: "general",
    sheetId: "cookie",
    guideIds: ["cookie", "sugar-cookies"],
    board: "Cookie exchange voting",
    season: "Christmas: November to December",
  },
  {
    id: "chili",
    label: { en: "Chili", es: "Chili" },
    preset: "chili",
    sheetId: "chili",
    guideIds: ["chili"],
    board: "Chili cook-off ideas",
    season: "Fall to Super Bowl: October to February",
  },
  {
    id: "bbq",
    label: { en: "BBQ", es: "Barbacoa" },
    preset: "bbq",
    sheetId: "bbq",
    guideIds: ["bbq"],
    board: "BBQ cook-off ideas",
    season: "Memorial Day to July 4th: push live by May",
  },
];

/** The ?ref= each printable's QR code carries: the food type's id. */
export function printableRefs(types: FoodType[] = FOOD_TYPES): string[] {
  return types.map((t) => t.id);
}

/** The ?ref= each guide's closing link carries: guide-<guide id>. */
export function guideRefs(types: FoodType[] = FOOD_TYPES): string[] {
  return types.flatMap((t) => t.guideIds.map((g) => `guide-${g}`));
}

export interface HeldBack {
  sheetIds: Set<string>;
  guideIds: Set<string>;
}

/** The sheets and guides whose publishDate is still ahead of `today` (YYYY-MM-DD, Texas time). */
export function heldBack(today: string, types: FoodType[] = FOOD_TYPES): HeldBack {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`not a YYYY-MM-DD date: "${today}"`);
  const waiting = types.filter((t) => t.publishDate !== undefined && t.publishDate > today);
  return { sheetIds: new Set(waiting.map((t) => t.sheetId)), guideIds: new Set(waiting.flatMap((t) => t.guideIds)) };
}

/** The printables content with the held-back sheets left out. */
export function liveSheets<C extends { sheets: { id: string }[] }>(content: C, held: HeldBack): C {
  return { ...content, sheets: content.sheets.filter((s) => !held.sheetIds.has(s.id)) };
}

/** The guides content with the held-back guides left out. */
export function liveGuides<C extends { guides: { id: string }[] }>(content: C, held: HeldBack): C {
  return { ...content, guides: content.guides.filter((g) => !held.guideIds.has(g.id)) };
}
