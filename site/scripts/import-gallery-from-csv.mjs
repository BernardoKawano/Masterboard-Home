/**
 * Importa galerias e fotos do export CSV do Bubble para o Supabase.
 * Não chama a API do Bubble — apenas grava metadados e URLs do CDN.
 *
 * Uso:
 *   node scripts/import-gallery-from-csv.mjs --csv="C:\path\export_All-Fotos.csv"
 *   node scripts/import-gallery-from-csv.mjs --csv="..." --limit=50
 *   node scripts/import-gallery-from-csv.mjs --csv="..." --execute
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildGalleryImportPlan,
  chunkArray,
  parseCsv,
  parseImportArgs,
} from './gallery-import-utils.mjs';
import { createServiceSupabaseClient } from './env.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const defaultCsvPath = path.join(projectRoot, 'data', 'bubble-gallery-fotos.csv');

async function loadCsvRows(csvPath) {
  const source = await readFile(csvPath, 'utf8');
  const rows = parseCsv(source);

  if (rows.length === 0) {
    throw new Error(`CSV vazio ou inválido: ${csvPath}`);
  }

  return rows;
}

async function upsertGalleries(supabase, galleries) {
  const { data, error } = await supabase
    .from('galleries')
    .upsert(galleries, { onConflict: 'slug' })
    .select('id, slug');

  if (error) throw new Error(`Upsert galleries: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.slug, row.id]));
}

async function upsertPhotoBatch(supabase, batch) {
  const { error } = await supabase
    .from('gallery_photos')
    .upsert(batch, { onConflict: 'source_id' });

  if (error) throw new Error(`Upsert gallery_photos: ${error.message}`);
}

function attachGalleryIds(photos, galleryIdBySlug) {
  return photos.map((photo) => {
    const galleryId = galleryIdBySlug.get(photo.gallery_slug);
    if (!galleryId) {
      throw new Error(`Galeria não encontrada após upsert: ${photo.gallery_slug}`);
    }

    const { gallery_slug: _gallerySlug, ...rest } = photo;
    return {
      ...rest,
      gallery_id: galleryId,
    };
  });
}

async function main() {
  const args = parseImportArgs(process.argv.slice(2));
  const csvPath = path.resolve(args.csvPath ?? defaultCsvPath);
  const csvRows = await loadCsvRows(csvPath);
  const limitedRows = Number.isFinite(args.limit) ? csvRows.slice(0, args.limit) : csvRows;
  const plan = buildGalleryImportPlan(limitedRows);

  console.log(`\nGaleria CSV: ${csvPath}`);
  console.log(`Modo: ${args.execute ? 'EXECUTE' : 'DRY-RUN'}`);
  console.log(`Linhas lidas: ${csvRows.length}`);
  console.log(`Linhas processadas: ${limitedRows.length}`);
  console.log(`Galerias: ${plan.galleries.length}`);
  console.log(`Fotos: ${plan.photos.length}`);
  console.log(`Ignoradas: ${plan.skipped.length}`);

  if (plan.galleries.length > 0) {
    console.log('\nGalerias:');
    for (const gallery of plan.galleries) {
      const photoCount = plan.photos.filter((photo) => photo.gallery_slug === gallery.slug).length;
      console.log(`  - ${gallery.name} (${photoCount} fotos)`);
    }
  }

  if (plan.photos.length > 0) {
    console.log('\nAmostra de fotos:');
    for (const photo of plan.photos.slice(0, 5)) {
      console.log(`  - ${photo.gallery_slug} | ${photo.name} | ${photo.file_url}`);
    }
  }

  if (!args.execute) {
    console.log('\nNenhuma escrita feita. Rode com --execute após aplicar a migration no Supabase.');
    return;
  }

  const supabase = await createServiceSupabaseClient();
  const galleryIdBySlug = await upsertGalleries(supabase, plan.galleries);
  const photosWithGalleryIds = attachGalleryIds(plan.photos, galleryIdBySlug);
  const batches = chunkArray(photosWithGalleryIds, args.batchSize);

  let imported = 0;
  for (const [index, batch] of batches.entries()) {
    await upsertPhotoBatch(supabase, batch);
    imported += batch.length;
    process.stdout.write(`  Fotos importadas: ${imported}/${photosWithGalleryIds.length} (lote ${index + 1}/${batches.length})\r`);
  }

  console.log(`\n\nImportação concluída: ${plan.galleries.length} galeria(s), ${photosWithGalleryIds.length} foto(s).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
