-- Pro events, part 3: results (SW-25; the vault's pro-events.md, rules 2, 14 and 16–19).

-- Rule 2: a People's Choice award from the guests' votes. On by default, since
-- guests at a cookoff expect to vote; off means guests only see the dishes.
ALTER TABLE events ADD COLUMN peoples_choice INTEGER NOT NULL DEFAULT 1;
-- Rule 16: an optional Grand Champion across every category.
ALTER TABLE events ADD COLUMN grand_champion INTEGER NOT NULL DEFAULT 0;
-- Rule 14: cooks can read the judges' comments on their own dish after the
-- reveal, by typing their ticket number. Off by default: tickets are guessable.
ALTER TABLE events ADD COLUMN cook_comments INTEGER NOT NULL DEFAULT 0;
