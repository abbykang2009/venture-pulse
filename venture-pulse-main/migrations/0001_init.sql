-- Run once against your D1 database (see README.md).
-- Safe to re-run: every statement uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  telegram_id   TEXT PRIMARY KEY,          -- verified numeric Telegram user id (as text)
  username      TEXT,                      -- may be NULL: not every Telegram user has one
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT,
  photo_url     TEXT,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS deals (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  stage         TEXT,
  rate          TEXT,
  originCity    TEXT,
  hqCity        TEXT,
  description   TEXT,
  imageUrl      TEXT,
  postedBy      TEXT,                      -- legacy display name, kept for old rows
  listingType   TEXT NOT NULL DEFAULT 'Business',
  posted_by_id  TEXT,                      -- users.telegram_id of the author
  createdAt     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_deals_owner   ON deals(posted_by_id);

-- One vote per user per deal.
CREATE TABLE IF NOT EXISTS votes (
  deal_id     TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  vote_type   TEXT NOT NULL CHECK (vote_type IN ('verify', 'dispute')),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (deal_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  deal_id     TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  author      TEXT NOT NULL,
  text        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_deal ON comments(deal_id, created_at);
