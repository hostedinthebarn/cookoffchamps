import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import path from "node:path";

const PHOTO = path.join(import.meta.dirname, "fixtures", "dish.png");

/** Logs in through the real magic-link flow, reading the link from the dev outbox. */
async function login(page: Page, request: APIRequestContext, email: string): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText(`Check ${email}`)).toBeVisible();
  const outbox = await (await request.get("/api/dev/outbox")).json();
  const mail = outbox.find((m: { to: string }) => m.to === email);
  const link = mail.body.match(/https?:\/\/\S+/)[0];
  await page.goto(link);
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();
}

async function addDish(page: Page, cook: string, dish: string): Promise<void> {
  const form = page.locator(".entry-form").last();
  await form.getByLabel("Cook").fill(cook);
  await form.getByLabel("Dish").fill(dish);
  await form.getByLabel("Photo").setInputFiles(PHOTO);
  await form.getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".entry", { hasText: dish })).toBeVisible();
}

test("a whole cookoff: set up, print, vote blind, reveal 3-2-1, results", async ({ page, browser, request }) => {
  const email = `host-${Date.now()}@example.com`;
  await login(page, request, email);

  // Set up the event and its dishes.
  await page.getByLabel("Name").fill("Bailey Chili Cookoff");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Bailey Chili Cookoff" })).toBeVisible();
  const eventId = page.url().split("/e/")[1]!;

  await addDish(page, "Grandma", "Texas red");
  await addDish(page, "Kiana", "White chicken chili");
  await addDish(page, "Shannon", "Chili verde");
  await expect(page.locator(".entry img")).toHaveCount(3);

  // Both printouts render their QR codes.
  await page.getByRole("link", { name: "Print the poster" }).click();
  await expect(page.locator(".poster .qr svg")).toBeVisible();
  await page.goBack();
  await page.getByRole("link", { name: "Print the table cards" }).click();
  await expect(page.locator(".tent-card")).toHaveCount(3);
  await expect(page.locator(".tent-card").first()).not.toContainText("Grandma");
  await page.goBack();

  await page.getByRole("button", { name: "Open voting" }).click();
  await expect(page.getByText("Voting is open.")).toBeVisible();

  // Four guests, each on their own phone. Blind: no cook names anywhere.
  const ballots = ["Chili verde", "Chili verde", "White chicken chili", "Texas red"];
  for (const [i, dish] of ballots.entries()) {
    const phone = await browser.newContext();
    const guest = await phone.newPage();
    await guest.goto(`/v/${eventId}`);
    await expect(guest.getByText("Tap your favorite dish.")).toBeVisible();
    await expect(guest.locator("main")).not.toContainText("Grandma");
    if (i === 3) {
      // The last guest changes their mind (decision 14): still one vote.
      await guest.locator(".dish", { hasText: "Chili verde" }).click();
      await expect(guest.getByText("Vote saved. Thanks!")).toBeVisible();
    }
    await guest.locator(".dish", { hasText: dish }).click();
    await expect(guest.locator(".dish.chosen")).toContainText(dish);
    await expect(guest.locator(".dish.chosen")).toHaveAttribute("aria-pressed", "true");
    await phone.close();
  }

  // The organizer sees the count, can peek, then closes voting.
  await expect(page.getByTestId("votes-cast")).toHaveText("4", { timeout: 15_000 });
  await page.getByRole("button", { name: "Peek at the standings" }).click();
  await expect(page.locator(".peek li").first()).toContainText("Chili verde (Shannon): 2");
  const confirmDialog = page.locator("dialog.confirm");
  const closeVoting = async () => {
    await page.getByRole("button", { name: "Close voting" }).click();
    await confirmDialog.getByRole("button", { name: "Close voting" }).click();
    await expect(page.getByText("Voting is closed.")).toBeVisible();
  };
  await closeVoting();

  // Closed too soon: reopen (votes kept), then close again (SW-23).
  await page.getByRole("button", { name: "Reopen voting" }).click();
  await expect(page.getByText("Voting is open.")).toBeVisible();
  await expect(page.getByTestId("votes-cast")).toHaveText("4");
  await closeVoting();

  // Closed but not revealed: guests still see no results.
  const later = await (await browser.newContext()).newPage();
  await later.goto(`/v/${eventId}`);
  await expect(later.getByText("The results are coming soon!")).toBeVisible();

  // The reveal asks first: Cancel stays put. Then 2nd is a tie, so it's one click, then the champion.
  const reveal = async () => {
    await page.getByRole("button", { name: "Start the reveal" }).click();
    await confirmDialog.getByRole("button", { name: "Reveal the winners" }).click();
    const stage = page.locator(".reveal");
    await stage.click();
    await expect(stage.locator(".place")).toHaveText("2nd place (tied)");
    await expect(stage.locator(".cook")).toHaveText(["Grandma", "Kiana"]);
    await stage.click();
    await expect(stage.locator(".place")).toHaveText("Champion!");
    await expect(stage.locator(".cook")).toHaveText("Shannon");
  };
  await page.getByRole("button", { name: "Start the reveal" }).click();
  await confirmDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(new RegExp(`/e/${eventId}$`));
  await reveal();

  // The same QR link now shows the results.
  const resultsShown = () =>
    expect(async () => {
      await later.reload();
      await expect(later.locator(".place").first()).toHaveText("1st place");
    }).toPass();
  await resultsShown();
  await expect(later.locator(".results")).toContainText("by Shannon");
  await expect(later.locator(".results")).toContainText("2 votes");

  // Revealed by mistake? A family event can undo it: the results hide again (decision 17).
  await page.getByRole("link", { name: "← Back to the event" }).click();
  await page.getByRole("button", { name: "Undo the reveal" }).click();
  await expect(confirmDialog).toContainText("could change");
  await confirmDialog.getByRole("button", { name: "Undo the reveal" }).click();
  await expect(page.getByText("Voting is closed.")).toBeVisible();
  await later.reload();
  await expect(later.getByText("The results are coming soon!")).toBeVisible();

  // ...and reveal again.
  await reveal();
  await resultsShown();
});

