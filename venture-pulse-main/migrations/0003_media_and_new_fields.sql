CREATE TABLE IF NOT EXISTS deal_media (deal_id TEXT NOT NULL, position INTEGER NOT NULL, media_key TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('image', 'video')), PRIMARY KEY (deal_id, position));
CREATE INDEX IF NOT EXISTS idx_deal_media_deal ON deal_media(deal_id, position);
ALTER TABLE deals ADD COLUMN budget INTEGER;
ALTER TABLE deals ADD COLUMN currency TEXT;
-- Old rows: a bare 'Business' was just the default for every normal post, not an admin tag, so it becomes "no ribbon".
-- Rows already tagged 'VC' by an admin keep their tag as-is.
UPDATE deals SET listingType = '' WHERE listingType = 'Business' OR listingType IS NULL;
