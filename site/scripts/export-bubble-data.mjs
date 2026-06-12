import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'data', 'bubble-export.json');

const USER_FIELDS = [
  '_id',
  'Pessoal - Nome',
  'Pessoal - Whatsapp',
  'Pessoal - Cargo',
  'Pessoal - Empresa',
  'Pessoal - Foto_perfil',
  'Pessoal - Biografia',
  'Pessoal - Interesses',
  'Rede - Linkedin',
  'Rede - Instagram',
  'Rede - Website',
  'Geral - Tier',
  'Admin - Status',
  'Admin - Qualificacao',
  'Slug',
  'Created Date',
];

const COMPANY_FIELDS = [
  '_id',
  'Nome_Empresa',
  'Faturamento',
  'Localização',
  'Tamanho',
  'Setores',
  'Serviços_ofertados',
  'Desafios',
  'Created Date',
];

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (isQuoted) {
    value = value.slice(1, -1);
  }

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
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  return env;
}

function normalizeBubbleBaseUrl(value) {
  return (value || 'https://app.masterboard.com.br/api/1.1').replace(/\/+$/, '');
}

async function fetchAllBubbleRecords(type, env) {
  const baseUrl = normalizeBubbleBaseUrl(env.BUBBLE_BASE_URL);
  const token = env.BUBBLE_API_TOKEN || undefined;
  const records = [];
  let cursor = 0;

  for (;;) {
    const url = new URL(`${baseUrl}/obj/${type}`);
    url.searchParams.set('limit', '100');
    url.searchParams.set('cursor', String(cursor));

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Falha ao buscar ${type}: ${response.status} ${response.statusText} ${body.slice(0, 500)}`.trim(),
      );
    }

    const payload = await response.json();
    const page = payload?.response;

    if (!page || !Array.isArray(page.results)) {
      throw new Error(`Resposta inesperada do Bubble para ${type}.`);
    }

    records.push(...page.results);

    const count = Number(page.count ?? page.results.length);
    const remaining = Number(page.remaining ?? 0);

    if (remaining <= 0 || count <= 0 || page.results.length === 0) {
      break;
    }

    cursor += count;
  }

  return records;
}

function normalizeImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function bbcodeToHtml(text) {
  if (!text) return '';
  return text
    .replace(/\[b\]([\s\S]*?)\[\/b\]/g, '<strong>$1</strong>')
    .replace(/\[i\]([\s\S]*?)\[\/i\]/g, '<em>$1</em>')
    .replace(/\[u\]([\s\S]*?)\[\/u\]/g, '<u>$1</u>')
    .replace(/\n/g, '<br>');
}

function slugify(text) {
  return text
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

function buildSlugMap(raws, getText) {
  const seen = new Map();
  const result = new Map();

  for (const raw of raws) {
    let slug = slugify(getText(raw) ?? '');

    if (!slug) {
      slug = raw._id.slice(-12);
    }

    if (seen.has(slug) && seen.get(slug) !== raw._id) {
      slug = `${slug}--${raw._id.slice(-6)}`;
    }

    seen.set(slug, raw._id);
    result.set(raw._id, slug);
  }

  return result;
}

function deriveStatus(isoDate) {
  const eventDate = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today ? 'past' : 'upcoming';
}

function parseRoleLabel(label) {
  const cleaned = label.replace(/\s+/g, ' ').trim();
  if (!cleaned) return {};
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
  const normalize = (value) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

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

function mapBubbleEventToEvent(raw, slugMap) {
  const id = slugMap?.get(raw._id) ?? (slugify(raw.Titulo) || raw._id.slice(-12));

  return {
    id,
    sourceId: raw._id,
    source: 'bubble',
    title: raw.Titulo.trim(),
    description: raw.Sobre ?? '',
    schedule: raw.Cronograma ? bbcodeToHtml(raw.Cronograma) : undefined,
    date: raw.Data,
    startTime: raw.Horario_Inicio,
    endTime: raw.Horario_Fim,
    venue: raw.Localizacao?.trim() ?? 'Masterboard Club',
    city: undefined,
    coverImage: normalizeImageUrl(raw.Capa) || undefined,
    topics: Array.isArray(raw.Temas) ? raw.Temas : [],
    edition: raw['Edicao txt'],
    editionNumber: raw.Edicao,
    status: deriveStatus(raw.Data),
    speakerSourceIds: Array.isArray(raw.Speakers) ? raw.Speakers : [],
    driveLink: raw['Link Drive'],
    seoTitle: `${raw.Titulo.trim()} | Masterboard`,
    seoDescription: (raw.Sobre ?? '').slice(0, 155) || undefined,
  };
}

function mapBubbleSpeakerToSpeaker(raw, slugMap) {
  const id = slugMap?.get(raw._id) ?? (slugify(raw.Nome) || raw._id.slice(-12));
  const { role, company } = parseRoleLabel(raw.Setor ?? '');

  return {
    id,
    sourceId: raw._id,
    source: 'bubble',
    name: raw.Nome.trim(),
    roleLabel: raw.Setor ?? '',
    role,
    company,
    photo: normalizeImageUrl(raw.Imagem) || undefined,
    companyLogo: normalizeImageUrl(raw['Logo marca']) || undefined,
    bio: undefined,
    topics: undefined,
    linkedin: undefined,
  };
}

function pickFields(record, fields) {
  return Object.fromEntries(fields.map((field) => [field, record[field] ?? null]));
}

function hasFilledValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

async function main() {
  const env = await loadEnvFile();

  const [rawEvents, rawSpeakers, rawUsers, rawCompanies] = await Promise.all([
    fetchAllBubbleRecords('evento', env),
    fetchAllBubbleRecords('speaker', env),
    fetchAllBubbleRecords('user', env),
    fetchAllBubbleRecords('empresa', env),
  ]);

  const eventSlugMap = buildSlugMap(rawEvents, (raw) => raw.Titulo);
  const speakerSlugMap = buildSlugMap(rawSpeakers, (raw) => raw.Nome);

  const events = rawEvents.map((raw) => mapBubbleEventToEvent(raw, eventSlugMap));
  const speakers = rawSpeakers.map((raw) => mapBubbleSpeakerToSpeaker(raw, speakerSlugMap));
  const users = rawUsers.map((raw) => pickFields(raw, USER_FIELDS));
  const companies = rawCompanies
    .filter((raw) => hasFilledValue(raw.Nome_Empresa))
    .map((raw) => pickFields(raw, COMPANY_FIELDS));

  const exportData = {
    exportedAt: new Date().toISOString(),
    events,
    speakers,
    users,
    companies,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, 'utf8');

  console.log(`Eventos exportados: ${events.length}`);
  console.log(`Speakers exportados: ${speakers.length}`);
  console.log(`Usuarios exportados: ${users.length}`);
  console.log(`Empresas exportadas: ${companies.length}`);
  console.log(`Arquivo salvo em: ${path.relative(projectRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