test("the typed code finds the event", async ({ page, request }) => {
  await login(page, request, `code-${Date.now()}@example.com`);
  await page.getByLabel("Name").fill("Pie Off");
  await page.getByRole("button", { name: "Create" }).click();
  const code = await page.locator(".code").textContent();

  await page.goto("/");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Running a cookoff?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Hosted in the Barn" })).toHaveAttribute("href", "https://hostedinthebarn.com");
  await page.getByLabel("Type the code from the poster").fill(code!.toLowerCase());
  await page.getByRole("button", { name: "Go" }).click();
  await expect(page.getByRole("heading", { name: "Pie Off" })).toBeVisible();
  await expect(page.getByText("Voting hasn't opened yet.")).toBeVisible();
});

test("the favicon, touch icon and manifest are served and linked", async ({ page, request }) => {
  await page.goto("/");
  for (const [rel, type] of [["icon", "image/svg+xml"], ["apple-touch-icon", "image/png"], ["manifest", "application/manifest+json"]]) {
    const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute("href");
    const res = await request.get(href!);
    expect(res.status(), href!).toBe(200);
    expect(res.headers()["content-type"], href!).toContain(type);
  }
  const manifest = await (await request.get("/site.webmanifest")).json();
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  expect((await request.get("/favicon-32.png")).status()).toBe(200);
});

