import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServiceSupabaseClient } from './env.mjs';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const { resolveSpeakerCompany, normalizeSpeakerText, logoHint } = loadTsModuleFromPath(
  '../src/lib/speaker-company.ts',
);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(scriptDir, '..', 'docs');

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

function mapResolution(resolution) {
  return {
    suggestedCompany: resolution.company ?? '',
    suggestedRole: resolution.role ?? '',
    confidence: resolution.confidence,
    source: resolution.source,
    evidence: resolution.evidence,
  };
}

async function main() {
  const supabase = await createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('speakers')
    .select('slug,name,role_label,role,company,company_logo_url,linkedin_url,is_published')
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) throw error;

  const speakers = data ?? [];
  const duplicatesByName = new Map();

  for (const speaker of speakers) {
    const key = normalizeSpeakerText(speaker.name);
    const group = duplicatesByName.get(key) ?? [];
    group.push(speaker);
    duplicatesByName.set(key, group);
  }

  const rows = speakers.map((speaker) => {
    const resolution = resolveSpeakerCompany({
      company: speaker.company,
      role: speaker.role,
      roleLabel: speaker.role_label,
      companyLogoUrl: speaker.company_logo_url,
      linkedinUrl: speaker.linkedin_url,
    });
    const suggestion = mapResolution(resolution);
    const duplicateGroup = duplicatesByName.get(normalizeSpeakerText(speaker.name)) ?? [];

    return {
      name: speaker.name,
      slug: speaker.slug,
      role_label: speaker.role_label ?? '',
      current_role: speaker.role ?? '',
      current_company: speaker.company ?? '',
      suggested_company: suggestion.suggestedCompany,
      suggested_role: suggestion.suggestedRole,
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
    researchConfidence: rows.filter((row) => row.confidence === 'pesquisa').length,
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
