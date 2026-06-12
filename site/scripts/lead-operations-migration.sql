-- Lead operations fields and activity history.
-- Safe to run more than once on the existing Supabase database.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS company_moment text,
  ADD COLUMN IF NOT EXISTS annual_revenue text,
  ADD COLUMN IF NOT EXISTS employee_count text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_status_submitted_at_idx ON leads(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS leads_score_idx ON leads(score DESC);
CREATE INDEX IF NOT EXISTS leads_priority_idx ON leads(priority);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads(phone);
CREATE INDEX IF NOT EXISTS lead_activities_lead_id_created_at_idx ON lead_activities(lead_id, created_at DESC);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_lead_activities" ON lead_activities;
CREATE POLICY "admin_read_lead_activities" ON lead_activities
  FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admin_insert_lead_activities" ON lead_activities;
CREATE POLICY "admin_insert_lead_activities" ON lead_activities
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
