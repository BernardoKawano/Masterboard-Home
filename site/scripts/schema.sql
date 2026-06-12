-- Masterboard Supabase schema
-- Generated from docs/data-model.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
CREATE TYPE event_status AS ENUM ('upcoming', 'past', 'cancelled');
CREATE TYPE event_access_type AS ENUM ('public', 'members-only', 'invite-only');
CREATE TYPE member_tier AS ENUM ('member', 'vip', 'founding');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'prospect');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'approved', 'rejected');

-- Tables
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text,
  website text,
  logo_url text,
  city text,
  annual_revenue text,
  employee_count text,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  schedule_html text,
  date date NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  venue text NOT NULL,
  city text,
  country text NOT NULL DEFAULT 'BR',
  cover_image_url text,
  topics text[] NOT NULL DEFAULT '{}',
  edition_label text,
  edition_number integer,
  status event_status NOT NULL,
  access_type event_access_type NOT NULL DEFAULT 'public',
  drive_link text,
  registration_url text,
  seo_title text,
  seo_description text,
  is_published boolean NOT NULL DEFAULT true,
  source text,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  role_label text,
  role text,
  company text,
  bio text,
  photo_url text,
  company_logo_url text,
  linkedin_url text,
  topics text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  source text,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_speakers (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  speaker_id uuid NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  "order" integer,
  PRIMARY KEY (event_id, speaker_id)
);

CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  company_name text,
  role text,
  photo_url text,
  city text,
  tier member_tier NOT NULL DEFAULT 'member',
  status member_status NOT NULL DEFAULT 'active',
  joined_at date,
  source text,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  content_html text,
  date date NOT NULL,
  author text NOT NULL,
  category text,
  cover_image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  seo_title text,
  seo_description text,
  source text,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  city text,
  lgpd_consent boolean NOT NULL,
  source text,
  referrer text,
  status lead_status NOT NULL DEFAULT 'new',
  intent text,
  company_moment text,
  annual_revenue text,
  employee_count text,
  country_code text,
  whatsapp text,
  objective text,
  score integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'normal',
  assigned_to text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  evento_interesse text,
  website text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- Migration: add columns to existing databases
-- ALTER TABLE leads ADD COLUMN IF NOT EXISTS evento_interesse text;
-- ALTER TABLE leads ADD COLUMN IF NOT EXISTS website text;

CREATE TABLE lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE site_settings (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'text',
  value text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX ON events(slug);
CREATE INDEX ON events(date DESC);
CREATE INDEX ON events(status);
CREATE INDEX ON events(is_published);

CREATE UNIQUE INDEX ON speakers(slug);
CREATE UNIQUE INDEX ON members(email);
CREATE UNIQUE INDEX ON content_posts(slug);
CREATE INDEX ON content_posts(date DESC);
CREATE INDEX ON content_posts(is_published);
CREATE INDEX ON leads(status, submitted_at DESC);
CREATE INDEX ON leads(score DESC);
CREATE INDEX ON leads(priority);
CREATE INDEX ON leads(email);
CREATE INDEX ON leads(phone);
CREATE INDEX ON lead_activities(lead_id, created_at DESC);
CREATE INDEX ON admin_users(email);
CREATE INDEX ON admin_users(auth_user_id);
CREATE INDEX ON admin_audit_log(resource, created_at DESC);
CREATE INDEX ON admin_audit_log(actor_email, created_at DESC);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_events" ON events
  FOR SELECT USING (is_published = true);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_members" ON members
  FOR SELECT USING (auth.role() = 'service_role');

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_content_posts" ON content_posts
  FOR SELECT USING (is_published = true);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert_leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_leads" ON leads FOR SELECT USING (auth.role() = 'service_role');

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_lead_activities" ON lead_activities
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "admin_insert_lead_activities" ON lead_activities
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_manage_admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_site_settings" ON site_settings
  FOR SELECT USING (is_public = true);
CREATE POLICY "service_role_manage_site_settings" ON site_settings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_manage_admin_audit_log" ON admin_audit_log
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
