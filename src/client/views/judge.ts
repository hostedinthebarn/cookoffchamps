import { api, ApiError } from "../api";
import type { Ctx } from "../app";
import { confirmDialog } from "../dialog";
import { dateEl, h, mount } from "../dom";
import { errorText, m } from "../i18n";
import type { JudgeCard, JudgeDish, JudgePage } from "../types";

/**
 * /j/:id, a judge's personal page (SW-25, rule 5). Opening the link is all a
 * judge does: no account, no email. While judging is open it's their score
 * sheet: the dishes by ticket number (rule 6), each scored 1–10 on every
 * criterion (rule 9) and locked on submit (rule 10).
 */
export async function judgeView(ctx: Ctx, judgeId: string): Promise<void> {
  const t = m().judge;
  const path = `/api/public/judges/${encodeURIComponent(judgeId)}`;
  let page: JudgePage;
  try {
    page = await api<JudgePage>(path);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
    mount(ctx.root, h("h1", {}, "Cookoff Champs"), h("p", { class: "error" }, t.badLink));
    return;
  }
  const notice = h("p", { class: "status", role: "status" });

  async function reload(): Promise<void> {
    page = await api<JudgePage>(path);
    list();
  }

  const header = () => [
    h("h1", {}, t.title(page.event.name)),
    page.event.date ? h("p", { class: "muted" }, dateEl(page.event.date)) : null,
    h("p", {}, t.hello(page.judge.name)),
  ];

  const cardFor = (dish: JudgeDish): JudgeCard | undefined => page.cards.find((c) => c.entryId === dish.entryId);

  const dishTitle = (dish: JudgeDish) =>
    [t.ticket(dish.ticket), dish.category, dish.dishName].filter(Boolean).join(" · ");

  /** The list of dishes, or what's happening instead. */
  function list(): void {
    const s = page.event.status;
    if (s === "closed" || s === "revealed") {
      mount(ctx.root, ...header(), h("p", {}, t.finished));
      return;
    }
    const again = h("button", { class: "secondary", onclick: () => void reload().catch((err) => (notice.textContent = errorText(err))) }, t.checkAgain);
    if (s === "setup") {
      mount(ctx.root, ...header(), h("p", { class: "live" }, t.waiting), h("p", { class: "muted" }, t.blind), again, notice);
      return;
    }
    const done = page.dishes.filter((d) => cardFor(d)?.locked).length;
    mount(
      ctx.root,
      ...header(),
      h("p", {}, t.guide),
      notice,
      page.dishes.length
        ? h("div", {},
            h("p", { class: "muted" }, t.scoredOf(done, page.dishes.length)),
            h("ul", { class: "dishes" }, ...page.dishes.map((dish) =>
              h("li", {}, h("button", { type: "button", class: cardFor(dish)?.locked ? "dish secondary" : "dish", onclick: () => sheet(dish) },
                h("strong", {}, dishTitle(dish)), " ", h("span", {}, cardFor(dish)?.locked ? t.scored : t.toScore))))))
        : h("p", { class: "muted" }, t.noDishes),
      again,
    );
  }

  /** One dish's scorecard: read-only once locked. */
  function sheet(dish: JudgeDish): void {
    const card = cardFor(dish);
    const locked = card?.locked === true;
    const back = h("button", { type: "button", class: "link", onclick: () => list() }, t.back);
    const selects = page.criteria.map((c) => {
      const select = h(
        "select",
        { name: c.id, required: true, disabled: locked },
        h("option", { value: "" }, t.pick),
        ...Array.from({ length: 10 }, (_, i) => h("option", { value: i + 1, selected: card?.scores[c.id] === i + 1 }, i + 1)),
      ) as HTMLSelectElement;
      return { criterion: c, select };
    });
    const comment = h("textarea", { name: "comment", maxlength: 500, rows: 3, disabled: locked }) as HTMLTextAreaElement;
    comment.value = card?.comment ?? "";
    const form = h(
      "form",
      {
        class: "scorecard",
        onsubmit: async (e: Event) => {
          e.preventDefault();
          const sure = await confirmDialog({ title: t.submitTitle(dish.ticket), body: t.submitBody, confirm: t.submit });
          if (!sure) return;
          try {
            const scores = Object.fromEntries(selects.map(({ criterion, select }) => [criterion.id, Number(select.value)]));
            await api(`${path}/scores`, { method: "POST", body: { entryId: dish.entryId, scores, comment: comment.value } });
            notice.textContent = "";
            await reload();
          } catch (err) {
            notice.textContent = errorText(err);
          }
        },
      },
      ...selects.map(({ criterion, select }) => h("label", {}, t.criterion(criterion.name, criterion.weight), select)),
      h("label", {}, t.comment, comment, h("span", { class: "muted hint" }, t.commentHint)),
      locked ? h("p", { class: "muted" }, t.locked) : h("button", { type: "submit" }, t.submit),
    );
    mount(ctx.root, back, h("h1", {}, dishTitle(dish)), h("p", {}, t.guide), notice, form);
  }

  list();
}
