-- Gallery metadata imported from Bubble CSV export.
-- Safe to run more than once on an existing Supabase project.

CREATE TABLE IF NOT EXISTS galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  sort_order integer,
  is_published boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'bubble',
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  source_url text,
  sort_order integer,
  bubble_creator text,
  source text NOT NULL DEFAULT 'bubble',
  source_id text,
  created_at timestamptz,
  migrated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS galleries_slug_idx ON galleries(slug);
CREATE INDEX IF NOT EXISTS galleries_sort_order_idx ON galleries(sort_order);
CREATE INDEX IF NOT EXISTS galleries_is_published_idx ON galleries(is_published);

CREATE UNIQUE INDEX IF NOT EXISTS gallery_photos_source_id_unique_idx ON gallery_photos(source_id);
CREATE INDEX IF NOT EXISTS gallery_photos_gallery_id_idx ON gallery_photos(gallery_id);
CREATE INDEX IF NOT EXISTS gallery_photos_gallery_sort_idx ON gallery_photos(gallery_id, sort_order);

ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_galleries" ON galleries;
CREATE POLICY "public_read_galleries" ON galleries
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "public_read_gallery_photos" ON gallery_photos;
CREATE POLICY "public_read_gallery_photos" ON gallery_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM galleries
      WHERE galleries.id = gallery_photos.gallery_id
        AND galleries.is_published = true
    )
  );

DROP POLICY IF EXISTS "service_role_manage_galleries" ON galleries;
CREATE POLICY "service_role_manage_galleries" ON galleries
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_manage_gallery_photos" ON gallery_photos;
CREATE POLICY "service_role_manage_gallery_photos" ON gallery_photos
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
