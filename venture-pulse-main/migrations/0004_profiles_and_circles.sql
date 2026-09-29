-- Circles: small private investor groups (up to 50 members).
CREATE TABLE IF NOT EXISTS circles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  creator_id  TEXT NOT NULL,          -- users.telegram_id; the only member who can add/remove members
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS circle_members (
  circle_id   TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('creator', 'member')),
  joined_at   INTEGER NOT NULL,
  PRIMARY KEY (circle_id, telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(telegram_id);

-- One open request per (circle, user). recommended_by is set when a member nominates someone else.
CREATE TABLE IF NOT EXISTS circle_join_requests (
  circle_id      TEXT NOT NULL,
  telegram_id    TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('pending', 'declined')),
  recommended_by TEXT,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (circle_id, telegram_id)
);

-- Every deal belongs to the global feed (circle_id NULL) or exactly one circle (hidden from global search).
ALTER TABLE deals ADD COLUMN circle_id TEXT;
CREATE INDEX IF NOT EXISTS idx_deals_circle ON deals(circle_id);
