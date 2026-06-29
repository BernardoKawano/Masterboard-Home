/**
 * Baixa fotos de galeria do CDN Bubble e envia para Supabase Storage.
 * Não chama a API do Bubble — apenas GET no CDN + escrita no Supabase.
 *
 * Uso:
 *   node scripts/migrate-gallery-photos-to-storage.mjs
 *   node scripts/migrate-gallery-photos-to-storage.mjs --limit=20
 *   node scripts/migrate-gallery-photos-to-storage.mjs --gallery=15-28-02-salesforce --execute
 *   node scripts/migrate-gallery-photos-to-storage.mjs --execute --concurrency=2 --delay-ms=500
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServiceSupabaseClient } from './env.mjs';
import {
  buildGalleryStoragePath,
  parseGalleryMigrateArgs,
  pickGalleryMigrationCandidates,
  runWithConcurrency,
  sleep,
} from './gallery-storage-utils.mjs';
import { normalizeImageUrl } from './migrate-media-to-storage.mjs';

async function ensurePublicBucket(supabase, bucket) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Listar buckets: ${error.message}`);

  if (data?.some((item) => item.name === bucket)) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, { public: true });
  if (createError) throw new Error(`Criar bucket ${bucket}: ${createError.message}`);
}

async function downloadImage(url) {
  const response = await fetch(normalizeImageUrl(url), {
    headers: { 'User-Agent': 'masterboard-gallery-migration/1.0' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao baixar ${url}`);
  }

  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`Tipo inesperado ${contentType} para ${url}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType,
  };
}

async function listCandidatePhotos(supabase, gallerySlug) {
  const pageSize = 1000;
  const allRows = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('gallery_photos')
      .select('id, name, file_url, source_url, source_id, gallery_id, galleries!inner(slug)')
      .order('sort_order', { ascending: true })
      .range(from, from + pageSize - 1);

    if (gallerySlug) {
      query = query.eq('galleries.slug', gallerySlug);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Listar fotos: ${error.message}`);

    const batch = data ?? [];
    allRows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return allRows.map((row) => ({
    id: row.id,
    name: row.name,
    file_url: row.file_url,
    source_url: row.source_url,
    source_id: row.source_id,
    gallery_id: row.gallery_id,
    gallery_slug: row.galleries?.slug ?? null,
  }));
}

async function migratePhoto({ supabase, photo, bucket }) {
  const sourceUrl = normalizeImageUrl(photo.source_url ?? photo.file_url);
  const { buffer, contentType } = await downloadImage(sourceUrl);
  const storagePath = buildGalleryStoragePath(photo.gallery_slug, photo, contentType);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const migratedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('gallery_photos')
    .update({
      file_url: publicUrl,
      migrated_at: migratedAt,
      updated_at: migratedAt,
    })
    .eq('id', photo.id);

  if (updateError) throw new Error(updateError.message);

  return publicUrl;
}

async function main() {
  const args = parseGalleryMigrateArgs(process.argv.slice(2));
  const supabase = await createServiceSupabaseClient();
  const rows = await listCandidatePhotos(supabase, args.gallerySlug);
  const candidates = pickGalleryMigrationCandidates(rows, {
    limit: args.limit,
    gallerySlug: args.gallerySlug,
  });

  console.log(`\nMigração de fotos de galeria ${args.execute ? '[EXECUTE]' : '[DRY-RUN]'}`);
  console.log(`Bucket: ${args.bucket}`);
  console.log(`Concorrência: ${args.concurrency} | Delay: ${args.delayMs}ms`);
  if (args.gallerySlug) console.log(`Galeria: ${args.gallerySlug}`);
  console.log(`Candidatas: ${candidates.length} de ${rows.length} foto(s) listada(s)`);

  if (candidates.length > 0) {
    console.log('\nAmostra:');
    for (const photo of candidates.slice(0, 5)) {
      console.log(`  - ${photo.gallery_slug} | ${photo.name} | ${photo.source_url ?? photo.file_url}`);
    }
  }

  if (!args.execute) {
    console.log('\nNenhuma escrita feita. Rode com --execute para migrar arquivos.');
    return;
  }

  await ensurePublicBucket(supabase, args.bucket);

  let migrated = 0;
  let failed = 0;
  const errors = [];
  const batchSize = args.concurrency;

  for (let offset = 0; offset < candidates.length; offset += batchSize) {
    const batch = candidates.slice(offset, offset + batchSize);

    const results = await runWithConcurrency(batch, args.concurrency, async (photo) => {
      try {
        const publicUrl = await migratePhoto({ supabase, photo, bucket: args.bucket });
        return { ok: true, photo, publicUrl };
      } catch (error) {
        return { ok: false, photo, error };
      }
    });

    for (const result of results) {
      if (result.ok) {
        migrated += 1;
      } else {
        failed += 1;
        errors.push({ name: result.photo.name, error: result.error.message });
      }
    }

    const done = migrated + failed;
    if (done % 50 === 0 || done === candidates.length) {
      console.log(`  Progresso: ${done}/${candidates.length} (${migrated} ok, ${failed} erros)`);
    }
    await sleep(args.delayMs);
  }

  console.log(`\n\nConcluído: ${migrated} migrada(s), ${failed} erro(s).`);
  if (errors.length > 0) {
    console.log('\nErros:');
    for (const item of errors.slice(0, 10)) {
      console.log(`  - ${item.name}: ${item.error}`);
    }
    if (errors.length > 10) {
      console.log(`  ... e mais ${errors.length - 10} erro(s).`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
