import { revealSequence, type RevealStep } from "../../shared/ranking";
import { formatScore, type GrandChampion } from "../../shared/scoring";
import { api } from "../api";
import type { Ctx } from "../app";
import { dateEl, h, logo, madeWith, mount, photoUrl } from "../dom";
import { m } from "../i18n";
import type { ManageView, Totals } from "../types";

export interface Slide {
  category: string | null; // null for a single contest (decision 12)
  step: RevealStep;
  /** Pro events (SW-25): an award rather than a judged place. */
  award?: "peoples" | "grand";
  /** Pro events: the judged score, shown where a family slide shows votes. */
  score?: number;
  /** The Grand Champion slide names cooks, not dishes. */
  cooks?: GrandChampion[];
}

/** Every click of the reveal, category by category, 3rd → 1st within each (decisions 7, 8, 12). */
export function buildSlides(data: ManageView, totals: Totals["totals"]): Slide[] {
  const multi = data.categories.length > 1;
  return data.categories.flatMap((c) =>
    revealSequence(totals.filter((t) => t.categoryId === c.id)).map((step) => ({ category: multi ? c.name : null, step })),
  );
}

/**
 * A pro event's reveal (rule 17): People's Choice first, then each category
 * 3rd, 2nd, 1st by the judges' scores, then the Grand Champion. A dish no judge
 * scored isn't revealed, and an award nobody won has no slide.
 */
export function buildProSlides(data: ManageView, judged: NonNullable<Totals["judged"]>): Slide[] {
  const multi = data.categories.length > 1;
  const slides: Slide[] = [];
  for (const c of data.categories) {
    const top = judged.peoplesChoice?.[c.id];
    if (top) {
      slides.push({ category: multi ? c.name : null, award: "peoples", step: { ...top, coChampions: false } });
    }
  }
  for (const c of data.categories) {
    const podium = (judged.placings[c.id] ?? []).filter((p) => p.score !== null && p.place <= 3).reverse();
    for (const p of podium) {
      const step = { place: p.place, entryIds: p.entryIds, votes: 0, coChampions: p.place === 1 && p.entryIds.length > 1 };
      slides.push({ category: multi ? c.name : null, step, score: p.score! });
    }
  }
  const grand = judged.grandChampion;
  if (grand?.length) {
    slides.push({ category: null, award: "grand", step: { place: 1, entryIds: [], votes: 0, coChampions: false }, cooks: grand });
  }
  return slides;
}

/** The heading on a slide: the award's name, or the place. */
export function slideLabel(slide: Slide): string {
  if (slide.award === "peoples") return m().common.peoplesChoice;
  if (slide.award === "grand") return m().common.grandChampion;
  return placeLabel(slide.step);
}

export function placeLabel(step: RevealStep): string {
  if (step.coChampions) return m().common.coChampions;
  if (step.place === 1) return m().reveal.champion;
  return m().common.place(step.place, step.entryIds.length > 1);
}

const CONFETTI_COLOURS = ["var(--gold)", "var(--accent)", "var(--good)", "var(--silver)", "var(--bronze)", "var(--confetti-extra)"];

/**
 * A one-off shower of confetti for the champion. The pieces are spread by a
 * fixed formula rather than at random, so every reveal (and every test) looks
 * the same. CSS drops them once and hides them under prefers-reduced-motion.
 */
export function confetti(count = 72): HTMLElement {
  const box = h("div", { class: "confetti", "aria-hidden": "true" });
  for (let i = 0; i < count; i++) {
    const style = [
      `--x:${(i * 37) % 100}%`,
      `--d:${((i * 53) % 140) / 100}s`,
      `--t:${3 + ((i * 29) % 25) / 10}s`,
      `--w:${8 + ((i * 7) % 8)}px`,
      `--r:${360 + ((i * 97) % 540)}deg`,
      `--sway:${((i * 61) % 160) - 80}px`,
      `--c:${CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]}`,
    ].join(";");
    box.append(h("span", { style }));
  }
  return box;
}

