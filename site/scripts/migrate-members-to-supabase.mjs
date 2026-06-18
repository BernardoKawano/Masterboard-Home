/**
 * Migra membros Club/Hub/MBA do Bubble para a tabela members do Supabase.
 *
 * Uso:
 *   node scripts/migrate-members-to-supabase.mjs
 *   node scripts/migrate-members-to-supabase.mjs --dry-run
 */

import { createServiceSupabaseClient, loadEnvFile } from './env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const TIERS_TO_MIGRATE = ['Club', 'Hub', 'MBA'];
const BUBBLE_BASE = 'https://app.masterboard.com.br/api/1.1';

async function getBubbleToken() {
  const env = await loadEnvFile();
  const token = env.BUBBLE_API_TOKEN?.trim();
  if (!token) {
    throw new Error('BUBBLE_API_TOKEN ausente no .env.');
  }
  return token;
}

async function fetchAllBubbleUsers(bubbleToken) {
  const users = [];
  let cursor = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(`${BUBBLE_BASE}/obj/user?limit=${limit}&cursor=${cursor}`, {
      headers: { Authorization: `Bearer ${bubbleToken}` },
    });
    const { response } = await res.json();
    users.push(...response.results);
    if (response.remaining === 0) break;
    cursor += limit;
  }

  return users;
}

function normalizeImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function bubbleUserToMemberRow(user) {
  const email = user?.authentication?.email?.email ?? null;
  const tier = (user['Geral - Tier'] ?? 'member').toLowerCase();

  return {
    name: (user['Pessoal - Nome'] ?? '').trim(),
    email,
    phone: user['Pessoal - Whatsapp'] ? String(user['Pessoal - Whatsapp']) : null,
    company_name: null,
    role: user['Pessoal - Cargo'] ?? null,
    photo_url: normalizeImageUrl(user['Pessoal - Foto_perfil']),
    city: null,
    tier: tier === 'mba' ? 'vip' : tier === 'hub' ? 'vip' : 'member',
    status: 'active',
    source: 'bubble',
    source_id: user._id,
  };
}

async function run() {
  const [supabase, bubbleToken] = await Promise.all([
    createServiceSupabaseClient(),
    getBubbleToken(),
  ]);

  console.log(`\n🚀 Migração de membros Bubble → Supabase ${DRY_RUN ? '[DRY RUN]' : ''}\n`);

  console.log('Buscando usuários no Bubble...');
  const allUsers = await fetchAllBubbleUsers(bubbleToken);
  console.log(`  Total no Bubble: ${allUsers.length}`);

  const members = allUsers.filter((u) => TIERS_TO_MIGRATE.includes(u['Geral - Tier']));
  console.log(`  Tiers ${TIERS_TO_MIGRATE.join('/')}: ${members.length} membros\n`);

  const rows = members.map(bubbleUserToMemberRow).filter((r) => r.name && r.email);
  console.log(`  Válidos (com nome e email): ${rows.length}`);

  if (DRY_RUN) {
    console.log('\n--- Amostra (primeiros 5) ---');
    rows.slice(0, 5).forEach((r) => console.log(`  ${r.name} <${r.email}> | tier: ${r.tier} | source_id: ${r.source_id}`));
    console.log('\n✅ Dry run concluído. Remova --dry-run para executar.');
    return;
  }

  const BATCH = 50;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('members')
      .upsert(batch, { onConflict: 'email', ignoreDuplicates: false })
      .select('id');

    if (error) {
      console.error(`  ❌ Erro no lote ${i}–${i + BATCH}:`, error.message);
      skipped += batch.length;
    } else {
      inserted += data?.length ?? 0;
      process.stdout.write(`  ✓ lote ${i + 1}–${Math.min(i + BATCH, rows.length)} (${inserted} inseridos até agora)\r`);
    }
  }

  console.log(`\n\n✅ Concluído: ${inserted} membros inseridos/atualizados, ${skipped} ignorados por erro.`);
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
