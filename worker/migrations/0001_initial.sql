CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  helpful TEXT NOT NULL CHECK(helpful IN ('yes','partly','no')),
  note TEXT NOT NULL,
  nickname TEXT NOT NULL,
  quote TEXT NOT NULL DEFAULT '',
  archetype TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL DEFAULT 'letter',
  mode TEXT NOT NULL DEFAULT 'experience',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_created_at ON reviews(created_at DESC);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_limits_expires ON rate_limits(expires);
