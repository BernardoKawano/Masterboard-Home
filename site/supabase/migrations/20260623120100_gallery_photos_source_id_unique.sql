-- PostgREST upsert requires a non-partial unique constraint on source_id.
DROP INDEX IF EXISTS gallery_photos_source_id_idx;

ALTER TABLE gallery_photos
  ALTER COLUMN source_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gallery_photos_source_id_unique_idx
  ON gallery_photos(source_id);
