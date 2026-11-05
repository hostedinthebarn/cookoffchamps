import { api } from "../api";
import type { Ctx } from "../app";
import { h, logo, mount } from "../dom";
import { m } from "../i18n";
import { renderQr } from "../qr";
import type { ManageView } from "../types";

/**
 * /e/:id/print/poster and /e/:id/print/cards, each printable on its own
 * (decision 11). The page is print-styled for US Letter; the toolbar hides on paper.
 */
export async function printView(ctx: Ctx, eventId: string, kind: string): Promise<void> {
  const data = await api<ManageView>(`/api/events/${eventId}`);
  const origin = ctx.url.origin;
  const voteUrl = `${origin}/v/${eventId}`;
  const t = m().print;
  const toolbar = h(
    "div",
    { class: "toolbar no-print" },
    h("a", { href: `/e/${eventId}`, "data-link": true }, t.back),
    " ",
    h("button", { onclick: () => window.print() }, t.print),
    h("span", { class: "muted" }, t.letter),
  );

  if (kind === "poster") {
    const qr = h("div", { class: "qr" });
    mount(
      ctx.root,
      toolbar,
      h(
        "div",
        { class: "page poster" },
        logo("poster-logo"),
        h("h1", {}, data.event.name),
        h("p", { class: "lead" }, t.voteFavourite),
        qr,
        h("p", {}, t.scanOrGo),
        h("p", { class: "url" }, `${ctx.url.host}/c/${data.event.code}`),
        h("p", {}, t.enterCode, h("strong", { class: "code" }, data.event.code)),
        // SW-59. Paper can't carry a ?ref, so poster visitors arrive as direct traffic.
        h("p", { class: "made-with" }, t.runYourOwnAt(ctx.url.host)),
      ),
    );
    await renderQr(qr, voteUrl);
    return;
  }

  // Tent cards: one per dish, "Entry N" to match the voting page (decision 9),
  // and a QR code that opens voting with this dish highlighted.
  const multi = data.categories.length > 1;
  // A pro event's cards carry the raffle ticket (rule 3), so only dishes that
  // have one, and the dish name only if the judges see it too (rule 6).
  const pro = data.event.kind === "pro";
  const entries = pro ? data.entries.filter((e) => e.ticket !== null) : data.entries;
  const cards = entries.map((e) => {
    const qr = h("div", { class: "qr small" });
    const category = data.categories.find((c) => c.id === e.categoryId)!;
    const card = h(
      "div",
      { class: "tent-card" },
      multi ? h("p", { class: "category" }, category.name) : null,
      h("p", { class: "number" }, pro ? m().common.ticket(e.ticket!) : m().common.entry(e.number)),
      !pro || data.judging.showDishNames ? h("p", { class: "dish-name" }, e.dishName) : null,
      qr,
      h("p", { class: "muted" }, t.scanToVote),
    );
    return { card, qr, url: `${voteUrl}?entry=${e.id}` };
  });
  mount(
    ctx.root,
    toolbar,
    cards.length ? h("div", { class: "page cards" }, ...cards.map((c) => c.card)) : h("p", {}, pro && data.entries.length ? t.addTicketsFirst : t.addDishesFirst),
  );
  await Promise.all(cards.map((c) => renderQr(c.qr, c.url)));
}