test("the help page is plain HTML, linked from every page, and its filter works", async ({ page, request }) => {
  // Served as a real file: readable without JavaScript, not the app's shell.
  const raw = await request.get("/help/");
  expect(raw.status()).toBe(200);
  const html = await raw.text();
  expect(html).toContain("<h3>I revealed the winners by mistake. Can I undo it?</h3>");
  expect(html).toContain('"@type":"FAQPage"');

  await page.goto("/");
  await page.getByRole("link", { name: "Help and questions" }).click();
  await expect(page).toHaveURL(/\/help\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Help and questions" })).toBeVisible();

  await page.getByLabel("Find a question").fill("fingerprint");
  await expect(page.locator("details.faq:visible")).toHaveCount(1);
  await expect(page.locator("#one-vote-per-phone")).toHaveAttribute("open", "");
  await page.getByLabel("Find a question").fill("zzzz");
  await expect(page.getByText("No questions match that.")).toBeVisible();

  // A link to one answer opens it.
  await page.goto("/help/#undo-reveal");
  await expect(page.locator("#undo-reveal")).toHaveAttribute("open", "");

  const robots = await request.get("/robots.txt");
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain("Disallow: /v/");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.headers()["content-type"]).toContain("xml");
  expect(await sitemap.text()).toContain("<loc>https://cookoffchamps.com/help/</loc>");
});

test("the site works in Spanish: a phone set to Spanish, the switch, and the Spanish help page (SW-27)", async ({ browser, request }) => {
  const context = await browser.newContext({ locale: "es-MX" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿Vienes a votar?" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  // The switch says where it goes, in that language, and the choice sticks.
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Here to vote?" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Here to vote?" })).toBeVisible();
  await page.getByRole("button", { name: "Español" }).click();

  await page.getByRole("link", { name: "Ayuda y preguntas" }).click();
  await expect(page).toHaveURL(/\/es\/ayuda\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ayuda y preguntas" })).toBeVisible();
  await page.getByLabel("Buscar una pregunta").fill("deshacer anuncio");
  await expect(page.locator("#undo-reveal")).toHaveAttribute("open", "");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/help\/$/);
  await context.close();

  const raw = await request.get("/es/ayuda/");
  expect(raw.status()).toBe(200);
  expect(await raw.text()).toContain('<html lang="es">');
});

test("a pro event: cooks with ticket numbers, and a judge's personal link (SW-25)", async ({ page, browser, request }) => {
  const email = `pro-host-${Date.now()}@example.com`;
  await login(page, request, email);

  await page.getByLabel("Name").fill("Fair Chili Judging");
  await page.getByRole("radio", { name: /^Pro/ }).check();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Fair Chili Judging" })).toBeVisible();
  await expect(page.getByText("Pro event: judges score every dish blind.")).toBeVisible();

  // A cook listed before turn-in, then one with their dish and raffle ticket.
  const cooks = page.locator(".entry-form").last();
  await cooks.getByLabel("Cook").fill("Ben");
  await cooks.getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".entry", { hasText: "No ticket yet" })).toBeVisible();
  const next = page.locator(".entry-form").last();
  await next.getByLabel("Cook").fill("Ana");
  await next.getByLabel("Dish (if known)").fill("Brisket chili");
  await next.getByLabel("Ticket number").fill("214");
  await next.getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".entry", { hasText: "Ticket 214" })).toBeVisible();

  // A judge, whose link opens their page in a browser that has never logged in.
  await page.getByLabel("Judge's name").fill("Pat");
  await page.getByRole("button", { name: "Add judge" }).click();
  const link = await page.locator(".judge a").getAttribute("href");
  const judge = await (await browser.newContext()).newPage();
  await judge.goto(link!);
  await expect(judge.getByRole("heading", { name: "Judging Fair Chili Judging" })).toBeVisible();
  await expect(judge.getByText("Hello, Pat.")).toBeVisible();

  // Revoked, the same link stops working.
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await page.locator("dialog.choose").getByRole("button", { name: "Revoke, drop their scores" }).click();
  await expect(page.getByText("No judges yet.")).toBeVisible();
  await judge.reload();
  await expect(judge.getByText("This judge's link doesn't work.")).toBeVisible();
});

