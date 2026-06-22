-- Admin self-service migration.
-- Safe to run on an existing Supabase/Postgres database.

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'text',
  value text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
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

CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email);
CREATE INDEX IF NOT EXISTS admin_users_auth_user_id_idx ON admin_users(auth_user_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_resource_created_at_idx ON admin_audit_log(resource, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_email_created_at_idx ON admin_audit_log(actor_email, created_at DESC);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'service_role_manage_admin_users'
  ) THEN
    CREATE POLICY "service_role_manage_admin_users" ON admin_users
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings' AND policyname = 'public_read_site_settings'
  ) THEN
    CREATE POLICY "public_read_site_settings" ON site_settings
      FOR SELECT USING (is_public = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings' AND policyname = 'service_role_manage_site_settings'
  ) THEN
    CREATE POLICY "service_role_manage_site_settings" ON site_settings
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'service_role_manage_admin_audit_log'
  ) THEN
    CREATE POLICY "service_role_manage_admin_audit_log" ON admin_audit_log
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

GRANT SELECT ON site_settings TO anon, authenticated;

INSERT INTO site_settings (key, label, description, type, value, is_public, updated_by, updated_at)
VALUES
  ('brand.primaryColor', 'Cor principal', 'Usada nos botões primários e destaques.', 'color', '#FBBE0A', true, 'migration', now()),
  ('brand.primaryHoverColor', 'Cor principal no hover', 'Usada quando o cursor passa sobre botões primários.', 'color', '#C99703', true, 'migration', now()),
  ('home.hero.eyebrow', 'Hero: chamada superior', null, 'text', '', true, 'migration', now()),
  ('home.hero.pill', 'Hero: selo', null, 'text', '', true, 'migration', now()),
  ('home.hero.line1', 'Hero: linha 1', null, 'text', 'Ecossistema empresarial', true, 'migration', now()),
  ('home.hero.line2', 'Hero: linha 2', null, 'text', 'de educação', true, 'migration', now()),
  ('home.hero.highlight', 'Hero: destaque', null, 'text', 'e negócios', true, 'migration', now()),
  ('home.hero.line3', 'Hero: linha final', null, 'text', '', true, 'migration', now()),
  ('home.hero.description', 'Hero: descrição', null, 'textarea', 'Reunimos métodos, experiências e aprendizados de grandes executivos que construíram resultados em empresas como Microsoft, Salesforce, Amazon, SAP, Azul e Wellhub para ajudar empresários a tomar melhores decisões, desenvolver seus times e construir negócios preparados para crescer.', true, 'migration', now()),
  ('home.hero.primaryCtaLabel', 'Hero: texto do botão principal', null, 'text', 'Quero participar', true, 'migration', now()),
  ('home.hero.primaryCtaHref', 'Hero: link do botão principal', null, 'url', '/aplicacao/', true, 'migration', now()),
  ('home.hero.secondaryCtaLabel', 'Hero: texto do botão secundário', null, 'text', 'Ver experiências', true, 'migration', now()),
  ('home.hero.secondaryCtaHref', 'Hero: link do botão secundário', null, 'url', '#experiencias', true, 'migration', now())
ON CONFLICT (key) DO NOTHING;

-- After creating a user in Supabase Auth, link it to the admin:
-- INSERT INTO admin_users (auth_user_id, email, name, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin@masterboard.com.br', 'Admin Masterboard', 'admin');
