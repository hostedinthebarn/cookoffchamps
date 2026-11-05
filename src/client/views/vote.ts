import { api, ApiError } from "../api";
import type { Ctx } from "../app";
import { dateEl, h, madeWith, mount, photoUrl } from "../dom";
import { errorText, m } from "../i18n";
import { getTurnstileToken } from "../turnstile";
import { formatScore } from "../../shared/scoring";
import type { PublicCategory, PublicEntry, PublicView } from "../types";

/** A dish is its raffle ticket in a pro event (rule 3), else "Entry N". */
function dishLabel(entry: PublicEntry): string {
  return entry.ticket === undefined ? m().common.entry(entry.number) : m().common.ticket(entry.ticket);
}

function dishCard(entry: PublicEntry, extra: Node[]): HTMLElement {
  const label = dishLabel(entry);
  return h(
    "div",
    { class: "dish", "data-entry": entry.id },
    entry.photoKey ? h("img", { src: photoUrl(entry.photoKey), alt: entry.dishName || label, loading: "lazy" }) : h("div", { class: "no-photo" }, "🍲"),
    h("p", { class: "number" }, label),
    // A pro event hides the dish name from guests until the reveal, unless the
    // organizer shows it to the judges too (rule 6).
    entry.dishName ? h("p", { class: "dish-name" }, entry.dishName) : null,
    ...extra,
  );
}

/** Results, once revealed (decision 13): placings with cooks, counts and photos. */
function results(view: PublicView): Node[] {
  const t = m().common;
  const multi = view.categories.length > 1;
  return view.categories.map((c) =>
    h(
      "section",
      { class: "results" },
      multi ? h("h2", {}, c.name) : null,
      h("ol", { class: "placings" }, ...c.placings!.map((p) =>
        h(
          "li",
          { "data-place": p.place },
          h("p", { class: "place" }, p.place === 1 && p.entryIds.length > 1 ? t.coChampions : t.place(p.place, p.entryIds.length > 1)),
          ...p.entryIds.map((id) => {
            const e = c.entries.find((x) => x.id === id)!;
            return dishCard(e, [h("p", { class: "cook" }, t.by(e.cookName!)), h("p", { class: "votes" }, t.votes(e.votes!))]);
          }),
        ),
      )),
    ),
  );
}

/** The per-criterion breakdown for a judged dish (rule 19), folded away under its score. */
function breakdown(view: PublicView, entry: PublicEntry): HTMLElement {
  return h(
    "details",
    { class: "breakdown" },
    h("summary", {}, m().vote.breakdown),
    h("ul", {}, ...view.criteria!.map((c) => h("li", {}, `${c.name}: ${formatScore(entry.byCriterion![c.id]!)}`))),
  );
}

/** A pro event's results (rule 19): Grand Champion, then each category's People's Choice and judged places. */
function proResults(view: PublicView): Node[] {
  const t = m().common;
  const multi = view.categories.length > 1;
  const find = (id: string) => view.categories.flatMap((c) => c.entries).find((e) => e.id === id)!;
  const nodes: Node[] = [];
  if (view.grandChampion?.length) {
    nodes.push(h(
      "section",
      { class: "results grand" },
      h("h2", {}, t.grandChampion),
      ...view.grandChampion.map((g) => h("p", { class: "cook" }, g.cook, " ", h("span", { class: "muted" }, t.grandTotal(formatScore(g.total))))),
    ));
  }
  for (const c of view.categories) {
    const placings = c.scorePlacings!.filter((p) => p.score !== null);
    nodes.push(h(
      "section",
      { class: "results" },
      multi ? h("h2", {}, c.name) : null,
      c.peoplesChoice ? peoplesChoice(c) : null,
      h("ol", { class: "placings" }, ...placings.map((p) =>
        h(
          "li",
          { "data-place": p.place },
          h("p", { class: "place" }, p.place === 1 && p.entryIds.length > 1 ? t.coChampions : t.place(p.place, p.entryIds.length > 1)),
          ...p.entryIds.map((id) => {
            const e = find(id);
            return dishCard(e, [h("p", { class: "cook" }, t.by(e.cookName!)), h("p", { class: "votes" }, t.score(formatScore(e.score!))), breakdown(view, e)]);
          }),
        ),
      )),
    ));
  }
  return nodes;
}

function peoplesChoice(c: PublicCategory): HTMLElement {
  const t = m().common;
  return h(
    "div",
    { class: "peoples-choice" },
    h("p", { class: "place" }, t.peoplesChoice),
    ...c.peoplesChoice!.entryIds.map((id) => {
      const e = c.entries.find((x) => x.id === id)!;
      return dishCard(e, [h("p", { class: "cook" }, t.by(e.cookName!)), h("p", { class: "votes" }, t.votes(e.votes!))]);
    }),
  );
}

