-- ONLY needed if your `deals` table already existed before 0001_init.sql
-- (0001 skips creating it in that case, so it won't have the new columns).
--
-- Run each statement on its own. If D1 answers "duplicate column name",
-- that column is already there and you can ignore that error.

ALTER TABLE deals ADD COLUMN listingType TEXT NOT NULL DEFAULT 'Business';
ALTER TABLE deals ADD COLUMN posted_by_id TEXT;
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(posted_by_id);
