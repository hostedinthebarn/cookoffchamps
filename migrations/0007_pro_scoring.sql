-- Pro events, part 2: scoring (SW-25; the vault's pro-events.md, rules 6 and 8–15).

-- Rule 11: drop each dish's highest and lowest judge when 5 or more scored it.
-- An organizer setting, on by default.
ALTER TABLE events ADD COLUMN drop_outliers INTEGER NOT NULL DEFAULT 1;
-- Rule 6: judges see the ticket number only, unless the organizer turns this on.
ALTER TABLE events ADD COLUMN show_dish_names INTEGER NOT NULL DEFAULT 0;

-- Rule 8: one weighted set of criteria per event, from an editable preset.
CREATE TABLE criteria (
  id        TEXT PRIMARY KEY,
  event_id  TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  weight    REAL NOT NULL CHECK (weight > 0 AND weight <= 5),
  position  INTEGER NOT NULL
);
CREATE INDEX criteria_by_event ON criteria(event_id, position);

-- One judge's card for one dish. submitted_at set means it's locked (rule 10);
-- the organizer can unlock it before the reveal, which clears it until the
-- judge submits again. The comment is optional (rule 14).
CREATE TABLE scorecards (
  judge_id      TEXT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  entry_id      TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  comment       TEXT,
  submitted_at  TEXT,
  PRIMARY KEY (judge_id, entry_id)
);

-- Rule 9: a whole number from 1 to 10 per criterion.
CREATE TABLE scores (
  judge_id      TEXT NOT NULL,
  entry_id      TEXT NOT NULL,
  criterion_id  TEXT NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  PRIMARY KEY (judge_id, entry_id, criterion_id),
  FOREIGN KEY (judge_id, entry_id) REFERENCES scorecards(judge_id, entry_id) ON DELETE CASCADE
);
