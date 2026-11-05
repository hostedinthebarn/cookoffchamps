import { h } from "./dom";
import { m } from "./i18n";

export interface Choice<T> {
  label: string;
  value: T;
}

/**
 * Asks the organizer to pick between real alternatives, each a button that says
 * what it does. Cancel (or Escape) resolves null and has the focus, as in
 * confirmDialog, so a stray tap picks nothing.
 */
export function chooseDialog<T>(title: string, body: string, choices: Choice<T>[]): Promise<T | null> {
  return new Promise((resolve) => {
    const cancelButton = h("button", { type: "button", class: "secondary" }, m().common.cancel);
    const buttons = choices.map((c) => h("button", { type: "button" }, c.label));
    const dialog = h(
      "dialog",
      { class: "confirm choose", "aria-labelledby": "choose-title", "aria-describedby": "choose-body" },
      h("h2", { id: "choose-title" }, title),
      h("p", { id: "choose-body" }, body),
      h("div", { class: "actions" }, cancelButton, ...buttons),
    ) as HTMLDialogElement;
    const answer = (value: T | null) => {
      dialog.remove();
      resolve(value);
    };
    cancelButton.addEventListener("click", () => answer(null));
    buttons.forEach((b, i) => b.addEventListener("click", () => answer(choices[i]!.value)));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      answer(null);
    });
    document.body.append(dialog);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    cancelButton.focus();
  });
}

export interface ConfirmOptions {
  title: string;
  body: string;
  confirm: string; // the label says what happens, e.g. "Reveal the winners", never just "OK"
}

/**
 * Asks before a step the organizer might take by accident (SW-23). A real
 * <dialog>, not window.confirm: it can explain what happens, and Cancel has the
 * focus, so a stray tap or Enter does nothing. Escape cancels too. Resolves
 * true only for the confirm button.
 */
export function confirmDialog({ title, body, confirm }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const cancelButton = h("button", { type: "button", class: "secondary" }, m().common.cancel);
    const confirmButton = h("button", { type: "button" }, confirm);
    const dialog = h(
      "dialog",
      { class: "confirm", "aria-labelledby": "confirm-title", "aria-describedby": "confirm-body" },
      h("h2", { id: "confirm-title" }, title),
      h("p", { id: "confirm-body" }, body),
      h("div", { class: "actions" }, cancelButton, confirmButton),
    ) as HTMLDialogElement;

    const answer = (yes: boolean) => {
      dialog.remove();
      resolve(yes);
    };
    cancelButton.addEventListener("click", () => answer(false));
    confirmButton.addEventListener("click", () => answer(true));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      answer(false);
    });

    document.body.append(dialog);
    // Browsers make it modal; older engines (and jsdom) just show it.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    cancelButton.focus();
  });
}
