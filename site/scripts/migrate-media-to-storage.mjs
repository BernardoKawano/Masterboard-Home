import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const envPath = path.join(projectRoot, '.env');
const DEFAULT_BUCKET = 'site-media';

export const MEDIA_TARGETS = [
  {
    key: 'events.cover_image_url',
    table: 'events',
    field: 'cover_image_url',
    labelField: 'title',
    pathPrefix: 'events/covers',
  },
  {
    key: 'content_posts.cover_image_url',
    table: 'content_posts',
    field: 'cover_image_url',
    labelField: 'title',
    pathPrefix: 'blog/covers',
  },
  {
    key: 'speakers.photo_url',
    table: 'speakers',
    field: 'photo_url',
    labelField: 'name',
    pathPrefix: 'speakers/photos',
  },
  {
    key: 'speakers.company_logo_url',
    table: 'speakers',
    field: 'company_logo_url',
    labelField: 'name',
    pathPrefix: 'speakers/company-logos',
  },
  {
    key: 'members.photo_url',
    table: 'members',
    field: 'photo_url',
    labelField: 'name',
    pathPrefix: 'members/photos',
  },
  {
    key: 'companies.logo_url',
    table: 'companies',
    field: 'logo_url',
    labelField: 'name',
    pathPrefix: 'companies/logos',
  },
];

export function parseArgs(argv) {
  const targetArg = argv.find((arg) => arg.startsWith('--target='));
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const bucketArg = argv.find((arg) => arg.startsWith('--bucket='));

  return {
    execute: argv.includes('--execute'),
    target: targetArg ? targetArg.split('=')[1] : 'all',
    limit: limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Number.POSITIVE_INFINITY,
    bucket: bucketArg ? bucketArg.split('=')[1] : DEFAULT_BUCKET,
  };
}

export function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();
  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (isQuoted) value = value.slice(1, -1);

  return [key, value];
}

async function loadEnvFile() {
  const env = { ...process.env };

  try {
    const source = await readFile(envPath, 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (!entry) continue;
      const [key, value] = entry;
      env[key] ??= value;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  return env;
}

export function requireSupabaseEnv(env) {
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('xxxx')) {
    throw new Error('SUPABASE_URL ausente ou ainda com placeholder.');
  }

  if (!serviceRoleKey || serviceRoleKey === 'xxxx') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente ou ainda com placeholder.');
  }

  return { url, serviceRoleKey };
}

export function normalizeImageUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
}

export function isSupabaseStorageUrl(value) {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return false;

  try {
    return new URL(normalized).pathname.includes('/storage/v1/');
  } catch {
    return false;
  }
}

export function shouldMigrateImageUrl(value) {
  const normalized = normalizeImageUrl(value);
  if (!normalized || isSupabaseStorageUrl(normalized)) return false;

  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extensionFromUrl(value) {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return '.jpg';

  try {
    const match = new URL(normalized).pathname.match(/\.(avif|webp|png|jpe?g|gif|svg)(?:$|[?#])/i);
    return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
  } catch {
    return '.jpg';
  }
}

export function extensionFromContentType(contentType) {
  const lower = contentType?.toLowerCase() ?? '';
  if (lower.includes('image/avif')) return '.avif';
  if (lower.includes('image/webp')) return '.webp';
  if (lower.includes('image/png')) return '.png';
  if (lower.includes('image/svg')) return '.svg';
  if (lower.includes('image/gif')) return '.gif';
  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return '.jpg';
  return null;
}

export function safePathPart(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image';
}

export function buildStoragePath(target, row, imageUrl, contentType) {
  const id = safePathPart(row.source_id ?? row.id);
  const label = safePathPart(row[target.labelField]);
  const extension = extensionFromContentType(contentType) ?? extensionFromUrl(imageUrl);
  return `${target.pathPrefix}/${label}-${id}${extension}`;
}

export function getSelectedTargets(targetKey) {
  if (!targetKey || targetKey === 'all') return MEDIA_TARGETS;

  const selected = MEDIA_TARGETS.filter((target) => target.key === targetKey || target.table === targetKey);
  if (selected.length === 0) {
    throw new Error(`Target desconhecido: ${targetKey}. Use: all, ${MEDIA_TARGETS.map((target) => target.key).join(', ')}`);
  }

  return selected;
}

async function ensurePublicBucket(supabase, bucket) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Listar buckets: ${error.message}`);

  const exists = data?.some((item) => item.name === bucket);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, { public: true });
  if (createError) throw new Error(`Criar bucket ${bucket}: ${createError.message}`);
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'masterboard-media-migration/1.0' },
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

async function listCandidateRows(supabase, target, limit) {
  const columns = ['id', 'source_id', target.labelField, target.field];
  const { data, error } = await supabase
    .from(target.table)
    .select([...new Set(columns)].join(','))
    .not(target.field, 'is', null)
    .limit(Number.isFinite(limit) ? limit : 1000);

  if (error) throw new Error(`Listar ${target.key}: ${error.message}`);

  return (data ?? [])
    .map((row) => ({
      ...row,
      normalizedUrl: normalizeImageUrl(row[target.field]),
    }))
    .filter((row) => shouldMigrateImageUrl(row.normalizedUrl));
}

async function migrateTarget({ supabase, target, bucket, limit, execute }) {
  const rows = await listCandidateRows(supabase, target, limit);
  console.log(`\n${target.key}: ${rows.length} candidato(s) externo(s)`);

  if (!execute) {
    rows.slice(0, 5).forEach((row) => {
      console.log(`  - ${row[target.labelField] ?? row.id}: ${row.normalizedUrl}`);
    });
    return { target: target.key, total: rows.length, migrated: 0, failed: 0 };
  }

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const { buffer, contentType } = await downloadImage(row.normalizedUrl);
      const storagePath = buildStoragePath(target, row, row.normalizedUrl, contentType);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, { contentType, upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const { error: updateError } = await supabase
        .from(target.table)
        .update({ [target.field]: publicUrl })
        .eq('id', row.id);

      if (updateError) throw new Error(updateError.message);

      migrated += 1;
      console.log(`  OK ${row[target.labelField] ?? row.id}`);
    } catch (error) {
      failed += 1;
      console.log(`  ERRO ${row[target.labelField] ?? row.id}: ${error.message}`);
    }
  }

  return { target: target.key, total: rows.length, migrated, failed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = await loadEnvFile();
  const { url, serviceRoleKey } = requireSupabaseEnv(env);
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const targets = getSelectedTargets(args.target);

  console.log(args.execute ? 'Modo EXECUTE: haverá escrita no Supabase Storage e nas tabelas.' : 'Modo DRY-RUN: nenhuma escrita será feita.');
  console.log(`Bucket: ${args.bucket}`);

  if (args.execute) {
    await ensurePublicBucket(supabase, args.bucket);
  }

  const results = [];
  for (const target of targets) {
    results.push(await migrateTarget({
      supabase,
      target,
      bucket: args.bucket,
      limit: args.limit,
      execute: args.execute,
    }));
  }

  const totals = results.reduce(
    (acc, result) => ({
      total: acc.total + result.total,
      migrated: acc.migrated + result.migrated,
      failed: acc.failed + result.failed,
    }),
    { total: 0, migrated: 0, failed: 0 },
  );

  console.log(`\nResumo: ${totals.total} candidato(s), ${totals.migrated} migrado(s), ${totals.failed} erro(s).`);
  if (!args.execute) {
    console.log('Para executar escrita, rode novamente com --execute após revisar os candidatos.');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
