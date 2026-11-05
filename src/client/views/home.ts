import { api, ApiError } from "../api";
import type { Ctx } from "../app";
import { dateEl, h, logo, mount } from "../dom";
import { errorText, lang, m } from "../i18n";
import type { EventSummary } from "../types";

function codeForm(ctx: Ctx): HTMLElement {
  const t = m().home;
  const input = h("input", {
    name: "code",
    class: "code-input",
    placeholder: t.codePlaceholder,
    autocapitalize: "characters",
    autocomplete: "off",
    spellcheck: "false",
    required: true,
    maxlength: 6,
  }) as HTMLInputElement;
  return h(
    "form",
    {
      class: "card feature",
      onsubmit: (e: Event) => {
        e.preventDefault();
        ctx.navigate(`/c/${encodeURIComponent(input.value.trim().toUpperCase())}`);
      },
    },
    h("h2", {}, t.hereToVote),
    h("label", {}, t.typeCode, input),
    h("button", { type: "submit" }, t.go),
  );
}

function loginForm(ctx: Ctx): HTMLElement {
  const t = m().home;
  const email = h("input", { type: "email", name: "email", required: true, autocomplete: "email" }) as HTMLInputElement;
  const status = h("p", { class: "status", role: "status" });
  const form = h(
    "form",
    {
      class: "card",
      onsubmit: async (e: Event) => {
        e.preventDefault();
        status.textContent = t.sending;
        try {
          // The login email comes in the language the app is showing (SW-27).
          await api("/api/auth/login", { method: "POST", body: { email: email.value, lang: lang() } });
          status.textContent = t.checkEmail(email.value);
        } catch (err) {
          status.textContent = err instanceof ApiError ? errorText(err) : t.sendFailed;
        }
      },
    },
    h("h2", {}, t.runningCookoff),
    h("p", {}, t.loginIntro),
    ctx.url.searchParams.get("login") === "expired" ? h("p", { class: "error" }, t.linkExpired) : null,
    h("label", {}, t.emailLabel, email),
    h("button", { type: "submit" }, t.emailMeLink),
    status,
  );
  return form;
}

/**
 * Family or Pro, chosen when the event is created (pro-events design, rule 1).
 * While the pro preview is on (SW-25) both can be picked and Pro says it's a
 * free preview; otherwise Pro shows as coming soon.
 */
export function kindChoice(proPreview: boolean, chosen = "family"): HTMLElement {
  const t = m().home;
  const option = (value: string, label: string, hint: string, on: boolean, note: string | null) =>
    h(
      "label",
      { class: on ? "kind" : "kind soon" },
      h("input", { type: "radio", name: "kind", value, checked: on && value === chosen, disabled: !on }),
      h(
        "span",
        {},
        h("span", {}, h("strong", {}, label), on ? null : ` ${t.comingSoon}`),
        h("span", { class: "muted" }, hint),
        note ? h("span", { class: "badge" }, note) : null,
      ),
    );
  return h(
    "fieldset",
    { class: "kinds" },
    h("legend", {}, t.kind),
    option("family", t.family, t.familyHint, true, null),
    option("pro", t.pro, t.proHint, proPreview, proPreview ? t.proPreview : null),
  );
}

/** The kind picked in a form built with kindChoice. */
export function chosenKind(form: ParentNode): string {
  return (form.querySelector('input[name="kind"]:checked') as HTMLInputElement).value;
}

function createForm(ctx: Ctx, proPreview: boolean): HTMLElement {
  const t = m();
  const name = h("input", { name: "name", required: true, maxlength: 120, placeholder: t.home.namePlaceholder }) as HTMLInputElement;
  const date = h("input", { name: "date", type: "date" }) as HTMLInputElement;
  const status = h("p", { class: "status", role: "status" });
  const kinds = kindChoice(proPreview);
  return h(
    "form",
    {
      class: "card",
      onsubmit: async (e: Event) => {
        e.preventDefault();
        try {
          const body = { name: name.value, date: date.value, kind: chosenKind(kinds) };
          const { id } = await api<{ id: string }>("/api/events", { method: "POST", body });
          ctx.navigate(`/e/${id}`);
        } catch (err) {
          status.textContent = errorText(err);
        }
      },
    },
    h("h2", {}, t.home.newCookoff),
    h("label", {}, t.common.nameLabel, name),
    h("label", {}, t.common.dateLabel, date),
    kinds,
    h("button", { type: "submit" }, t.home.create),
    status,
  );
}

/** The brand, big on the guest's landing page and smaller once logged in. */
function hero(compact: boolean): HTMLElement {
  return h(
    "header",
    { class: compact ? "hero compact" : "hero" },
    logo(),
    h("h1", {}, "Cookoff Champs"),
    h("p", { class: "tagline" }, m().home.tagline),
  );
}

export async function homeView(ctx: Ctx): Promise<void> {
  let email: string | null = null;
  let proPreview = false;
  try {
    ({ email, proPreview } = await api<{ email: string; proPreview: boolean }>("/api/me"));
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) throw err;
  }

  if (!email) {
    mount(ctx.root, hero(false), codeForm(ctx), loginForm(ctx));
    return;
  }

  const { events } = await api<{ events: (EventSummary & { role: string })[] }>("/api/events");
  const t = m();
  const logout = h("button", {
    class: "link",
    onclick: async () => {
      await api("/api/auth/logout", { method: "POST" });
      ctx.navigate("/");
    },
  }, t.home.logout);

  mount(
    ctx.root,
    hero(true),
    h("p", { class: "muted" }, t.home.loggedInAs(email), logout),
    createForm(ctx, proPreview),
    h("h2", {}, t.home.yourCookoffs),
    events.length
      ? h(
          "ul",
          { class: "events" },
          ...events.map((ev) =>
            h(
              "li",
              {},
              h("a", { href: `/e/${ev.id}`, "data-link": true }, ev.name),
              ev.kind === "pro" ? h("span", { class: "badge" }, t.home.proTag) : null,
              " ",
              h(
                "span",
                { class: "muted" },
                ev.date ? dateEl(ev.date) : null,
                ev.date ? " · " : null,
                [t.status[ev.status], ev.role === "co" ? t.home.coOrganizer : null].filter(Boolean).join(" · "),
              ),
            ),
          ),
        )
      : h("p", { class: "muted" }, t.home.noneYet),
    codeForm(ctx),
  );
}

/** /c/:code, the typed fallback for the QR code. */
export async function codeView(ctx: Ctx, code: string): Promise<void> {
  try {
    const { id } = await api<{ id: string }>(`/api/public/codes/${encodeURIComponent(code)}`);
    ctx.navigate(`/v/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      mount(ctx.root, h("h1", {}, "Cookoff Champs"), h("p", { class: "error" }, errorText(err)), codeForm(ctx));
      return;
    }
    if (!(err instanceof ApiError && err.status === 404)) throw err;
    mount(ctx.root, h("h1", {}, m().home.noSuchCode), h("p", {}, m().home.noSuchCodeBody(code)), codeForm(ctx));
  }
}
