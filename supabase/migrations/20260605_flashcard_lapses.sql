-- Leech detection for flashcards.
-- Tracks how many times a card has lapsed (rated "Errei"/q<3) so chronically
-- failed cards can be surfaced instead of churning at interval=1 forever.
-- Safe & idempotent: adds a NOT NULL column with a default; backfills existing
-- rows to 0 automatically.

alter table flashcards
  add column if not exists lapses integer not null default 0;
