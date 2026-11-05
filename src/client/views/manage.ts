import { api } from "../api";
import type { Ctx } from "../app";
import { chooseDialog, confirmDialog, type ConfirmOptions } from "../dialog";
import { h, mount, photoUrl } from "../dom";
import { errorText, lang, m } from "../i18n";
import { resizePhoto } from "../photo";
import { renderQr } from "../qr";
import { formatScore } from "../../shared/scoring";
import type { ManageEntry, ManageView, Totals } from "../types";
import { chosenKind, kindChoice } from "./home";

export const POLL_MS = 10_000;
export const PEEK_MS = 20_000;

/** Builds the entry form body, shrinking the photo first (decision 10). */
export async function entryForm(fields: {
  cookName?: string;
  dishName?: string;
  ticket?: string;
  photo?: File | null;
}): Promise<FormData> {
  const form = new FormData();
  if (fields.cookName !== undefined) form.set("cookName", fields.cookName);
  if (fields.dishName !== undefined) form.set("dishName", fields.dishName);
  if (fields.ticket !== undefined) form.set("ticket", fields.ticket);
  if (fields.photo) form.set("photo", await resizePhoto(fields.photo), "dish.jpg");
  return form;
}

const STEPS = ["setup", "open", "closed", "revealed"];

/** The weights a criterion can have: ×0.5 to ×5, in halves (rule 8). */
export const WEIGHTS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

/** At most this many "hasn't scored" lines in the close warning; the rest are counted. */
export const MISSING_SHOWN = 5;

/** Where the event is in its life: set up → voting → closed → results. */
export function stepper(status: string): HTMLElement {
  const at = STEPS.indexOf(status);
  const labels = m().manage.steps;
  return h(
    "ol",
    { class: "stepper" },
    ...STEPS.map((step, i) =>
      h("li", { class: i < at ? "done" : undefined, "aria-current": i === at ? "step" : undefined }, labels[step]),
    ),
  );
}

