import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServiceSupabaseClient } from './env.mjs';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const { resolveSpeakerCompany } = loadTsModuleFromPath(
  '../src/lib/speaker-company.ts',
);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(scriptDir, '..', 'docs');
const logPath = path.join(docsDir, 'speaker-company-research-log.json');

const shouldApply = process.argv.includes('--apply');
const delayMs = 1200;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildQuery(speaker) {
  const role = String(speaker.role_label ?? speaker.role ?? '').trim();
  return `"${speaker.name}" ${role} empresa linkedin`.trim();
}

function cleanupCompany(value) {
  let company = String(value ?? '').trim();
  company = company.replace(/\s*\|.*$/, '');
  company = company.replace(/\s*·.*$/, '');
  company = company.replace(/\s*LinkedIn.*$/i, '');
  company = company.replace(/[.,;]+$/, '').trim();

  if (!company || company.length < 2 || company.length > 80) return null;
  if (/^(brasil|brazil|linkedin|profile|perfil|prefeitura)$/i.test(company)) return null;
  if (/^captura de tela/i.test(company)) return null;
  if (/\b(d[aeo]s?)\s*$/i.test(company)) return null;
  if (/^(na|no|da|do|de|em)\b/i.test(company)) return null;

  return company;
}

function extractCompanyFromSnippet(snippet, speakerName) {
  const text = String(snippet ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const structuredPatterns = [
    new RegExp(`${escapeRegex(speakerName)}\\s*[-–—|]\\s*[^|–—-]+?[-–—|]\\s*([^|–—\\n]+?)\\s*\\|\\s*LinkedIn`, 'i'),
    new RegExp(`${escapeRegex(speakerName)}\\s*[-–—|]\\s*([^|–—\\n]+?)\\s*\\|\\s*LinkedIn`, 'i'),
    /(?:presidente|ceo|cfo|cto|cmo|coo|reitor[a]?|diretor[a]?|founder|fundador[a]?|s[oó]ci[oa])\s+(?:d[ao]s?\s+)?([A-ZÁÉÍÓÚÃÕÇ][A-Za-zÁÉÍÓÚáéíóúÃÕÇãõç0-9&+.''\- ]{2,60})/i,
    /(?:at|@|na|no)\s+([A-ZÁÉÍÓÚÃÕÇ][A-Za-zÁÉÍÓÚáéíóúÃÕÇãõç0-9&+.''\- ]{2,60})(?:\s*[|·•-]|$)/,
  ];

  for (const pattern of structuredPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const company = cleanupCompany(match[1]);
      if (company) return { company, evidence: text.slice(0, 240) };
    }
  }

  return null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchDuckDuckGo(query) {
  const response = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MasterboardSpeakerResearch/1.0',
    },
    body: `q=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed (${response.status})`);
  }

  return response.text();
}

function parseDdgSnippets(html) {
  const snippets = [];
  const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = snippetRegex.exec(html)) !== null) {
    const snippet = match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    if (snippet) snippets.push(snippet);
  }

  return snippets;
}

async function researchSpeaker(speaker, cache) {
  const cacheKey = speaker.slug;
  if (cache[cacheKey]?.status === 'found') {
    return cache[cacheKey];
  }

  const query = buildQuery(speaker);
  const html = await searchDuckDuckGo(query);
  const snippets = parseDdgSnippets(html);

  for (const snippet of snippets) {
    const extracted = extractCompanyFromSnippet(snippet, speaker.name);
    if (!extracted) continue;

    const result = {
      status: 'found',
      company: extracted.company,
      evidence: extracted.evidence,
      query,
      researchedAt: new Date().toISOString(),
    };
    cache[cacheKey] = result;
    return result;
  }

  const result = {
    status: 'ambiguous',
    query,
    snippets: snippets.slice(0, 3),
    researchedAt: new Date().toISOString(),
  };
  cache[cacheKey] = result;
  return result;
}

async function loadCache() {
  try {
    const raw = await readFile(logPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { entries: {} };
  }
}

async function saveCache(cache) {
  await mkdir(docsDir, { recursive: true });
  await writeFile(logPath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

async function main() {
  const supabase = await createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('speakers')
    .select('id,slug,name,role_label,role,company,company_logo_url,linkedin_url,is_published')
    .eq('is_published', true)
    .order('name', { ascending: true });

  if (error) throw error;

  const cache = await loadCache();
  const pending = (data ?? []).filter((speaker) => {
    const resolution = resolveSpeakerCompany({
      company: speaker.company,
      role: speaker.role,
      roleLabel: speaker.role_label,
      companyLogoUrl: speaker.company_logo_url,
      linkedinUrl: speaker.linkedin_url,
    });
    return resolution.confidence === 'nenhuma';
  });

  const results = [];
  const updates = [];

  for (const speaker of pending) {
    const research = await researchSpeaker(speaker, cache.entries ?? (cache.entries = {}));

    if (research.status === 'found') {
      const resolution = resolveSpeakerCompany({
        company: speaker.company,
        role: speaker.role,
        roleLabel: speaker.role_label,
        companyLogoUrl: speaker.company_logo_url,
        linkedinUrl: speaker.linkedin_url,
        researchedCompany: research.company,
        researchedRole: speaker.role ?? speaker.role_label,
      });

      results.push({
        slug: speaker.slug,
        name: speaker.name,
        company: research.company,
        confidence: resolution.confidence,
        evidence: research.evidence,
        status: 'applied_candidate',
      });

      if (shouldApply && resolution.company) {
        updates.push({
          id: speaker.id,
          slug: speaker.slug,
          company: resolution.company,
          role: speaker.role ?? speaker.role_label,
        });
      }
    } else {
      results.push({
        slug: speaker.slug,
        name: speaker.name,
        status: 'ambiguous',
        query: research.query,
      });
    }

    await sleep(delayMs);
  }

  cache.generatedAt = new Date().toISOString();
  cache.summary = {
    pending: pending.length,
    found: results.filter((item) => item.status === 'applied_candidate').length,
    ambiguous: results.filter((item) => item.status === 'ambiguous').length,
  };
  await saveCache(cache);

  console.log(JSON.stringify({ mode: shouldApply ? 'apply' : 'dry-run', results }, null, 2));

  if (!shouldApply) {
    console.log('\nDry-run. Use --apply para gravar empresas confirmadas por pesquisa.');
    return;
  }

  let applied = 0;
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('speakers')
      .update({
        company: update.company,
        ...(update.role ? { role: update.role } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.id);

    if (updateError) throw updateError;
    applied += 1;
  }

  console.log(`\nPesquisa aplicada em ${applied} speaker(s).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
