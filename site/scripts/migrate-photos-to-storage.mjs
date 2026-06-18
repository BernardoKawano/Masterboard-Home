/**
 * Baixa fotos de perfil do Bubble CDN e faz upload para Supabase Storage.
 * Depois atualiza photo_url na tabela members com a nova URL pública.
 *
 * Uso:
 *   node scripts/migrate-photos-to-storage.mjs
 *   node scripts/migrate-photos-to-storage.mjs --dry-run
 *   node scripts/migrate-photos-to-storage.mjs --limit=10
 */

import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : Infinity;
const BUCKET = 'member-photos';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos no ambiente.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i);
    return match ? `.${match[1].toLowerCase()}` : '.jpg';
  } catch {
    return '.jpg';
  }
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Criar bucket: ${error.message}`);
    console.log(`  Bucket '${BUCKET}' criado.`);
  } else {
    console.log(`  Bucket '${BUCKET}' já existe.`);
  }
}

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'masterboard-migration/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${url}`);
  const buffer = await res.arrayBuffer();
  return { buffer: Buffer.from(buffer), contentType: res.headers.get('content-type') || 'image/jpeg' };
}

async function run() {
  console.log(`\n📸 Migração de fotos Bubble CDN → Supabase Storage ${DRY_RUN ? '[DRY RUN]' : ''}\n`);

  // Busca membros com foto_url apontando para o Bubble CDN
  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, photo_url, source_id')
    .not('photo_url', 'is', null)
    .ilike('photo_url', '%bubble%');

  if (error) throw new Error(`Listar membros: ${error.message}`);

  const targets = members.slice(0, LIMIT);
  console.log(`  Membros com foto no Bubble CDN: ${members.length}`);
  if (LIMIT < Infinity) console.log(`  Processando os primeiros: ${targets.length}`);

  if (DRY_RUN) {
    console.log('\n--- Amostra (primeiros 5) ---');
    targets.slice(0, 5).forEach(m => console.log(`  ${m.name}: ${normalizeUrl(m.photo_url)?.slice(0, 80)}...`));
    console.log('\n✅ Dry run concluído. Remova --dry-run para executar.');
    return;
  }

  if (!DRY_RUN) await ensureBucket();

  let ok = 0;
  let failed = 0;
  const errors = [];

  for (const member of targets) {
    const url = normalizeUrl(member.photo_url);
    if (!url) continue;

    const ext = extFromUrl(url);
    const path = `${member.source_id || member.id}${ext}`;

    try {
      const { buffer, contentType } = await downloadBuffer(url);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('members')
        .update({ photo_url: publicUrl })
        .eq('id', member.id);

      if (updateError) throw new Error(updateError.message);

      ok++;
      process.stdout.write(`  ✓ ${ok}/${targets.length} — ${member.name.slice(0, 30)}\r`);
    } catch (err) {
      failed++;
      errors.push({ name: member.name, error: err.message });
    }
  }

  console.log(`\n\n✅ Concluído: ${ok} fotos migradas, ${failed} erros.`);
  if (errors.length > 0) {
    console.log('\nErros:');
    errors.forEach(e => console.log(`  ❌ ${e.name}: ${e.error}`));
  }
}

run().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