/** The organizer's screen: set up, run voting, peek, and get to print and reveal. */
export async function manageView(ctx: Ctx, eventId: string): Promise<() => void> {
  let data = await api<ManageView>(`/api/events/${eventId}`);
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let peekTimer: ReturnType<typeof setTimeout> | undefined;
  const notice = h("p", { class: "status", role: "status" });
  // Read once per view: a language switch redraws the whole view.
  const t = m().manage;
  const common = m().common;
  const isPro = () => data.event.kind === "pro";

  /** How a dish is named to the organizer: its ticket in a pro event (rule 3), else "Entry N". */
  function label(entry: ManageEntry): string {
    if (!isPro()) return common.entry(entry.number);
    return entry.ticket ? t.ticket(entry.ticket) : t.noTicket;
  }

  async function reload(): Promise<void> {
    data = await api<ManageView>(`/api/events/${eventId}`);
    draw();
  }

  /** Runs an action, reloading after; failures show in the notice line. */
  async function act(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
      notice.textContent = "";
      await reload();
    } catch (err) {
      notice.textContent = errorText(err);
    }
  }

  function setStatus(status: string) {
    return act(() => api(`/api/events/${eventId}/status`, { method: "POST", body: { status } }));
  }

  /** setStatus, but only after the organizer confirms (SW-23). */
  async function setStatusIfSure(status: string, ask: ConfirmOptions): Promise<void> {
    if (await confirmDialog(ask)) await setStatus(status);
  }

  async function startReveal(): Promise<void> {
    const sure = await confirmDialog({ title: t.revealTitle, body: t.revealBody, confirm: t.revealConfirm });
    if (sure) ctx.navigate(`/e/${eventId}/reveal`);
  }

  // Closing and revealing can both be undone for a family event (decision 17),
  // so neither is a trap; the dialogs stop them happening by accident.
  function statusControls(): HTMLElement {
    const s = data.event.status;
    const box = h("section", { class: "card controls", "aria-label": t.progress }, stepper(s));
    if (s === "setup") {
      box.append(h("p", {}, t.setupHint), h("button", { onclick: () => setStatus("open") }, t.openVoting));
    } else if (s === "open") {
      const missing = isPro() ? missingScores() : [];
      const body = missing.length
        ? `${t.closeBody} ${t.missing(missing.slice(0, MISSING_SHOWN).join("; "), Math.max(0, missing.length - MISSING_SHOWN))}`
        : t.closeBody;
      const close = () => setStatusIfSure("closed", { title: t.closeTitle, body, confirm: t.closeVoting });
      box.append(h("p", { class: "live" }, t.isOpen), h("button", { onclick: close }, t.closeVoting));
    } else if (s === "closed") {
      box.append(
        h("p", {}, t.closedHint),
        h("button", { onclick: () => void startReveal() }, t.startReveal),
        h("button", { class: "secondary", onclick: () => setStatus("open") }, t.reopen),
        h("p", { class: "aside" }, t.reopenAside),
      );
    } else {
      const undo = () => setStatusIfSure("closed", { title: t.undoTitle, body: t.undoBody, confirm: t.undo });
      box.append(
        h("p", {}, t.resultsOut),
        h("a", { class: "button", href: `/v/${eventId}`, "data-link": true }, t.seeResults),
        h("button", { class: "secondary", onclick: undo }, t.undo),
      );
    }
    return box;
  }

  // The count, never the standings: it shows up ballot stuffing against the
  // number of guests (decision 5).
  const countEl = h("p", { class: "big", "data-testid": "votes-cast" });
  const perCategory = h("ul", { class: "per-category" });

  function drawCounts(): void {
    countEl.textContent = String(data.votesCast.reduce((n, c) => n + c.votes, 0));
    perCategory.hidden = data.categories.length < 2;
    perCategory.replaceChildren(
      ...data.categories.map((c) => h("li", {}, `${c.name}: ${data.votesCast.find((v) => v.categoryId === c.id)?.votes ?? 0}`)),
    );
  }

  function votesCast(): HTMLElement {
    drawCounts();
    return h("section", { class: "card" }, h("h2", {}, t.votesCast), countEl, perCategory, peekSection());
  }

  /**
   * The live poll. It only touches the counts, so an open peek or a half-typed
   * entry survives; a status change (say, a co-organizer closed voting) redraws.
   */
  async function poll(): Promise<void> {
    const before = data.event.status;
    data = await api<ManageView>(`/api/events/${eventId}`);
    if (data.event.status === before) drawCounts();
    else draw();
  }

  function peekSection(): HTMLElement {
    // Behind a deliberate tap, and it hides itself again (decision 15).
    const panel = h("div", { class: "peek", hidden: true });
    const button = h("button", { class: "secondary" }, t.peek) as HTMLButtonElement;
    button.addEventListener("click", async () => {
      if (!panel.hidden) {
        panel.hidden = true;
        button.textContent = t.peek;
        return;
      }
      const { totals, judged } = await api<Totals>(`/api/events/${eventId}/totals`);
      panel.replaceChildren(
        ...data.categories.map((c) => {
          if (judged) return judgedPeek(c.id, c.name, judged);
          const rows = totals.filter((t) => t.categoryId === c.id).sort((a, b) => b.votes - a.votes);
          return h(
            "div",
            {},
            data.categories.length > 1 ? h("h3", {}, c.name) : null,
            h("ol", {}, ...rows.map((row) => {
              const entry = data.entries.find((e) => e.id === row.entryId)!;
              return h("li", {}, t.peekRow(entry.number, entry.dishName, entry.cookName, row.votes));
            })),
          );
        }),
      );
      panel.hidden = false;
      button.textContent = t.hidePeek;
      clearTimeout(peekTimer);
      peekTimer = setTimeout(() => {
        panel.hidden = true;
        button.textContent = t.peek;
      }, PEEK_MS);
    });
    return h("div", {}, button, panel);
  }

  /** A pro event's standings by judges' score (rules 11–13), for the peek. */
  function judgedPeek(categoryId: string, name: string, judged: NonNullable<Totals["judged"]>): HTMLElement {
    const rows = (judged.placings[categoryId] ?? []).flatMap((p) => p.entryIds);
    return h(
      "div",
      {},
      data.categories.length > 1 ? h("h3", {}, name) : null,
      h("ol", {}, ...rows.map((entryId) => {
        const entry = data.entries.find((e) => e.id === entryId)!;
        const result = judged.scores.find((s) => s.entryId === entryId)!;
        return h("li", {}, result.score === null
          ? t.notScored(label(entry), entry.cookName)
          : t.judgedRow(label(entry), entry.dishName, entry.cookName, formatScore(result.score), result.counted));
      })),
    );
  }

  /** The dishes judges can score: turned in, with a ticket. */
  const scorable = () => data.entries.filter((e) => e.ticket !== null);

  /** "Pat hasn't scored ticket 214", for every judge and dish without a submitted card (rule 13). */
  function missingScores(): string[] {
    const lines: string[] = [];
    for (const judge of data.judges) {
      for (const entry of scorable()) {
        if (!data.judging.scored.some((s) => s.judgeId === judge.id && s.entryId === entry.id)) {
          lines.push(t.hasntScored(judge.name, entry.ticket!));
        }
      }
    }
    return lines;
  }

  function entryRow(entry: ManageEntry, editable: boolean): HTMLElement {
    const li = h(
      "li",
      { class: "entry" },
      entry.photoKey ? h("img", { src: photoUrl(entry.photoKey), alt: "", class: "thumb" }) : h("span", { class: "thumb none" }, t.noPhoto),
      h("span", {}, h("strong", {}, label(entry)), entry.dishName ? ` ${entry.dishName} ` : " ", h("span", { class: "muted" }, common.by(entry.cookName))),
    );
    if (editable) {
      li.append(
        h("button", { class: "link", onclick: () => li.replaceWith(editEntryForm(entry)) }, t.edit),
        h("button", {
          class: "link danger",
          onclick: () => {
            if (confirm(t.deleteEntry(entry.number, entry.dishName))) void act(() => api(`/api/entries/${entry.id}`, { method: "DELETE" }));
          },
        }, t.delete),
      );
    }
    return li;
  }

  /** The ticket-number field of a pro event's entry forms (rule 3), with its hint. */
  function ticketField(value = ""): { input: HTMLInputElement; field: HTMLElement } {
    const input = h("input", { name: "ticket", value, maxlength: 12, inputmode: "numeric", autocomplete: "off" }) as HTMLInputElement;
    return { input, field: h("label", {}, t.ticketLabel, input, h("span", { class: "muted hint" }, t.ticketHint)) };
  }

  function editEntryForm(entry: ManageEntry): HTMLElement {
    const cook = h("input", { name: "cookName", value: entry.cookName, required: true }) as HTMLInputElement;
    const dish = h("input", { name: "dishName", value: entry.dishName, required: !isPro() }) as HTMLInputElement;
    const ticket = isPro() ? ticketField(entry.ticket ?? "") : null;
    const photo = h("input", { name: "photo", type: "file", accept: "image/*" }) as HTMLInputElement;
    return h(
      "form",
      {
        class: "entry-form",
        onsubmit: (e: Event) => {
          e.preventDefault();
          void act(async () =>
            api(`/api/entries/${entry.id}`, {
              method: "PATCH",
              body: await entryForm({ cookName: cook.value, dishName: dish.value, ticket: ticket?.input.value, photo: photo.files?.[0] ?? null }),
            }),
          );
        },
      },
      h("label", {}, common.cookLabel, cook),
      h("label", {}, isPro() ? t.dishIfKnown : common.dishLabel, dish),
      ticket?.field ?? null,
      h("label", {}, t.newPhoto, photo),
      h("button", { type: "submit" }, common.save),
      h("button", { type: "button", class: "link", onclick: () => draw() }, common.cancel),
    );
  }

  function addEntryForm(categoryId: string): HTMLElement {
    const cook = h("input", { name: "cookName", required: true, maxlength: 80 }) as HTMLInputElement;
    // A pro event lists its cooks before turn-in, dish and ticket to follow (rule 4).
    const dish = h("input", { name: "dishName", required: !isPro(), maxlength: 80 }) as HTMLInputElement;
    const ticket = isPro() ? ticketField() : null;
    // capture opens the camera straight away on a phone.
    const photo = h("input", { name: "photo", type: "file", accept: "image/*", capture: "environment" }) as HTMLInputElement;
    return h(
      "form",
      {
        class: "entry-form",
        onsubmit: (e: Event) => {
          e.preventDefault();
          notice.textContent = t.adding;
          void act(async () =>
            api(`/api/categories/${categoryId}/entries`, {
              method: "POST",
              body: await entryForm({ cookName: cook.value, dishName: dish.value, ticket: ticket?.input.value, photo: photo.files?.[0] ?? null }),
            }),
          );
        },
      },
      h("h3", {}, isPro() ? t.addCook : t.addDish),
      h("label", {}, common.cookLabel, cook),
      h("label", {}, isPro() ? t.dishIfKnown : common.dishLabel, dish),
      ticket?.field ?? null,
      h("label", {}, t.photo, photo),
      h("button", { type: "submit" }, t.add),
    );
  }

  function categoriesSection(): HTMLElement {
    const editable = data.event.status === "setup" || data.event.status === "open";
    // A single contest shows no category headings at all (decision 12).
    const multi = data.categories.length > 1;
    const section = h("section", { class: "card" }, h("h2", {}, isPro() ? t.cooks : t.dishes));
    for (const c of data.categories) {
      const entries = data.entries.filter((e) => e.categoryId === c.id);
      const block = h("div", { class: "category" });
      if (multi) {
        block.append(h("h3", { class: "category-name" }, c.name));
        if (editable) {
          block.append(
            h("span", {},
                h("button", {
                  class: "link",
                  onclick: () => {
                    const name = prompt(t.renameCategory, c.name);
                    if (name) void act(() => api(`/api/categories/${c.id}`, { method: "PATCH", body: { name } }));
                  },
                }, t.rename),
                h("button", {
                  class: "link danger",
                  onclick: () => {
                    if (confirm(t.deleteCategoryConfirm(c.name))) void act(() => api(`/api/categories/${c.id}`, { method: "DELETE" }));
                  },
                }, t.deleteCategory)),
          );
        }
      }
      const none = isPro() ? t.noCooks : common.noDishes;
      block.append(entries.length ? h("ul", { class: "entries" }, ...entries.map((e) => entryRow(e, editable))) : h("p", { class: "muted" }, none));
      if (editable) block.append(addEntryForm(c.id));
      section.append(block);
    }
    if (editable) {
      section.append(
        h("button", {
          class: "link",
          onclick: () => {
            const name = prompt(multi ? t.nameCategory : t.nameFirstCategory, t.categoryExample);
            if (name) void act(() => api(`/api/events/${eventId}/categories`, { method: "POST", body: { name } }));
          },
        }, multi ? t.addCategory : t.splitCategories),
      );
    }
    return section;
  }

  /** A pro event's judges (rule 5): each has a personal link and QR code, and can be revoked. */
  function judgesSection(): HTMLElement {
    const editable = data.event.status === "setup" || data.event.status === "open";
    const name = h("input", { name: "judgeName", required: true, maxlength: 60 }) as HTMLInputElement;
    const row = (judge: { id: string; name: string }) => {
      const link = `${location.origin}/j/${judge.id}`;
      const qr = h("div", { class: "qr" });
      const details = h("details", {}, h("summary", {}, t.showQr), qr);
      // Drawn on first open: most judges are sent the link, not shown the code.
      details.addEventListener("toggle", () => {
        if ((details as HTMLDetailsElement).open && !qr.firstChild) void renderQr(qr, link);
      });
      return h(
        "li",
        { class: "judge" },
        h("strong", {}, judge.name),
        h("p", { class: "muted" }, t.judgeLink, h("a", { href: link }, link)),
        details,
        h("button", {
          class: "link danger",
          // Leaving early and a compromised link need different answers for the scores given so far.
          onclick: async () => {
            const keepScores = await chooseDialog(t.revokeTitle(judge.name), t.revokeBody, [
              { label: t.revokeKeep, value: true },
              { label: t.revokeDrop, value: false },
            ]);
            if (keepScores !== null) await act(() => api(`/api/judges/${judge.id}`, { method: "DELETE", body: { keepScores } }));
          },
        }, t.revoke),
      );
    };
    return h(
      "section",
      { class: "card" },
      h("h2", {}, t.judges),
      h("p", { class: "muted" }, t.judgesHint),
      data.judges.length ? h("ul", { class: "judges" }, ...data.judges.map(row)) : h("p", { class: "muted" }, t.noJudges),
      editable
        ? h("form", {
            onsubmit: (e: Event) => {
              e.preventDefault();
              void act(() => api(`/api/events/${eventId}/judges`, { method: "POST", body: { name: name.value } }));
            },
          }, h("label", {}, t.judgeName, name), h("button", { type: "submit" }, t.addJudge))
        : null,
    );
  }

  /** A select of the allowed weights, set to `value`. */
  function weightSelect(value: number, onchange?: (w: number) => void): HTMLSelectElement {
    const select = h("select", { name: "weight" }, ...WEIGHTS.map((w) => h("option", { value: w, selected: w === value }, t.weight(w)))) as HTMLSelectElement;
    if (onchange) select.addEventListener("change", () => onchange(Number(select.value)));
    return select;
  }

  /** Scoring for a pro event (rules 6, 8, 10, 11 and 15): criteria, settings and progress. */
  function judgingSection(): HTMLElement {
    const setup = data.event.status === "setup";
    const { criteria } = data.judging;
    const section = h("section", { class: "card" }, h("h2", {}, t.judging), h("h3", {}, t.criteria), h("p", { class: "muted" }, t.criteriaHint));

    if (setup) {
      const presets = h("p", { class: "presets" }, t.presets);
      for (const preset of ["chili", "bbq", "general"]) {
        presets.append(
          h("button", {
            type: "button",
            class: "secondary",
            onclick: () => {
              if (criteria.length && !confirm(t.replacePreset(t.preset[preset]!))) return;
              void act(() => api(`/api/events/${eventId}/criteria/preset`, { method: "POST", body: { preset, lang: lang() } }));
            },
          }, t.preset[preset]!),
          " ",
        );
      }
      section.append(presets);
    }

    if (!criteria.length) section.append(h("p", { class: "muted" }, t.noCriteria));
    else {
      section.append(h("ul", { class: "criteria" }, ...criteria.map((c) => {
        if (!setup) return h("li", {}, h("strong", {}, c.name), " ", t.weight(c.weight));
        return h(
          "li",
          {},
          h("strong", {}, c.name),
          " ",
          h("label", { class: "inline" }, t.weightLabel, weightSelect(c.weight, (weight) => void act(() => api(`/api/criteria/${c.id}`, { method: "PATCH", body: { weight } })))),
          h("button", {
            class: "link",
            onclick: () => {
              const name = prompt(t.renameCriterion, c.name);
              if (name) void act(() => api(`/api/criteria/${c.id}`, { method: "PATCH", body: { name } }));
            },
          }, t.rename),
          h("button", { class: "link danger", onclick: () => act(() => api(`/api/criteria/${c.id}`, { method: "DELETE" })) }, t.remove),
        );
      })));
    }

    if (setup) {
      const name = h("input", { name: "criterionName", required: true, maxlength: 40 }) as HTMLInputElement;
      const weight = weightSelect(1);
      section.append(h("form", {
        class: "criterion-form",
        onsubmit: (e: Event) => {
          e.preventDefault();
          void act(() => api(`/api/events/${eventId}/criteria`, { method: "POST", body: { name: name.value, weight: Number(weight.value) } }));
        },
      }, h("label", {}, t.criterionName, name), h("label", {}, t.weightLabel, weight), h("button", { type: "submit" }, t.addCriterion)));
    } else {
      section.append(h("p", { class: "muted" }, t.criteriaFixed));
    }

    // The settings save as they're ticked; they're fixed once the results are out.
    const revealed = data.event.status === "revealed";
    const setting = (key: "dropOutliers" | "showDishNames", text: string) => {
      const box = h("input", { type: "checkbox", name: key, checked: data.judging[key], disabled: revealed }) as HTMLInputElement;
      box.addEventListener("change", () => void act(() => api(`/api/events/${eventId}`, { method: "PATCH", body: { [key]: box.checked } })));
      return h("label", { class: "check" }, box, ` ${text}`);
    };
    section.append(setting("dropOutliers", t.dropOutliers), setting("showDishNames", t.showDishNames));

    if (!setup && data.judges.length) section.append(progressPanel());
    return section;
  }

  /** "Pat: 3 of 5 scored", with each submitted card unlockable before the reveal (rules 10 and 15). */
  function progressPanel(): HTMLElement {
    const dishes = scorable();
    const canUnlock = data.event.status !== "revealed";
    return h(
      "div",
      { class: "progress" },
      h("h3", {}, t.judgesProgress),
      ...data.judges.map((judge) => {
        const done = dishes.filter((e) => data.judging.scored.some((s) => s.judgeId === judge.id && s.entryId === e.id));
        return h(
          "details",
          {},
          h("summary", {}, t.judgeProgress(judge.name, done.length, dishes.length)),
          h("ul", {}, ...done.map((entry) =>
            h("li", {}, t.ticket(entry.ticket!), canUnlock
              ? h("button", {
                  class: "link",
                  onclick: () => {
                    if (confirm(t.unlockConfirm(judge.name, entry.ticket!))) {
                      void act(() => api(`/api/judges/${judge.id}/unlock`, { method: "POST", body: { entryId: entry.id } }));
                    }
                  },
                }, t.unlock)
              : null),
          )),
        );
      }),
    );
  }

  function organizersSection(): HTMLElement {
    const isCreator = data.role === "creator";
    const email = h("input", { type: "email", name: "email", required: true }) as HTMLInputElement;
    return h(
      "section",
      { class: "card" },
      h("h2", {}, t.organizers),
      h("ul", {}, ...data.organizers.map((o) =>
        h("li", {}, o.email, o.role === "creator" ? h("span", { class: "muted" }, t.createdIt) : null,
          isCreator && o.role === "co"
            ? h("button", { class: "link danger", onclick: () => act(() => api(`/api/events/${eventId}/organizers/${encodeURIComponent(o.email)}`, { method: "DELETE" })) }, t.remove)
            : null),
      )),
      isCreator
        ? h("form", {
            onsubmit: (e: Event) => {
              e.preventDefault();
              // The invite email is written in the inviter's language (SW-27).
              void act(() => api(`/api/events/${eventId}/organizers`, { method: "POST", body: { email: email.value, lang: lang() } }));
            },
          }, h("label", {}, t.inviteLabel, email), h("button", { type: "submit" }, t.invite))
        : null,
    );
  }

  function detailsSection(): HTMLElement {
    const name = h("input", { name: "name", value: data.event.name, required: true }) as HTMLInputElement;
    const date = h("input", { name: "date", type: "date", value: data.event.date ?? "" }) as HTMLInputElement;
    // Rule 1: the kind can still change while setting up. Pro is offered if the
    // preview is on, or the event is already pro (so it can go back to family).
    const kinds =
      data.event.status === "setup" && (data.proPreview || isPro()) ? kindChoice(true, data.event.kind) : null;
    return h(
      "section",
      { class: "card" },
      h("h2", {}, t.shareAndPrint),
      h("p", {}, t.votingPage, h("a", { href: `/v/${eventId}`, "data-link": true }, `${location.origin}/v/${eventId}`)),
      h("p", {}, t.typedCode, h("strong", { class: "code" }, data.event.code)),
      h("p", {},
        h("a", { class: "button secondary", href: `/e/${eventId}/print/poster`, "data-link": true }, t.printPoster), " ",
        h("a", { class: "button secondary", href: `/e/${eventId}/print/cards`, "data-link": true }, t.printCards)),
      h("details", {},
        h("summary", {}, t.editDetails),
        h("form", {
          onsubmit: (e: Event) => {
            e.preventDefault();
            const body = { name: name.value, date: date.value, ...(kinds ? { kind: chosenKind(kinds) } : {}) };
            void act(() => api(`/api/events/${eventId}`, { method: "PATCH", body }));
          },
        }, h("label", {}, common.nameLabel, name), h("label", {}, common.dateLabel, date), kinds, h("button", { type: "submit" }, common.save))),
      data.role === "creator"
        ? h("button", {
            class: "link danger",
            onclick: () => {
              if (confirm(t.deleteEventConfirm(data.event.name))) {
                void api(`/api/events/${eventId}`, { method: "DELETE" }).then(() => ctx.navigate("/"));
              }
            },
          }, t.deleteEvent)
        : null,
    );
  }

  function draw(): void {
    clearTimeout(peekTimer);
    mount(
      ctx.root,
      h("p", {}, h("a", { href: "/", "data-link": true }, t.back)),
      h("h1", {}, data.event.name),
      isPro() ? h("p", { class: "pro-line" }, h("span", { class: "badge" }, m().home.proTag), " ", t.proEvent, data.proPreview ? ` ${t.proPreview}` : null) : null,
      notice,
      statusControls(),
      data.event.status === "open" ? votesCast() : null,
      categoriesSection(),
      isPro() ? judgesSection() : null,
      isPro() ? judgingSection() : null,
      detailsSection(),
      organizersSection(),
    );
    clearInterval(pollTimer);
    // Keep the votes-cast count live while voting runs.
    if (data.event.status === "open") pollTimer = setInterval(() => void poll().catch(() => {}), POLL_MS);
  }

  draw();
  return () => {
    clearInterval(pollTimer);
    clearTimeout(peekTimer);
  };
}