test("pro judging: criteria from a preset, a judge scores blind, the organizer sees progress and standings (SW-25)", async ({ page, browser, request }) => {
  const email = `pro-score-${Date.now()}@example.com`;
  await login(page, request, email);
  await page.getByLabel("Name").fill("Scored Chili");
  await page.getByRole("radio", { name: /^Pro/ }).check();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Scored Chili" })).toBeVisible();

  await page.getByRole("button", { name: "General" }).click();
  await expect(page.locator(".criteria li")).toHaveCount(4);
  const cook = page.locator(".entry-form").last();
  await cook.getByLabel("Cook").fill("Ana");
  await cook.getByLabel("Dish (if known)").fill("Brisket chili");
  await cook.getByLabel("Ticket number").fill("214");
  await cook.getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".entry", { hasText: "Ticket 214" })).toBeVisible();
  await page.getByLabel("Judge's name").fill("Pat");
  await page.getByRole("button", { name: "Add judge" }).click();
  const link = await page.locator(".judge a").getAttribute("href");
  await page.getByRole("button", { name: "Open voting" }).click();
  await expect(page.getByText("Pat: 0 of 1 scored")).toBeVisible();

  // The judge sees the ticket, never the cook, and scores every criterion.
  const judge = await (await browser.newContext()).newPage();
  await judge.goto(link!);
  await expect(judge.getByText("0 of 1 scored")).toBeVisible();
  await expect(judge.getByText("Ana")).toHaveCount(0);
  await judge.getByRole("button", { name: /Ticket 214/ }).click();
  for (const [criterion, score] of [["Taste", "9"], ["Texture", "8"], ["Appearance", "7"], ["Aroma", "8"]] as const) {
    await judge.getByLabel(new RegExp(`^${criterion}`)).selectOption(score);
  }
  await judge.getByRole("button", { name: "Submit scores" }).click();
  await judge.locator("dialog.confirm").getByRole("button", { name: "Submit scores" }).click();
  await expect(judge.getByText("1 of 1 scored")).toBeVisible();

  // (9·2 + 8·1.5 + 7 + 8) / 5.5 = 45 / 5.5 = 8.18
  await page.reload();
  await expect(page.getByText("Pat: 1 of 1 scored")).toBeVisible();
  await page.getByRole("button", { name: "Peek at the standings" }).click();
  await expect(page.locator(".peek li")).toHaveText("Ticket 214, Brisket chili (Ana): 8.18 from 1 judge");
});

