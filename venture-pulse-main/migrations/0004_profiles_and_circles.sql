CREATE TABLE IF NOT EXISTS circles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  creator_id  TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS circle_join_requests (
  circle_id      TEXT NOT NULL,
  telegram_id    TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('pending', 'declined')),
  recommended_by TEXT,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (circle_id, telegram_id)
);

ALTER TABLE deals ADD COLUMN circle_id TEXT;
CREATE INDEX IF NOT EXISTS idx_deals_circle ON deals(circle_id);
