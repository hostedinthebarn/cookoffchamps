import { ApiError } from "./api";
import { h, mount } from "./dom";
import { detectLang, errorText, langName, m, otherLang, setLang } from "./i18n";
import { codeView, homeView } from "./views/home";
import { manageView } from "./views/manage";
import { printView } from "./views/print";
import { revealView } from "./views/reveal";
import { voteView } from "./views/vote";

export interface Ctx {
  root: HTMLElement;
  url: URL;
  navigate: (path: string) => void;
}

/** A view renders into ctx.root and may return a cleanup (e.g. to stop polling). */
export type View = (ctx: Ctx, ...params: string[]) => Promise<void | (() => void)>;

const ROUTES: [RegExp, View][] = [
  [/^\/$/, homeView],
  [/^\/c\/([^/]+)$/, codeView],
  [/^\/v\/([^/]+)$/, voteView],
  [/^\/e\/([^/]+)$/, manageView],
  [/^\/e\/([^/]+)\/reveal$/, revealView],
  [/^\/e\/([^/]+)\/print\/(poster|cards)$/, printView],
];

export function findRoute(path: string): { view: View; params: string[] } | null {
  for (const [pattern, view] of ROUTES) {
    const m = pattern.exec(path);
    if (m) return { view, params: m.slice(1).map(decodeURIComponent) };
  }
  return null;
}

export function errorMessage(err: unknown): string {
  const t = m().app;
  if (err instanceof ApiError) {
    if (err.status === 401) return t.loginFirst;
    if (err.status === 403) return t.notYours;
    if (err.status === 404) return t.noEvent;
    return errorText(err);
  }
  return t.offline;
}

/**
 * The parts of the page outside the app's own area: the language switch in the
 * masthead and the help link in the footer. index.html has them in English for
 * a first paint; this puts them in the current language.
 */
export function drawChrome(doc: Document, onSwitch: () => void): void {
  const t = m().app;
  const other = otherLang();
  const help = doc.getElementById("help-link");
  if (help) {
    help.textContent = t.helpLink;
    help.setAttribute("href", t.helpHref);
  }
  const printables = doc.getElementById("printables-link");
  if (printables) {
    printables.textContent = t.printablesLink;
    printables.setAttribute("href", t.printablesHref);
  }
  const privacy = doc.getElementById("privacy-link");
  if (privacy) {
    privacy.textContent = t.privacyLink;
    privacy.setAttribute("href", t.privacyHref);
  }
  const partOf = doc.getElementById("part-of");
  if (partOf) partOf.textContent = t.partOf;
  const box = doc.getElementById("lang-switch");
  if (box) {
    // Named in its own language, so someone who can't read the current one can still find theirs.
    const button = h("button", { type: "button", class: "link lang", lang: other, onclick: () => {
      setLang(other);
      onSwitch();
    } }, langName(other));
    box.replaceChildren(button);
  }
}

export function start(root: HTMLElement, win: Window = window): { go: (path: string) => Promise<void> } {
  let cleanup: void | (() => void);
  const first = new URL(win.location.href);
  // A ?lang= link (from the help pages) is a choice, so it's remembered; the phone's language isn't.
  setLang(detectLang(first, win.navigator.language), first.searchParams.has("lang"));

  async function render(): Promise<void> {
    cleanup?.();
    cleanup = undefined;
    const url = new URL(win.location.href);
    drawChrome(root.ownerDocument, () => void render());
    const found = findRoute(url.pathname);
    const ctx: Ctx = { root, url, navigate: (p) => void go(p) };
    const t = m().app;
    if (!found) {
      mount(root, h("h1", {}, t.notFound), h("p", {}, h("a", { href: "/", "data-link": true }, t.goHome)));
      return;
    }
    try {
      cleanup = await found.view(ctx, ...found.params);
    } catch (err) {
      mount(root, h("h1", {}, t.oops), h("p", { class: "error" }, errorMessage(err)), h("p", {}, h("a", { href: "/", "data-link": true }, t.home)));
    }
  }

  async function go(path: string): Promise<void> {
    win.history.pushState(null, "", path);
    await render();
  }

  // In-app links carry data-link; everything else is a normal page load.
  root.addEventListener("click", (e) => {
    const a = (e.target as Element).closest("a[data-link]");
    if (!a || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey) return;
    e.preventDefault();
    void go(a.getAttribute("href")!);
  });
  win.addEventListener("popstate", () => void render());
  void render();
  return { go };
}
