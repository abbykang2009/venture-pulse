ALTER TABLE deals ADD COLUMN also_global INTEGER NOT NULL DEFAULT 0;

ALTER TABLE deals ADD COLUMN contact_info TEXT;

ALTER TABLE deals ADD COLUMN social_link TEXT;

ALTER TABLE deals ADD COLUMN contact_public INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_deals_also_global ON deals(also_global);
