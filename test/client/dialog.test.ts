import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseDialog, confirmDialog } from "../../src/client/dialog";
import { byText } from "./helpers";

const ask = { title: "Reveal the winners?", body: "The results go public.", confirm: "Reveal the winners" };

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function shown(): HTMLDialogElement {
  return document.querySelector("dialog.confirm") as HTMLDialogElement;
}

describe("confirmDialog", () => {
  it("explains the step, focuses Cancel, and is labelled for screen readers", () => {
    void confirmDialog(ask);
    const dialog = shown();
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(dialog.querySelector("h2")!.textContent).toBe("Reveal the winners?");
    expect(dialog.querySelector("p")!.textContent).toBe("The results go public.");
    expect(dialog.getAttribute("aria-labelledby")).toBe("confirm-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("confirm-body");
    expect(document.activeElement!.textContent).toBe("Cancel");
    expect([...dialog.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Cancel", "Reveal the winners"]);
  });

  it("resolves true for the confirm button and goes away", async () => {
    const answer = confirmDialog(ask);
    byText(shown(), "button", "Reveal the winners").click();
    expect(await answer).toBe(true);
    expect(shown()).toBeNull();
  });

  it("resolves false for Cancel", async () => {
    const answer = confirmDialog(ask);
    byText(shown(), "button", "Cancel").click();
    expect(await answer).toBe(false);
    expect(shown()).toBeNull();
  });

  it("resolves false for Escape (the dialog's cancel event)", async () => {
    const answer = confirmDialog(ask);
    const escape = new Event("cancel", { cancelable: true });
    shown().dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(await answer).toBe(false);
  });

  it("opens as a modal where the browser supports it", () => {
    const showModal = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "showModal", { value: showModal, configurable: true });
    try {
      void confirmDialog(ask);
      expect(showModal).toHaveBeenCalledOnce();
      expect(shown().hasAttribute("open")).toBe(false);
    } finally {
      delete (HTMLElement.prototype as { showModal?: unknown }).showModal;
    }
  });
});


describe("confirmDialog with an acknowledgement (rule 18)", () => {
  it("keeps the confirm button off until the box is ticked", async () => {
    const answer = confirmDialog({ ...ask, acknowledge: "I understand the results will be final" });
    const dialog = shown();
    const go = byText(dialog, "button", "Reveal the winners") as HTMLButtonElement;
    const box = dialog.querySelector<HTMLInputElement>('input[name="acknowledge"]')!;
    expect(box.closest("label")!.textContent).toBe(" I understand the results will be final");
    expect(go.disabled).toBe(true);
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    expect(go.disabled).toBe(false);
    box.checked = false;
    box.dispatchEvent(new Event("change"));
    expect(go.disabled).toBe(true);
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    go.click();
    expect(await answer).toBe(true);
  });

  it("has no box without one", () => {
    void confirmDialog(ask);
    expect(shown().querySelector("input")).toBeNull();
    expect((byText(shown(), "button", "Reveal the winners") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("chooseDialog", () => {
  const pick = () => chooseDialog("Revoke Pat's link?", "Keep or drop?", [{ label: "Keep", value: "keep" }, { label: "Drop", value: "drop" }]);
  const box = () => document.querySelector("dialog.choose") as HTMLDialogElement;

  it("offers each choice after Cancel, which has the focus, and resolves the one picked", async () => {
    const answer = pick();
    expect(box().querySelector("h2")!.textContent).toBe("Revoke Pat's link?");
    expect(box().getAttribute("aria-describedby")).toBe("choose-body");
    expect([...box().querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Cancel", "Keep", "Drop"]);
    expect(document.activeElement!.textContent).toBe("Cancel");
    byText(box(), "button", "Drop").click();
    expect(await answer).toBe("drop");
    expect(box()).toBeNull();
  });

  it("resolves null for Cancel and for Escape", async () => {
    const first = pick();
    byText(box(), "button", "Cancel").click();
    expect(await first).toBeNull();
    const second = pick();
    const escape = new Event("cancel", { cancelable: true });
    box().dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(await second).toBeNull();
  });

  it("opens as a modal where the browser supports it", () => {
    const showModal = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "showModal", { value: showModal, configurable: true });
    try {
      void pick();
      expect(showModal).toHaveBeenCalledOnce();
    } finally {
      delete (HTMLElement.prototype as { showModal?: unknown }).showModal;
    }
  });
});
