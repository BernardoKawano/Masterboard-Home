-- Member display fields for the public site.
-- Safe to run more than once on the existing Supabase database.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS photo_url text;

UPDATE members AS m
SET company_name = c.name
FROM companies AS c
WHERE m.company_id = c.id
  AND m.company_name IS NULL;
