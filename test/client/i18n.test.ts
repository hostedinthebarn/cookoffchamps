import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/client/api";
import { drawChrome, errorMessage, start } from "../../src/client/app";
import { dateEl } from "../../src/client/dom";
import { dateLocale, detectLang, errorText, lang, langName, m, otherLang, setLang } from "../../src/client/i18n";
import { en } from "../../src/client/i18n/en";
import { es, esErrors, lugar } from "../../src/client/i18n/es";
import type { PublicView } from "../../src/client/types";
import { homeView } from "../../src/client/views/home";
import { placeLabel } from "../../src/client/views/reveal";
import { voteView } from "../../src/client/views/vote";
import { ERROR_CODES } from "../../src/shared/errors";
import { es as helpEs } from "../../src/help/content-es";
import { fakeApi, flush, makeCtx, submit, fill } from "./helpers";

afterEach(() => {
  setLang("en", false);
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const url = (q = "") => new URL(`http://localhost/${q}`);

describe("choosing the language", () => {
  it("follows ?lang=, then the saved choice, then the phone", () => {
    expect(detectLang(url("?lang=es"), "en-US")).toBe("es");
    expect(detectLang(url("?lang=fr"), "es-MX")).toBe("es"); // unknown values are ignored
    expect(detectLang(url(), "es-US")).toBe("es");
    expect(detectLang(url(), "en-GB")).toBe("en");
    localStorage.setItem("cc_lang", "en");
    expect(detectLang(url(), "es-MX")).toBe("en");
    expect(detectLang(url("?lang=es"), "en-US")).toBe("es");
  });

  it("falls back to the phone when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(detectLang(url(), "es-ES")).toBe("es");
  });

  it("switches, sets <html lang>, and remembers only when asked", () => {
    setLang("es", false);
    expect(lang()).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    expect(localStorage.getItem("cc_lang")).toBeNull();
    setLang("es");
    expect(localStorage.getItem("cc_lang")).toBe("es");
    expect(m()).toBe(es);
    expect(otherLang()).toBe("en");
    setLang("en");
    expect(otherLang()).toBe("es");
    expect([langName("en"), langName("es")]).toEqual(["English", "Español"]);
  });

  it("still switches when storage can't be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(() => setLang("es")).not.toThrow();
    expect(lang()).toBe("es");
  });

  it("formats dates in the phone's locale when it matches, else the language's", () => {
    expect(dateLocale("en-GB")).toBe("en-GB");
    setLang("es", false);
    expect(dateLocale("en-US")).toBe("es-MX");
    expect(dateLocale("es-US")).toBe("es-US");
    expect(dateEl("2026-11-01").textContent).toBe("domingo, 1 de noviembre de 2026");
  });
});

describe("the Spanish messages", () => {
  /** Every string in a message tree, calling functions with sample arguments. */
  function leaves(tree: object, args: unknown[]): string[] {
    return Object.values(tree).flatMap((v) => {
      if (typeof v === "function") return [String((v as (...a: unknown[]) => unknown)(...args))];
      if (typeof v === "object") return leaves(v as object, args);
      return [String(v)];
    });
  }

  function shape(tree: object): unknown {
    return Object.fromEntries(Object.entries(tree).map(([k, v]) => [k, typeof v === "object" ? shape(v as object) : typeof v]));
  }

  it("has every message English has, and none left in English", () => {
    expect(shape(es)).toEqual(shape(en));
    for (const args of [[1, "Chili"], [2, "Chili", "Ana", 3]]) {
      const spanish = leaves(es, args);
      const english = leaves(en, args);
      expect(spanish).toHaveLength(english.length);
      // Names, like "English"/"Español", differ; nothing should be carried over word for word.
      expect(spanish.filter((s, i) => s === english[i] && /[a-z]{3}/.test(s))).toEqual([]);
    }
  });

  it("translates every error code the server sends", () => {
    expect(Object.keys(esErrors).sort()).toEqual([...ERROR_CODES].sort());
  });

  it("names places the way people say them", () => {
    expect([1, 2, 3, 4, 5, 6, 12].map(lugar)).toEqual([
      "Primer lugar", "Segundo lugar", "Tercer lugar", "Cuarto lugar", "Quinto lugar", "6.º lugar", "12.º lugar",
    ]);
    expect(es.common.place(3, true)).toBe("Tercer lugar (empate)");
    expect(es.common.place(2, false)).toBe("Segundo lugar");
    expect([es.common.votes(1), es.common.votes(4)]).toEqual(["1 voto", "4 votos"]);
  });

  it("labels the reveal in Spanish", () => {
    setLang("es", false);
    expect(placeLabel({ place: 1, entryIds: ["a"], votes: 3, coChampions: false })).toBe("¡Primer lugar!");
    expect(placeLabel({ place: 1, entryIds: ["a", "b"], votes: 3, coChampions: true })).toBe("¡Empate en primer lugar!");
    expect(placeLabel({ place: 3, entryIds: ["a"], votes: 1, coChampions: false })).toBe("Tercer lugar");
  });
});

