-- Paper ballots (SW-92): counts typed in by the organizer after voting closes,
-- added to the phone votes. A paper ballot carries no identity, so these are
-- totals per dish, not rows per ballot. Family events only.
CREATE TABLE paper_votes (
  category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  entry_id     TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  count        INTEGER NOT NULL CHECK (count >= 0),
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (category_id, entry_id)
);
CREATE INDEX paper_votes_by_entry ON paper_votes(entry_id);

-- How many paper ballots the organizer handed out. Optional: it only powers a
-- warning when a category's paper total is more than that.
ALTER TABLE events ADD COLUMN paper_ballots INTEGER;