test("pro results: People's Choice, a final reveal, scores with their breakdown, cooks' comments and the export (SW-25)", async ({ page, browser, request }) => {
  const email = `pro-results-${Date.now()}@example.com`;
  await login(page, request, email);
  await page.getByLabel("Name").fill("Final Chili");
  await page.getByRole("radio", { name: /^Pro/ }).check();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Final Chili" })).toBeVisible();
  const eventId = new URL(page.url()).pathname.split("/")[2];

  await page.getByRole("button", { name: "General" }).click();
  await expect(page.locator(".criteria li")).toHaveCount(4);
  // Ticking saves and redraws the page, so wait for that before typing.
  const saved = page.waitForResponse((r) => r.request().method() === "GET" && r.url().endsWith(`/api/events/${eventId}`));
  await page.getByLabel(/Let cooks read the judges' comments/).check();
  await saved;
  await expect(page.getByLabel(/Let cooks read the judges' comments/)).toBeChecked();
  for (const [cookName, dish, ticket] of [["Ana", "Brisket chili", "7"], ["Ben", "Verde", "8"]]) {
    const cook = page.locator(".entry-form").last();
    await cook.getByLabel("Cook").fill(cookName);
    await cook.getByLabel("Dish (if known)").fill(dish);
    await cook.getByLabel("Ticket number").fill(ticket);
    await cook.getByRole("button", { name: "Add" }).click();
    await expect(page.locator(".entry", { hasText: `Ticket ${ticket}` })).toBeVisible();
  }
  await page.getByLabel("Judge's name").fill("Pat");
  await page.getByRole("button", { name: "Add judge" }).click();
  const link = await page.locator(".judge a").getAttribute("href");
  await page.getByRole("button", { name: "Open voting" }).click();
  await expect(page.getByText("Pat: 0 of 2 scored")).toBeVisible();

  // Pat scores both: ticket 7 all 9s with a comment, ticket 8 all 6s.
  const judge = await (await browser.newContext()).newPage();
  await judge.goto(link!);
  for (const [ticket, score, comment] of [["7", "9", "More salt next time"], ["8", "6", ""]]) {
    await judge.getByRole("button", { name: new RegExp(`Ticket ${ticket}`) }).click();
    for (const criterion of ["Taste", "Texture", "Appearance", "Aroma"]) {
      await judge.getByLabel(new RegExp(`^${criterion}`)).selectOption(score);
    }
    if (comment) await judge.getByLabel(/Comment/).fill(comment);
    await judge.getByRole("button", { name: "Submit scores" }).click();
    await judge.locator("dialog.confirm").getByRole("button", { name: "Submit scores" }).click();
    await expect(judge.getByRole("button", { name: "← All dishes" })).toHaveCount(0);
  }
  await expect(judge.getByText("2 of 2 scored")).toBeVisible();

  // A guest votes Ben's dish for People's Choice, by ticket; the dish names stay hidden.
  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/v/${eventId}`);
  await expect(guest.getByText("Tap your favorite dish.")).toBeVisible();
  await expect(guest.locator("main")).not.toContainText("Verde");
  await guest.locator(".dish", { hasText: "Ticket 8" }).click();
  await expect(guest.getByText("Vote saved. Thanks!")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Close voting" }).click();
  await page.locator("dialog.confirm").getByRole("button", { name: "Close voting" }).click();
  await expect(page.getByText("Voting is closed.")).toBeVisible();

  // The final reveal needs the box ticked (rule 18).
  await page.getByRole("button", { name: "Start the reveal" }).click();
  const dialog = page.locator("dialog.confirm");
  await expect(dialog.getByRole("heading")).toHaveText("Reveal the final results?");
  await expect(dialog.getByRole("button", { name: "Reveal the winners" })).toBeDisabled();
  await dialog.getByLabel("I understand the results will be final").check();
  await dialog.getByRole("button", { name: "Reveal the winners" }).click();
  const stage = page.locator(".reveal");
  await expect(stage).toContainText("Tap to start");
  await stage.click();
  await expect(stage.locator(".place")).toHaveText("People's Choice");
  await expect(stage.locator(".cook")).toHaveText("Ben");
  await stage.click();
  await expect(stage.locator(".place")).toHaveText("2nd place");
  await expect(stage.locator(".votes")).toHaveText("Score 6.00");
  await stage.click();
  await expect(stage.locator(".place")).toHaveText("Champion!");
  await expect(stage.locator(".cook")).toHaveText("Ana");
  await expect(stage.locator(".votes")).toHaveText("Score 9.00");

  // No undo for a judged event.
  await page.goto(`/e/${eventId}`);
  await expect(page.getByText("The results are out, and final.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo the reveal" })).toHaveCount(0);

  // The organizer's export names the judge.
  const csv = await (await page.request.get(`/api/events/${eventId}/export.csv`)).text();
  expect(csv).toContain("Main,7,Ana,Brisket chili,1,9.00,1,0,Pat,9,9,9,9,9.00,More salt next time");

  // Guests see the scores and the breakdown, never the judge; a cook reads their comments by ticket.
  await guest.reload();
  await expect(guest.locator(".placings .votes")).toHaveText(["Score 9.00", "Score 6.00"]);
  await expect(guest.locator(".peoples-choice")).toContainText("Ben");
  await guest.locator(".breakdown summary").first().click();
  await expect(guest.locator(".breakdown li").first()).toHaveText("Taste: 9.00");
  await expect(guest.locator("main")).not.toContainText("Pat");
  await guest.getByLabel("Ticket number").fill("7");
  await guest.getByRole("button", { name: "Show comments" }).click();
  await expect(guest.locator(".comments li")).toHaveText("More salt next time");
});
