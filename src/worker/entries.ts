import { categoryEvent, entryEvent, requireEditable, type EventRow } from "./access";
import { requireSession } from "./auth";
import type { Env } from "./env";
import { HttpError, json, requireText } from "./http";
import { newId } from "./ids";
import { checkPhoto, putPhoto } from "./photos";

// The organizer adds every entry, usually at the table (decision 10): cook,
// dish and photo, sent as multipart form data so the photo rides along.

async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new HttpError(400, "Send the entry as form data");
  }
}

/** The uploaded photo with its checked type, or null if none was sent. */
async function photoFrom(form: FormData): Promise<{ file: File; type: string } | null> {
  const value = form.get("photo");
  if (!(value instanceof File) || value.size === 0) return null;
  return { file: value, type: await checkPhoto(value) };
}

/**
 * The dish name. A pro event lists its cooks before turn-in, often before anyone
 * knows what they're bringing (rule 4), so there it may be left empty.
 */
function dishFrom(form: FormData, event: EventRow): string {
  const value = form.get("dishName");
  if (event.kind === "pro" && (value === null || (typeof value === "string" && value.trim() === ""))) return "";
  return requireText(value, "dishName", 80);
}

// A raffle ticket's number as printed: digits, perhaps with letters or a dash.
const TICKET_RE = /^[A-Z0-9-]{1,12}$/;

/**
 * The raffle-ticket number from the form (rule 3), for a pro event: uppercased,
 * and empty means "not turned in yet". Unique within the event, so two dishes
 * can never answer to the same number. A family event has no tickets, and any
 * sent are ignored.
 */
async function ticketFrom(env: Env, form: FormData, event: EventRow, entryId: string): Promise<string | null | undefined> {
  if (event.kind !== "pro" || !form.has("ticket")) return undefined;
  const value = form.get("ticket");
  const ticket = typeof value === "string" ? value.trim().toUpperCase() : null;
  if (ticket === "") return null;
  if (ticket === null || !TICKET_RE.test(ticket)) throw new HttpError(400, "A ticket number is up to 12 letters, digits or dashes", "badTicket");
  const clash = await env.DB.prepare(
    "SELECT 1 FROM entries e JOIN categories c ON c.id = e.category_id WHERE c.event_id = ? AND e.ticket = ? AND e.id <> ?",
  )
    .bind(event.id, ticket, entryId)
    .first();
  if (clash) throw new HttpError(409, `Ticket ${ticket} is already on another dish`, "ticketTaken");
  return ticket;
}

/** POST /api/categories/:id/entries (form: cookName, dishName, photo?, ticket?) */
export async function addEntry(request: Request, env: Env, categoryId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await categoryEvent(env, categoryId, email);
  requireEditable(event);
  const form = await readForm(request);
  const cookName = requireText(form.get("cookName"), "cookName", 80);
  const dishName = dishFrom(form, event);
  const id = newId();
  const ticket = (await ticketFrom(env, form, event, id)) ?? null;
  const photo = await photoFrom(form);

  const photoKey = photo ? await putPhoto(env, event.id, id, photo.file, photo.type) : null;
  // Numbers run on within the category: "Entry 3" matches tent card 3 (decision 11).
  const row = await env.DB.prepare(
    `INSERT INTO entries (id, category_id, number, cook_name, dish_name, photo_key, ticket)
     VALUES (?, ?, (SELECT COALESCE(MAX(number), 0) + 1 FROM entries WHERE category_id = ?), ?, ?, ?, ?)
     RETURNING number`,
  )
    .bind(id, categoryId, categoryId, cookName, dishName, photoKey, ticket)
    .first<{ number: number }>();
  return json({ id, number: row!.number, photoKey, ticket }, 201);
}

/** PATCH /api/entries/:id (form: cookName?, dishName?, photo?, ticket?) */
export async function updateEntry(request: Request, env: Env, entryId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await entryEvent(env, entryId, email);
  requireEditable(event);
  const form = await readForm(request);
  const current = await env.DB.prepare("SELECT cook_name, dish_name, photo_key, ticket FROM entries WHERE id = ?")
    .bind(entryId)
    .first<{ cook_name: string; dish_name: string; photo_key: string | null; ticket: string | null }>();

  const cookName = form.has("cookName") ? requireText(form.get("cookName"), "cookName", 80) : current!.cook_name;
  const dishName = form.has("dishName") ? dishFrom(form, event) : current!.dish_name;
  const sent = await ticketFrom(env, form, event, entryId);
  const ticket = sent === undefined ? current!.ticket : sent;
  const photo = await photoFrom(form);
  let photoKey = current!.photo_key;
  if (photo) {
    photoKey = await putPhoto(env, event.id, entryId, photo.file, photo.type);
    if (current!.photo_key) await env.PHOTOS.delete(current!.photo_key);
  }

  await env.DB.prepare("UPDATE entries SET cook_name = ?, dish_name = ?, photo_key = ?, ticket = ? WHERE id = ?")
    .bind(cookName, dishName, photoKey, ticket, entryId)
    .run();
  return json({ ok: true, photoKey, ticket });
}

/** DELETE /api/entries/:id — its votes go with it. Numbers are not reshuffled, so printed cards stay right. */
export async function deleteEntry(request: Request, env: Env, entryId: string): Promise<Response> {
  const email = await requireSession(request, env);
  const { event } = await entryEvent(env, entryId, email);
  requireEditable(event);
  const row = await env.DB.prepare("DELETE FROM entries WHERE id = ? RETURNING photo_key")
    .bind(entryId)
    .first<{ photo_key: string | null }>();
  if (row!.photo_key) await env.PHOTOS.delete(row!.photo_key);
  return json({ ok: true });
}
