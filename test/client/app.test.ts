import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/client/api";
import { errorMessage, findRoute, start } from "../../src/client/app";
import { codeView, homeView } from "../../src/client/views/home";
import { judgeView } from "../../src/client/views/judge";
import { manageView } from "../../src/client/views/manage";
import { printView } from "../../src/client/views/print";
import { revealView } from "../../src/client/views/reveal";
import { voteView } from "../../src/client/views/vote";
import { fakeApi, flush } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  history.replaceState(null, "", "/");
});

describe("findRoute", () => {
  it("maps paths to views and decodes params", () => {
    expect(findRoute("/")).toEqual({ view: homeView, params: [] });
    expect(findRoute("/c/K7QM2X")).toEqual({ view: codeView, params: ["K7QM2X"] });
    expect(findRoute("/v/a%2Bb")).toEqual({ view: voteView, params: ["a+b"] });
    expect(findRoute("/e/abc")).toEqual({ view: manageView, params: ["abc"] });
    expect(findRoute("/e/abc/reveal")).toEqual({ view: revealView, params: ["abc"] });
    expect(findRoute("/e/abc/print/cards")).toEqual({ view: printView, params: ["abc", "cards"] });
    expect(findRoute("/e/abc/print/flyers")).toBeNull();
    expect(findRoute("/j/abc")).toEqual({ view: judgeView, params: ["abc"] });
    expect(findRoute("/nope")).toBeNull();
  });
});

describe("errorMessage", () => {
  it("explains common API failures in plain words", () => {
    expect(errorMessage(new ApiError(401, "x"))).toBe("Please log in first.");
    expect(errorMessage(new ApiError(403, "x"))).toBe("That event belongs to someone else.");
    expect(errorMessage(new ApiError(404, "x"))).toBe("We couldn't find that event.");
    expect(errorMessage(new ApiError(409, "Voting isn't open"))).toBe("Voting isn't open");
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe("Something went wrong. Check your connection and try again.");
  });
});

describe("start", () => {
  function setup(path: string) {
    history.replaceState(null, "", path);
    const root = document.createElement("main");
    document.body.replaceChildren(root);
    return root;
  }

  it("shows a not-found page for unknown paths", async () => {
    const root = setup("/nowhere");
    start(root);
    await flush();
    expect(root.querySelector("h1")!.textContent).toBe("Page not found");
  });

  it("shows a friendly error when a view fails", async () => {
    fakeApi({});
    const root = setup("/e/missing");
    start(root);
    await flush();
    expect(root.querySelector(".error")!.textContent).toBe("We couldn't find that event.");
  });

  it("follows in-app links without a page load, and goes back on popstate", async () => {
    fakeApi({ "GET /api/me": [401, { error: "Please log in" }] });
    const root = setup("/nowhere");
    start(root);
    await flush();

    root.querySelector<HTMLAnchorElement>("a[data-link]")!.click();
    await flush();
    expect(location.pathname).toBe("/");
    expect(root.querySelector("h1")!.textContent).toBe("Cookoff Champs");

    history.replaceState(null, "", "/elsewhere");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await flush();
    expect(root.querySelector("h1")!.textContent).toBe("Page not found");
  });

  it("gives views a navigate that moves the app along", async () => {
    fakeApi({ "GET /api/me": [401, {}], "GET /api/public/codes/K7QM2X": { id: "e9" }, "GET /api/public/events/e9": [404, {}] });
    const root = setup("/");
    start(root);
    await vi.waitFor(() => expect(root.querySelector("form")).not.toBeNull());
    (root.querySelector("[name=code]") as HTMLInputElement).value = "k7qm2x";
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(location.pathname).toBe("/v/e9"));
  });

  it("leaves modified clicks and ordinary clicks to the browser", async () => {
    const root = setup("/nowhere");
    start(root);
    await flush();
    const link = root.querySelector<HTMLAnchorElement>("a[data-link]")!;
    const meta = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
    link.dispatchEvent(meta);
    expect(meta.defaultPrevented).toBe(false);
    const ctrl = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(ctrl);
    expect(ctrl.defaultPrevented).toBe(false);
    const plain = new MouseEvent("click", { bubbles: true, cancelable: true });
    root.querySelector("h1")!.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
  });

  it("runs a view's cleanup before the next view", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    fakeApi({
      "GET /api/events/e1": {
        event: { id: "e1", code: "ABC", name: "Chili", date: null, status: "open" },
        role: "creator",
        categories: [{ id: "c1", name: "Main", position: 1 }],
        entries: [],
        organizers: [],
        votesCast: [],
      },
      "GET /api/me": [401, {}],
    });
    const root = setup("/e/e1");
    const app = start(root);
    await vi.waitFor(() => expect(root.querySelector("h1")!.textContent).toBe("Chili"));
    expect(vi.getTimerCount()).toBe(1);
    await app.go("/");
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});

describe("main", () => {
  it("starts the app in #app", async () => {
    fakeApi({ "GET /api/me": [401, {}] });
    document.body.innerHTML = '<main id="app"></main>';
    await import("../../src/client/main");
    await flush();
    expect(document.querySelector("#app h1")!.textContent).toBe("Cookoff Champs");
  });
});