/** /e/:id/reveal, for a phone or a TV. Click, tap, space or → for the next place. */
export async function revealView(ctx: Ctx, eventId: string): Promise<() => void> {
  const data = await api<ManageView>(`/api/events/${eventId}`);
  const t = m();
  const back = h("p", { class: "reveal-back" }, h("a", { href: `/e/${eventId}`, "data-link": true }, t.reveal.back));

  if (data.event.status !== "closed" && data.event.status !== "revealed") {
    mount(ctx.root, back, h("h1", {}, t.reveal.notYet), h("p", {}, t.reveal.closeFirst));
    return () => {};
  }

  const { totals, judged } = await api<Totals>(`/api/events/${eventId}/totals`);
  const pro = data.event.kind === "pro";
  const slides = judged ? buildProSlides(data, judged) : buildSlides(data, totals);
  let shown = -1; // -1 is the title card
  // aria-live, so a screen reader announces each place as it lands.
  const stage = h("div", { class: "reveal", tabindex: "0", "aria-live": "polite" });

  function draw(): void {
    if (shown < 0) {
      mount(
        stage,
        logo(),
        h("h1", {}, data.event.name),
        data.event.date ? dateEl(data.event.date, "event-date") : null,
        h("p", { class: "hint" }, slides.length ? (pro ? t.reveal.tapToStart : t.reveal.tapFirst) : t.reveal.nothing),
      );
      return;
    }
    const slide = slides[shown]!;
    const { category, step } = slide;
    stage.dataset.place = String(step.place);
    // Confetti for a champion, not for People's Choice, which comes first.
    const champion = step.place === 1 && slide.award !== "peoples";
    mount(
      stage,
      champion ? h("div", { class: "sunburst", "aria-hidden": "true" }) : null,
      champion ? confetti() : null,
      category ? h("p", { class: "category" }, category) : null,
      // The medal repeats the place for the eye; the label below says it for everyone.
      h("div", { class: "medal", "aria-hidden": "true" }, slide.award ? "★" : String(step.place)),
      h("p", { class: "place" }, slideLabel(slide)),
      h("div", { class: "winners" }, ...(slide.cooks ?? []).map((c) =>
        h("div", { class: "winner" }, h("p", { class: "cook" }, c.cook), h("p", { class: "votes" }, t.common.grandTotal(formatScore(c.total)))),
      ), ...step.entryIds.map((id) => {
        const e = data.entries.find((x) => x.id === id)!;
        return h(
          "div",
          { class: "winner" },
          e.photoKey ? h("img", { src: photoUrl(e.photoKey), alt: e.dishName }) : null,
          pro ? h("p", { class: "number" }, t.common.ticket(e.ticket!)) : null,
          e.dishName ? h("p", { class: "dish-name" }, e.dishName) : null,
          // The cook's name is seen here for the first time (decision 9).
          h("p", { class: "cook-label" }, t.reveal.cookedBy),
          h("p", { class: "cook" }, e.cookName),
          h("p", { class: "votes" }, slide.score === undefined ? t.common.votes(step.votes) : t.common.score(formatScore(slide.score))),
        );
      })),
      h("p", { class: "hint" }, shown < slides.length - 1 ? t.reveal.tapNext : t.reveal.congrats),
      shown === slides.length - 1 ? madeWith("reveal") : null,
    );
  }

  async function next(): Promise<void> {
    if (shown >= slides.length - 1) return;
    shown += 1;
    draw();
    // Once the last winner is on screen, the results go public (decision 13).
    if (shown === slides.length - 1 && data.event.status === "closed") {
      await api(`/api/events/${eventId}/status`, { method: "POST", body: { status: "revealed" } });
      data.event.status = "revealed";
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      void next();
    }
  };
  // A tap on the "run your own" link follows it rather than advancing the reveal.
  stage.addEventListener("click", (e) => {
    if (!(e.target as Element).closest("a")) void next();
  });
  document.addEventListener("keydown", onKey);
  mount(ctx.root, back, stage);
  // Not focused on load: the keys work from anywhere on the page, and a focus
  // ring around the whole stage would look like a fault on a TV.
  draw();
  return () => document.removeEventListener("keydown", onKey);
}
