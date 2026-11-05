-- Pro events, part 1 (SW-25). The design is the vault's pro-events.md; this is
-- rules 1, 3, 4 and 5: the kind of event, raffle-ticket numbers, and judges.

-- Rule 1: Family or Pro, chosen when the event is created, fixed once voting
-- opens. Every event before this one is a family event.
ALTER TABLE events ADD COLUMN kind TEXT NOT NULL DEFAULT 'family' CHECK (kind IN ('family', 'pro'));

-- Rule 3: the raffle-ticket number the organizer types in at turn-in. It
-- replaces "Entry N" for guests and judges in a pro event. Unique within the
-- event, which entries can't express (they hang off categories), so it's
-- checked in src/worker/entries.ts. Null until the dish is turned in, and
-- always null in a family event.
ALTER TABLE entries ADD COLUMN ticket TEXT;

-- Rule 5: a judge has a name and a personal link, and no account. The id is the
-- link (/j/<id>), so it's as unguessable as an event id. Revoking a judge keeps
-- the row, so scores they've already given stay tied to them.
CREATE TABLE judges (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  revoked_at  TEXT
);
CREATE INDEX judges_by_event ON judges(event_id, created_at);
