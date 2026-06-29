/**
 * Utilitários para migrar fotos de galeria do CDN Bubble para Supabase Storage.
 */

import {
  extensionFromContentType,
  extensionFromUrl,
  isSupabaseStorageUrl,
  normalizeImageUrl,
  safePathPart,
  shouldMigrateImageUrl,
} from './migrate-media-to-storage.mjs';

export const DEFAULT_GALLERY_BUCKET = 'site-media';
export const DEFAULT_GALLERY_PATH_PREFIX = 'gallery';

export function parseGalleryMigrateArgs(argv) {
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const bucketArg = argv.find((arg) => arg.startsWith('--bucket='));
  const concurrencyArg = argv.find((arg) => arg.startsWith('--concurrency='));
  const delayArg = argv.find((arg) => arg.startsWith('--delay-ms='));
  const galleryArg = argv.find((arg) => arg.startsWith('--gallery='));

  return {
    execute: argv.includes('--execute'),
    limit: limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Number.POSITIVE_INFINITY,
    bucket: bucketArg ? bucketArg.split('=')[1] : DEFAULT_GALLERY_BUCKET,
    concurrency: concurrencyArg ? Number.parseInt(concurrencyArg.split('=')[1], 10) : 2,
    delayMs: delayArg ? Number.parseInt(delayArg.split('=')[1], 10) : 400,
    gallerySlug: galleryArg ? galleryArg.split('=').slice(1).join('=') : null,
  };
}

export function buildGalleryStoragePath(gallerySlug, photo, contentType) {
  const galleryPart = safePathPart(gallerySlug);
  const photoPart = safePathPart(photo.source_id ?? photo.name);
  const extension = extensionFromContentType(contentType) ?? extensionFromUrl(photo.source_url ?? photo.file_url);
  return `${DEFAULT_GALLERY_PATH_PREFIX}/${galleryPart}/${photoPart}${extension}`;
}

export function shouldMigrateGalleryPhoto(photo) {
  const currentUrl = normalizeImageUrl(photo.file_url);
  const sourceUrl = normalizeImageUrl(photo.source_url);

  if (!currentUrl || !sourceUrl) return false;
  if (isSupabaseStorageUrl(currentUrl)) return false;
  return shouldMigrateImageUrl(sourceUrl);
}

export function pickGalleryMigrationCandidates(rows, options = {}) {
  const { limit = Number.POSITIVE_INFINITY, gallerySlug = null } = options;

  const filtered = rows
    .filter((row) => shouldMigrateGalleryPhoto(row))
    .filter((row) => !gallerySlug || row.gallery_slug === gallerySlug);

  return Number.isFinite(limit) ? filtered.slice(0, limit) : filtered;
}

export async function sleep(ms) {
  if (!ms || ms < 1) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWithConcurrency(items, concurrency, worker) {
  const results = [];
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(concurrency, 1), items.length || 1) },
    () => runWorker(),
  );

  await Promise.all(workers);
  return results;
}
