import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const envPath = path.join(projectRoot, '.env');
const docsDir = path.join(projectRoot, 'docs');

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

async function loadEnvFile() {
  const env = { ...process.env };
  const source = await readFile(envPath, 'utf8');

  for (const line of source.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    env[key] ??= value;
  }

  return env;
}

const roleComplements = new Set([
  'administrativo',
  'administrativa',
  'comercial',
  'executivo',
  'executiva',
  'financeiro',
  'financeira',
  'geral',
  'marketing',
  'operacoes',
  'operacional',
  'produto',
  'proprietario',
  'proprietaria',
  'vendas',
]);

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

function parseRoleLabel(label) {
  const cleaned = String(label ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return {};

  const patterns = [
    /^(.+?)\s+d(?:a|o|as|os)\s+(.+)$/i,
    /^(.+?)\s+-\s+(.+)$/,
    /^(.+?)\s+\|\s+(.+)$/,
    /^(.+?)\s*:\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return { role: match[1].trim(), company: match[2].trim() };
    }
  }

  const prefixMatch = cleaned.match(
    /^(ceo|cfo|cto|coo|cmo|cco|cso|cro|vp|vice-presidente|presidente|founder|co-?founder|fundador|fundadora|s[oó]ci[oa]|diretor|diretora)\s+(.+)$/i,
  );

  if (prefixMatch) {
    const company = prefixMatch[2].trim();
    const normalizedCompany = normalize(company);
    const firstCompanyToken = normalizedCompany.split(/\s+/)[0] ?? '';

    if (
      !/^(d[aeo]s?|e)\b/i.test(company) &&
      !roleComplements.has(normalizedCompany) &&
      !roleComplements.has(firstCompanyToken)
    ) {
      return { role: prefixMatch[1].trim(), company };
    }
  }

  return { role: cleaned };
}

const brandHints = [
  { company: 'Azul Linhas Aéreas', pattern: /\bazul\b.*\blinhas\b|\blogo azul linhas aereas\b/i },
  { company: 'Coca-Cola', pattern: /coca\s*cola/i },
  { company: 'Heineken', pattern: /heineken/i },
  { company: 'Amazon Web Services', pattern: /amazon web services|\baws\b/i },
  { company: 'Salesforce', pattern: /salesforce/i },
  { company: 'Surf Center', pattern: /surf\s*center/i },
  { company: 'Microsoft', pattern: /microsoft|\bmsft\b/i },
  { company: 'Wellhub', pattern: /wellhub/i },
  { company: 'Zettabuzz', pattern: /zettabuzz/i },
  { company: 'Grupo Barigui', pattern: /barigui/i },
  { company: 'Ondaskim', pattern: /ondaskim/i },
  { company: 'Driva', pattern: /\bdriva\b|logodriva/i },
  { company: "McDonald's", pattern: /mcdonald/i },
  { company: 'Hard Rock Curitiba', pattern: /hard rock curitiba|hardrock curitiba/i },
  { company: 'RP Trader', pattern: /rp\s*trader/i },
  { company: 'RPC', pattern: /\brpc\b/i },
  { company: 'VPx Company', pattern: /\bvpx\b/i },
  { company: 'Artesian Móveis', pattern: /artesian/i },
  { company: 'Ambev', pattern: /ambev/i },
  { company: 'Outback Steakhouse', pattern: /outback/i },
  { company: 'Super Festval', pattern: /super\s*festval|superfestval|festval/i },
];

function logoHint(url) {
  const filename = decodeURIComponent(String(url ?? '').split('/').pop() ?? '');
  return filename.replace(/\.[^.]+$/, '').trim();
}

function findBrandHint(speaker) {
  const evidence = [speaker.role_label, speaker.company_logo_url, logoHint(speaker.company_logo_url)]
    .filter(Boolean)
    .join(' ');
  const normalizedEvidence = normalize(evidence);

  return brandHints.find((hint) => hint.pattern.test(evidence) || hint.pattern.test(normalizedEvidence));
}

function getSuggestion(speaker) {
  const currentCompany = String(speaker.company ?? '').trim();

  if (currentCompany) {
    return {
      suggestedCompany: currentCompany,
      confidence: 'existente',
      source: 'speakers.company',
      evidence: 'Empresa ja preenchida na base.',
    };
  }

  const parsed = parseRoleLabel(speaker.role_label || speaker.role || '');

  if (parsed.company) {
    return {
      suggestedCompany: parsed.company,
      suggestedRole: parsed.role,
      confidence: 'alta',
      source: 'role_label_parser',
      evidence: speaker.role_label || speaker.role || '',
    };
  }

  const brandHint = findBrandHint(speaker);

  if (brandHint) {
    const roleLabelMatched =
      brandHint.pattern.test(String(speaker.role_label ?? '')) ||
      brandHint.pattern.test(normalize(speaker.role_label ?? ''));

    return {
      suggestedCompany: brandHint.company,
      confidence: 'media',
      source: roleLabelMatched ? 'role_label_brand' : 'logo_filename',
      evidence: roleLabelMatched ? speaker.role_label : logoHint(speaker.company_logo_url),
    };
  }

  return {
    suggestedCompany: '',
    confidence: 'nenhuma',
    source: 'needs_manual_review',
    evidence: logoHint(speaker.company_logo_url) || speaker.role_label || '',
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  const headers = [
    'name',
    'slug',
    'role_label',
    'current_role',
    'current_company',
    'suggested_company',
    'suggested_role',
    'confidence',
    'source',
    'evidence',
    'duplicate_count',
    'duplicate_slugs',
    'company_logo_hint',
  ];

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

async function main() {
  const env = await loadEnvFile();
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'xxxx') {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente no .env.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from('speakers')
    .select('slug,name,role_label,role,company,company_logo_url,is_published')
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) throw error;

  const speakers = data ?? [];
  const duplicatesByName = new Map();

  for (const speaker of speakers) {
    const key = normalize(speaker.name);
    const group = duplicatesByName.get(key) ?? [];
    group.push(speaker);
    duplicatesByName.set(key, group);
  }

  const rows = speakers.map((speaker) => {
    const suggestion = getSuggestion(speaker);
    const duplicateGroup = duplicatesByName.get(normalize(speaker.name)) ?? [];

    return {
      name: speaker.name,
      slug: speaker.slug,
      role_label: speaker.role_label ?? '',
      current_role: speaker.role ?? '',
      current_company: speaker.company ?? '',
      suggested_company: suggestion.suggestedCompany,
      suggested_role: suggestion.suggestedRole ?? '',
      confidence: suggestion.confidence,
      source: suggestion.source,
      evidence: suggestion.evidence,
      duplicate_count: duplicateGroup.length,
      duplicate_slugs: duplicateGroup.map((item) => item.slug).join('; '),
      company_logo_hint: logoHint(speaker.company_logo_url),
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    publishedSpeakers: rows.length,
    existingCompany: rows.filter((row) => row.confidence === 'existente').length,
    highConfidence: rows.filter((row) => row.confidence === 'alta').length,
    mediumConfidence: rows.filter((row) => row.confidence === 'media').length,
    needsManualReview: rows.filter((row) => row.confidence === 'nenhuma').length,
    duplicateNameGroups: [...duplicatesByName.values()].filter((group) => group.length > 1).length,
  };

  const payload = { summary, rows };

  await mkdir(docsDir, { recursive: true });
  await writeFile(
    path.join(docsDir, 'speaker-company-review.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );
  await writeFile(path.join(docsDir, 'speaker-company-review.csv'), `${toCsv(rows)}\n`, 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
