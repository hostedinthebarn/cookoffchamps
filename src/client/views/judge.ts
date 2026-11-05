import { api, ApiError } from "../api";
import type { Ctx } from "../app";
import { dateEl, h, mount } from "../dom";
import { m } from "../i18n";
import type { JudgePage } from "../types";

/**
 * /j/:id, a judge's personal page (SW-25, rule 5). Opening the link is all a
 * judge does: no account, no email. Scoring arrives with the score sheet; for
 * now the page says who they are, which event, and what happens next.
 */
export async function judgeView(ctx: Ctx, judgeId: string): Promise<void> {
  const t = m().judge;
  let page: JudgePage;
  try {
    page = await api<JudgePage>(`/api/public/judges/${encodeURIComponent(judgeId)}`);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
    mount(ctx.root, h("h1", {}, "Cookoff Champs"), h("p", { class: "error" }, t.badLink));
    return;
  }
  const done = page.event.status === "closed" || page.event.status === "revealed";
  mount(
    ctx.root,
    h("h1", {}, t.title(page.event.name)),
    page.event.date ? h("p", { class: "muted" }, dateEl(page.event.date)) : null,
    h("p", {}, t.hello(page.judge.name)),
    done ? h("p", {}, t.finished) : h("div", {}, h("p", { class: "live" }, t.waiting), h("p", { class: "muted" }, t.blind)),
  );
}
