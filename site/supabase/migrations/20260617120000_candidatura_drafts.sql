-- Candidatura drafts: progressive lead capture + CNPJ

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'draft';

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS form_step smallint NOT NULL DEFAULT 0;

ALTER TABLE leads
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN company DROP NOT NULL,
  ALTER COLUMN role DROP NOT NULL,
  ALTER COLUMN lgpd_consent SET DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_draft_unique
  ON leads (lower(email))
  WHERE status = 'draft';
