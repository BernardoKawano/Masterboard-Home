/**
 * Busca fotos profissionais para membros sem foto utilizável.
 * Prioridade: override → foto atual/speaker → Unavatar (LinkedIn).
 *
 * Uso:
 *   node scripts/fetch-member-photos.mjs --dry-run
 *   node scripts/fetch-member-photos.mjs --apply
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServiceSupabaseClient } from './env.mjs';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const {
  resolveMemberPhoto,
  isUsableMemberPhotoUrl,
  normalizeLinkedInUrl,
} = loadTsModuleFromPath('../src/lib/member-photo.ts');

const {
  sortMembersByCompanyPrestige,
  pickMembersWithUniqueCompanies,
} = loadTsModuleFromPath('../src/lib/member-company-score.ts');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(scriptDir, '..', 'docs');
const logPath = path.join(docsDir, 'member-photo-research-log.json');
const BUCKET = 'member-photos';

const dryRun = process.argv.includes('--dry-run');
const shouldApply = process.argv.includes('--apply');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const delayMs = 1200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRealMemberName(name) {
  const value = String(name ?? '').trim();
  if (!value || value.length < 4) return false;
  if (/^\d+x\d+$/.test(value)) return false;
  return value.split(/\s+/).length >= 2;
}

function extFromContentType(contentType, url) {
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('gif')) return '.gif';
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.png')) return '.png';
    if (pathname.endsWith('.webp')) return '.webp';
    if (pathname.endsWith('.gif')) return '.gif';
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

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 2048) {
    throw new Error('Image too small');
  }

  return { buffer, contentType };
}

function isLinkedInProfileUrl(value) {
  return /linkedin\.com\/in\//i.test(String(value ?? ''));
}

async function searchDuckDuckGo(query) {
  const response = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MasterboardMemberPhotoBot/1.0',
    },
    body: `q=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed (${response.status})`);
  }

  return response.text();
}

async function findLinkedInProfile(name, company) {
  const query = `"${name}" ${company ?? ''} site:linkedin.com/in/`.trim();
  const html = await searchDuckDuckGo(query);
  const match = html.match(/https?:\/\/(?:[\w.-]+\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/i)
    ?? html.match(/linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/i);

  if (!match) return null;

  const raw = match[0].startsWith('http') ? match[0] : `https://www.${match[0]}`;
  return raw.split('?')[0];
}

async function resolveLinkedInProfile(member) {
  const normalized = normalizeLinkedInUrl(member.linkedin_url);
  if (normalized && isLinkedInProfileUrl(normalized)) {
    return normalized;
  }

  return findLinkedInProfile(member.name, member.company);
}

async function tryUnavatar(linkedinUrl) {
  const normalized = normalizeLinkedInUrl(linkedinUrl);
  if (!normalized || !isLinkedInProfileUrl(normalized)) return null;

  const url = `https://unavatar.io/${encodeURIComponent(normalized)}?fallback=false`;
  try {
    const downloaded = await downloadBuffer(url);
    return { source: 'unavatar', url, ...downloaded };
  } catch {
    return null;
  }
}

async function fetchProfessionalPhoto(member) {
  const linkedInProfile = await resolveLinkedInProfile(member);
  if (linkedInProfile) {
    const unavatar = await tryUnavatar(linkedInProfile);
    if (unavatar) return unavatar;
  }

  if (member.resolved && member.resolved !== member.photo_url && isUsableMemberPhotoUrl(member.resolved)) {
    return { source: 'speaker_or_better', url: member.resolved };
  }

  return null;
}

async function ensureBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error(`Criar bucket: ${error.message}`);
  }
}

async function uploadPhoto(supabase, member, sourceUrl, buffer, contentType) {
  const ext = extFromContentType(contentType, sourceUrl);
  const storagePath = `${member.source_id || member.id}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return publicUrl;
}

async function run() {
  const supabase = await createServiceSupabaseClient();

  const [{ data: members, error: membersError }, { data: speakers, error: speakersError }] =
    await Promise.all([
      supabase
        .from('members')
        .select('id, name, source_id, photo_url, role, company_name, linkedin_url, companies(name, logo_url)')
        .order('name', { ascending: true }),
      supabase
        .from('speakers')
        .select('name, photo_url')
        .eq('is_published', true),
    ]);

  if (membersError) throw new Error(membersError.message);
  if (speakersError) throw new Error(speakersError.message);

  const speakerRows = (speakers ?? []).filter((row) => row.photo_url);
  const speakerLookup = speakerRows.map((speaker) => ({
    name: speaker.name,
    photo: speaker.photo_url,
  }));

  const mapped = (members ?? [])
    .filter((row) => isRealMemberName(row.name))
    .map((row) => {
      const company = row.companies?.name ?? row.company_name;
      const companyLogo = row.companies?.logo_url ?? null;
      const resolved = resolveMemberPhoto(
        {
          name: row.name,
          sourceId: row.source_id,
          photo: row.photo_url,
          companyLogo,
          linkedin: row.linkedin_url,
        },
        speakerLookup,
      );

      return {
        id: row.id,
        name: row.name,
        source_id: row.source_id,
        company,
        role: row.role,
        photo_url: row.photo_url,
        linkedin_url: row.linkedin_url,
        company_logo: companyLogo,
        resolved,
      };
    })
    .filter((member) => member.company && member.role);

  const targets = pickMembersWithUniqueCompanies(sortMembersByCompanyPrestige(mapped), 15);

  const batch = targets.slice(0, limit);

  console.log(`\n📸 Member photos ${dryRun ? '[DRY RUN]' : shouldApply ? '[APPLY]' : '[PREVIEW]'}\n`);
  console.log(`  Candidatos prioritários: ${targets.length}`);
  console.log(`  Processando: ${batch.length}\n`);

  if (!shouldApply && !dryRun) {
    batch.slice(0, 12).forEach((item) => {
      console.log(`  • ${item.name} — ${item.resolved ? 'melhorar' : 'sem foto'}${item.linkedin_url ? ' (LinkedIn)' : ''}`);
    });
    console.log('\nUse --dry-run ou --apply para continuar.');
    return;
  }

  if (shouldApply && !dryRun) {
    await ensureBucket(supabase);
  }

  const log = [];
  let updated = 0;

  for (const member of batch) {
    try {
      let photoResult = await fetchProfessionalPhoto(member);

      if (!photoResult?.url) {
        log.push({ name: member.name, status: 'skipped', reason: 'no_candidate' });
        continue;
      }

      if (dryRun) {
        console.log(`  ↪ ${member.name}: ${photoResult.source} → ${photoResult.url.slice(0, 90)}`);
        log.push({ name: member.name, status: 'dry_run', source: photoResult.source, url: photoResult.url });
        await sleep(delayMs);
        continue;
      }

      let publicUrl = photoResult.url;

      if (!publicUrl.includes('supabase.co/storage')) {
        const downloaded = photoResult.buffer
          ? { buffer: photoResult.buffer, contentType: photoResult.contentType }
          : await downloadBuffer(photoResult.url);
        publicUrl = await uploadPhoto(supabase, member, photoResult.url, downloaded.buffer, downloaded.contentType);
      }

      const { error: updateError } = await supabase
        .from('members')
        .update({ photo_url: publicUrl })
        .eq('id', member.id);

      if (updateError) throw new Error(updateError.message);

      updated += 1;
      log.push({ name: member.name, status: 'updated', source: photoResult.source, url: publicUrl });
      process.stdout.write(`  ✓ ${updated}/${batch.length} — ${member.name.slice(0, 36)}\r`);
      await sleep(delayMs);
    } catch (error) {
      log.push({ name: member.name, status: 'error', reason: error.message });
    }
  }

  await mkdir(docsDir, { recursive: true });
  await writeFile(logPath, `${JSON.stringify(log, null, 2)}\n`, 'utf8');

  console.log(`\n\n✅ Concluído: ${updated} fotos atualizadas. Log: ${logPath}`);
}

run().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