/** A cook types their ticket to read the judges' comments on their dish (rule 14). */
function commentLookup(eventId: string): HTMLElement {
  const t = m().vote;
  const input = h("input", { name: "ticket", required: true, maxlength: 12, autocomplete: "off" }) as HTMLInputElement;
  const out = h("div", { class: "comments", "aria-live": "polite" });
  const form = h(
    "form",
    {
      class: "comment-lookup",
      onsubmit: async (e: Event) => {
        e.preventDefault();
        try {
          const res = await api<{ ticket: string; comments: string[] }>(
            `/api/public/events/${eventId}/comments/${encodeURIComponent(input.value.trim())}`,
          );
          out.replaceChildren(
            res.comments.length
              ? h("ul", {}, ...res.comments.map((c) => h("li", {}, c)))
              : h("p", { class: "muted" }, t.noComments),
          );
        } catch (err) {
          out.replaceChildren(h("p", { class: "error" }, errorText(err)));
        }
      },
    },
    h("label", {}, t.commentsTicket, input),
    h("button", { type: "submit" }, t.commentsShow),
  );
  return h("section", { class: "card" }, h("h2", {}, t.commentsTitle), h("p", { class: "muted" }, t.commentsHint), form, out);
}

/** /v/:id. What the QR code opens: voting, then "closed", then the results. */
export async function voteView(ctx: Ctx, eventId: string): Promise<void> {
  const view = await api<PublicView>(`/api/public/events/${eventId}`);
  const { event } = view;
  const highlight = ctx.url.searchParams.get("entry");
  // Fixed near the bottom of the screen, so the guest sees it wherever they scrolled.
  const notice = h("p", { class: "status toast", role: "status" });
  const turnstileBox = h("div", { class: "turnstile" });
  const header = [h("h1", {}, event.name), event.date ? h("p", { class: "muted event-date" }, dateEl(event.date)) : null];

  const pro = event.kind === "pro";
  if (event.status === "revealed") {
    if (!pro) mount(ctx.root, ...header, ...results(view), madeWith("results"));
    else mount(ctx.root, ...header, ...proResults(view), event.cookComments ? commentLookup(eventId) : null, madeWith("results"));
    return;
  }

  const t = m();
  // In a pro event, guests vote only for People's Choice, and only if it's on (rule 2).
  const voting = !pro || event.peoplesChoice === true;
  const open = event.status === "open" && voting;
  let intro = event.status === "setup" ? t.vote.notOpenYet : open ? t.vote.tapFavourite : t.vote.closedSoon;
  if (!voting && event.status !== "closed") intro = t.vote.judgesOnly;

  async function castVote(categoryId: string, entryId: string, card: HTMLElement): Promise<void> {
    // Instant feedback on the card that was tapped, before the round trip.
    card.classList.add("pending");
    card.setAttribute("aria-busy", "true");
    notice.textContent = t.vote.voting;
    try {
      const token = await getTurnstileToken(view.turnstileSiteKey, turnstileBox);
      await api(`/api/public/events/${eventId}/votes`, { method: "POST", body: { categoryId, entryId, turnstileToken: token } });
      view.myVotes[categoryId] = entryId;
      notice.textContent = t.vote.saved;
      draw();
    } catch (err) {
      card.classList.remove("pending");
      card.removeAttribute("aria-busy");
      if (err instanceof ApiError && err.status === 409) {
        notice.textContent = t.vote.hasClosed;
      } else {
        notice.textContent = errorText(err);
      }
    }
  }

  function draw(): void {
    const multi = view.categories.length > 1;
    mount(
      ctx.root,
      ...header,
      h("p", { class: open ? "live" : "muted" }, intro),
      notice,
      ...view.categories.map((c) =>
        h(
          "section",
          {},
          multi ? h("h2", {}, c.name) : null,
          c.entries.length ? null : h("p", { class: "muted" }, t.common.noDishes),
          h("div", { class: "dishes" }, ...c.entries.map((e) => {
            const mine = view.myVotes[c.id] === e.id;
            const card = dishCard(e, mine ? [h("p", { class: "your-vote" }, t.vote.yourVote)] : []);
            if (mine) card.classList.add("chosen");
            if (e.id === highlight) card.classList.add("highlight");
            if (open) {
              card.setAttribute("role", "button");
              card.setAttribute("tabindex", "0");
              card.setAttribute("aria-pressed", String(mine));
              card.setAttribute("aria-label", e.ticket === undefined ? t.vote.entryAria(e.number, e.dishName) : t.vote.ticketAria(e.ticket, e.dishName));
              card.addEventListener("click", () => void castVote(c.id, e.id, card));
              // A div with role=button needs the keys a real button gets for free.
              card.addEventListener("keydown", (ev) => {
                if (ev.key !== "Enter" && ev.key !== " ") return;
                ev.preventDefault();
                void castVote(c.id, e.id, card);
              });
            }
            return card;
          })),
        ),
      ),
      turnstileBox,
    );
    // Arriving from a tent card's QR code scrolls to that dish.
    ctx.root.querySelector(".highlight")?.scrollIntoView?.({ block: "center" });
  }

  draw();
}
