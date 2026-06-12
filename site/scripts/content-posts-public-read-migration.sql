-- Enable public reads for published blog posts.
-- Safe to run more than once on an existing Supabase project.

CREATE UNIQUE INDEX IF NOT EXISTS content_posts_slug_idx ON content_posts(slug);
CREATE INDEX IF NOT EXISTS content_posts_date_desc_idx ON content_posts(date DESC);
CREATE INDEX IF NOT EXISTS content_posts_is_published_idx ON content_posts(is_published);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_content_posts" ON content_posts;
CREATE POLICY "public_read_content_posts" ON content_posts
  FOR SELECT USING (is_published = true);
