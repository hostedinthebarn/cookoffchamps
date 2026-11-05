import type { Env } from "./env";
import { HttpError } from "./http";

export type Status = "setup" | "open" | "closed" | "revealed";
export type Kind = "family" | "pro";

export interface EventRow {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
  status: Status;
  kind: Kind;
  created_by: string;
  created_at: string;
}

export type Role = "creator" | "co";

export async function loadEvent(env: Env, eventId: string): Promise<EventRow> {
  const event = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(eventId).first<EventRow>();
  if (!event) throw new HttpError(404, "Event not found", "eventNotFound");
  return event;
}

/** The caller's role on the event; 404 if there's no such event, 403 if not an organizer. */
export async function requireOrganizer(env: Env, eventId: string, email: string): Promise<{ event: EventRow; role: Role }> {
  const event = await loadEvent(env, eventId);
  const row = await env.DB.prepare("SELECT role FROM organizers WHERE event_id = ? AND email = ?")
    .bind(eventId, email)
    .first<{ role: Role }>();
  if (!row) throw new HttpError(403, "You are not an organizer of this event", "notOrganizer");
  return { event, role: row.role };
}

/** Only the creator can delete the event or manage co-organizers (decision 16). */
export async function requireCreator(env: Env, eventId: string, email: string): Promise<EventRow> {
  const { event, role } = await requireOrganizer(env, eventId, email);
  if (role !== "creator") throw new HttpError(403, "Only the event's creator can do that", "creatorOnly");
  return event;
}

/** Pro events can be created while the preview is on (SW-25). */
export function proPreview(env: Env): boolean {
  return env.PRO_PREVIEW === "on";
}

/** The kind a request asked for: family unless it says pro, which the preview must allow. */
export function requireKind(value: unknown, env: Env): Kind {
  if (value === undefined || value === null || value === "family") return "family";
  if (value !== "pro") throw new HttpError(400, "kind must be family or pro");
  if (!proPreview(env)) throw new HttpError(403, "Pro events aren't available yet", "proUnavailable");
  return "pro";
}

/** Judges and ticket numbers belong to pro events only. */
export function requirePro(event: EventRow): void {
  if (event.kind !== "pro") throw new HttpError(409, "That's only for pro events", "notPro");
}

/** Entries and categories can change only before voting closes. */
export function requireEditable(event: EventRow): void {
  if (event.status === "closed" || event.status === "revealed") {
    throw new HttpError(409, "Voting has closed, so the entries can no longer change", "entriesFrozen");
  }
}

/** The event that owns a category, checked against the caller. */
export async function categoryEvent(env: Env, categoryId: string, email: string) {
  const row = await env.DB.prepare("SELECT event_id FROM categories WHERE id = ?")
    .bind(categoryId)
    .first<{ event_id: string }>();
  if (!row) throw new HttpError(404, "Category not found", "categoryNotFound");
  return requireOrganizer(env, row.event_id, email);
}

/** The event that owns an entry, checked against the caller. */
export async function entryEvent(env: Env, entryId: string, email: string) {
  const row = await env.DB.prepare(
    "SELECT c.event_id FROM entries e JOIN categories c ON c.id = e.category_id WHERE e.id = ?",
  )
    .bind(entryId)
    .first<{ event_id: string }>();
  if (!row) throw new HttpError(404, "Entry not found", "entryNotFound");
  return requireOrganizer(env, row.event_id, email);
}