describe("errors in Spanish", () => {
  it("uses the server's English message in English", () => {
    expect(errorText(new ApiError(409, "Voting isn't open", "votingNotOpen"))).toBe("Voting isn't open");
  });

  it("translates by code in Spanish, with a general message for anything without one", () => {
    setLang("es", false);
    expect(errorText(new ApiError(409, "Voting isn't open", "votingNotOpen"))).toBe("La votación no está abierta.");
    expect(errorText(new ApiError(400, "Body must be JSON"))).toBe("Algo salió mal. Inténtalo de nuevo.");
    expect(errorText(new Error("Couldn't load"))).toBe("Couldn't load"); // the app's own errors are already translated
    expect(errorText("weird")).toBe("Algo salió mal. Inténtalo de nuevo.");
    expect(errorMessage(new ApiError(404, "Event not found", "eventNotFound"))).toBe("No encontramos ese concurso.");
    expect(errorMessage(new ApiError(429, "Too many", "tooManyCodes"))).toBe(esErrors.tooManyCodes);
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe("Algo salió mal. Revisa tu conexión e inténtalo de nuevo.");
  });

  it("reads the code off the server's error response", async () => {
    fakeApi({ "GET /x": [409, { error: "Voting isn't open", code: "votingNotOpen" }] });
    const { api } = await import("../../src/client/api");
    await expect(api("/x")).rejects.toMatchObject({ status: 409, code: "votingNotOpen" });
  });
});

describe("the page around the app", () => {
  function shell(): void {
    document.body.innerHTML = `<header><span id="lang-switch"></span></header><main id="app"></main>
      <footer><a id="help-link" href="/help/">Help and questions</a> · <a id="printables-link" href="/printables/">Free printables</a> · <a id="privacy-link" href="/privacy/">Privacy</a> · <span id="part-of">Part of</span></footer>`;
  }

  it("offers the other language, and switching redraws in it", () => {
    shell();
    const redraw = vi.fn();
    drawChrome(document, redraw);
    const button = document.querySelector<HTMLButtonElement>("#lang-switch button")!;
    expect(button.textContent).toBe("Español");
    expect(button.lang).toBe("es");
    button.click();
    expect(lang()).toBe("es");
    expect(localStorage.getItem("cc_lang")).toBe("es");
    expect(redraw).toHaveBeenCalledOnce();

    drawChrome(document, redraw);
    expect(document.querySelector("#lang-switch button")!.textContent).toBe("English");
    expect(document.getElementById("help-link")!.textContent).toBe("Ayuda y preguntas");
    expect(document.getElementById("help-link")!.getAttribute("href")).toBe("/es/ayuda/");
    expect(document.getElementById("printables-link")!.textContent).toBe("Imprimibles gratis");
    expect(document.getElementById("printables-link")!.getAttribute("href")).toBe("/es/imprimibles/");
    expect(document.getElementById("privacy-link")!.textContent).toBe("Política de privacidad");
    expect(document.getElementById("privacy-link")!.getAttribute("href")).toBe("/es/privacidad/");
    expect(document.getElementById("part-of")!.textContent).toBe("Parte de");
  });

  it("copes with a page that has none of it", () => {
    document.body.replaceChildren();
    expect(() => drawChrome(document, () => {})).not.toThrow();
  });

  it("opens in Spanish from a ?lang=es link, remembers it, and the switch goes back to English", async () => {
    shell();
    history.replaceState(null, "", "/nowhere?lang=es");
    const root = document.getElementById("app")!;
    start(root);
    await flush();
    expect(root.querySelector("h1")!.textContent).toBe("No encontramos esta página");
    expect(localStorage.getItem("cc_lang")).toBe("es");

    document.querySelector<HTMLButtonElement>("#lang-switch button")!.click();
    await flush();
    expect(root.querySelector("h1")!.textContent).toBe("Page not found");
    expect(document.documentElement.lang).toBe("en");
  });
});

