/**
 * Aplica fotos curadas de member-photo-overrides.json no Supabase Storage.
 *
 * Uso:
 *   node scripts/apply-member-photo-overrides.mjs --dry-run
 *   node scripts/apply-member-photo-overrides.mjs --apply
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServiceSupabaseClient } from './env.mjs';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const { normalizePersonNameKey } = loadTsModuleFromPath('../src/lib/member-photo.ts');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const overridesPath = path.join(scriptDir, '..', 'src', 'data', 'member-photo-overrides.json');
const BUCKET = 'member-photos';

const dryRun = process.argv.includes('--dry-run');
const shouldApply = process.argv.includes('--apply');

function extFromContentType(contentType, url) {
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('gif')) return '.gif';
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.png')) return '.png';
    if (pathname.endsWith('.webp')) return '.webp';
  } catch {
    // ignore
  }
  return '.jpg';
}

async function downloadBuffer(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MasterboardMemberPhotoBot/1.0' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Not an image (${contentType || 'unknown'})`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType,
  };
}

async function ensureBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Criar bucket: ${error.message}`);
  }
}

async function run() {
  const overrides = JSON.parse(await readFile(overridesPath, 'utf8'));
  const supabase = await createServiceSupabaseClient();
  const { data: members, error } = await supabase
    .from('members')
    .select('id,name,source_id,photo_url');

  if (error) throw new Error(error.message);

  const membersByKey = new Map();
  for (const member of members ?? []) {
    membersByKey.set(normalizePersonNameKey(member.name), member);
  }

  if (shouldApply && !dryRun) {
    await ensureBucket(supabase);
  }

  let updated = 0;

  for (const [key, sourceUrl] of Object.entries(overrides)) {
    const member = membersByKey.get(normalizePersonNameKey(key));
    if (!member) {
      console.log(`  ⚠ override sem membro: ${key}`);
      continue;
    }

    if (dryRun || !shouldApply) {
      console.log(`  ↪ ${member.name}: ${sourceUrl}`);
      continue;
    }

    const { buffer, contentType } = await downloadBuffer(sourceUrl);
    const ext = extFromContentType(contentType, sourceUrl);
    const storagePath = `${member.source_id || member.id}${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from('members')
      .update({ photo_url: publicUrl })
      .eq('id', member.id);

    if (updateError) throw new Error(updateError.message);

    updated += 1;
    console.log(`  ✓ ${member.name}`);
  }

  console.log(`\n✅ Overrides aplicados: ${updated}`);
}

run().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
