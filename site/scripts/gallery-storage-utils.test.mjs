import assert from 'node:assert/strict';
import {
  buildGalleryStoragePath,
  parseGalleryMigrateArgs,
  pickGalleryMigrationCandidates,
  shouldMigrateGalleryPhoto,
} from './gallery-storage-utils.mjs';

assert.deepEqual(parseGalleryMigrateArgs([]), {
  execute: false,
  limit: Number.POSITIVE_INFINITY,
  bucket: 'site-media',
  concurrency: 2,
  delayMs: 400,
  gallerySlug: null,
});

assert.deepEqual(parseGalleryMigrateArgs(['--execute', '--limit=25', '--gallery=15-28-02-salesforce']), {
  execute: true,
  limit: 25,
  bucket: 'site-media',
  concurrency: 2,
  delayMs: 400,
  gallerySlug: '15-28-02-salesforce',
});

const bubblePhoto = {
  source_id: 'f123x456',
  name: 'Foto5000.jpg',
  file_url: 'https://cdn.bubble.io/f123x456/Foto5000.jpg',
  source_url: 'https://cdn.bubble.io/f123x456/Foto5000.jpg',
  gallery_slug: '15-28-02-salesforce',
};

const migratedPhoto = {
  ...bubblePhoto,
  file_url: 'https://example.supabase.co/storage/v1/object/public/site-media/gallery/15-28-02-salesforce/f123x456.jpg',
};

assert.equal(shouldMigrateGalleryPhoto(bubblePhoto), true);
assert.equal(shouldMigrateGalleryPhoto(migratedPhoto), false);

assert.equal(
  buildGalleryStoragePath('15-28-02-salesforce', bubblePhoto, 'image/jpeg'),
  'gallery/15-28-02-salesforce/f123x456.jpg',
);

const candidates = pickGalleryMigrationCandidates(
  [bubblePhoto, migratedPhoto, { ...bubblePhoto, gallery_slug: 'outra' }],
  { gallerySlug: '15-28-02-salesforce', limit: 1 },
);

assert.equal(candidates.length, 1);
assert.equal(candidates[0].source_id, 'f123x456');

console.log('gallery-storage-utils.test.mjs: ok');