describe("the app in Spanish", () => {
  function publicView(status: PublicView["event"]["status"]): PublicView {
    return {
      event: { id: "e1", code: "K7", name: "Noche de Chili", date: null, status },
      turnstileSiteKey: "site",
      myVotes: {},
      categories: [
        {
          id: "c1",
          name: "Chili",
          entries: [
            { id: "n1", number: 1, dishName: "Chili rojo", photoKey: null, cookName: "Abuela", votes: 1 },
            { id: "n2", number: 2, dishName: "Chili blanco", photoKey: null, cookName: "Kiana", votes: 1 },
          ],
          placings: [{ place: 1, entryIds: ["n1", "n2"], votes: 1 }],
        },
      ],
    };
  }

  it("shows the guest's page in Spanish", async () => {
    setLang("es", false);
    fakeApi({ "GET /api/public/events/e1": publicView("setup") });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect(ctx.root.textContent).toContain("La votación todavía no abre.");
    expect(ctx.root.textContent).toContain("Platillo 1");
  });

  it("shows the results in Spanish", async () => {
    setLang("es", false);
    fakeApi({ "GET /api/public/events/e1": publicView("revealed") });
    const ctx = makeCtx("/v/e1");
    await voteView(ctx, "e1");
    expect(ctx.root.querySelector(".place")!.textContent).toBe("¡Empate en primer lugar!");
    expect(ctx.root.textContent).toContain("de Abuela");
    expect(ctx.root.textContent).toContain("1 voto");
  });

  it("asks for the login email in Spanish", async () => {
    setLang("es", false);
    const calls = fakeApi({ "GET /api/me": [401, {}], "POST /api/auth/login": [429, { error: "Too many", code: "tooManyLinks" }] });
    const ctx = makeCtx("/");
    await homeView(ctx);
    expect(ctx.root.textContent).toContain("¿Vienes a votar?");
    const form = ctx.root.querySelectorAll("form")[1]!;
    fill(form, "email", "tia@example.com");
    submit(form);
    await flush();
    expect(calls.at(-1)!.body).toEqual({ email: "tia@example.com", lang: "es" });
    expect(form.querySelector(".status")!.textContent).toBe(esErrors.tooManyLinks);
  });
});

describe("the Spanish help page", () => {
  it("quotes the buttons as the Spanish app names them", () => {
    const text = JSON.stringify(helpEs);
    for (const label of [es.manage.peek, es.manage.reopen, es.manage.undo, es.vote.closedSoon]) expect(text).toContain(label);
  });
});


it("says the scoring messages in Spanish, singular and plural (SW-25)", () => {
  expect(es.manage.missing("Pat no ha calificado el boleto 214", 0)).not.toContain("más");
  expect(es.manage.missing("x", 2)).toContain("; y 2 más.");
  expect(es.manage.judgedRow("Boleto 214", "", "Ana", "8.75", 1)).toBe("Boleto 214 (Ana): 8.75 de 1 juez");
  expect(es.manage.judgedRow("Boleto 214", "Verde", "Ana", "8.75", 3)).toBe("Boleto 214, Verde (Ana): 8.75 de 3 jueces");
  expect(en.manage.missing("x", 0)).not.toContain("more");
});
