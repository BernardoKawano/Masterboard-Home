import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeImageUrl, normalizeLookupKey, resolveMemberCompany } from './member-import-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const envPath = path.join(projectRoot, '.env');
const exportPath = path.join(projectRoot, 'data', 'bubble-export.json');

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
  const source = await readFile(envPath, 'utf8');

  for (const line of source.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    env[key] ??= value;
  }

  return env;
}

function requireSupabaseEnv(env) {
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('xxxx')) {
    throw new Error('SUPABASE_URL ausente ou ainda com placeholder no .env.');
  }

  if (!serviceRoleKey || serviceRoleKey === 'xxxx') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente ou ainda com placeholder no .env.');
  }

  return { url, serviceRoleKey };
}

function toDateOnly(value) {
  if (!value) return null;
  return value.slice(0, 10);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function normalizeTier(value) {
  const normalized = cleanText(value)?.toLowerCase() ?? '';

  if (normalized.includes('vip')) return 'vip';
  if (normalized.includes('founding') || normalized.includes('fundador')) return 'founding';

  return 'member';
}

function normalizeMemberStatus(value) {
  const normalized = cleanText(value)?.toLowerCase() ?? '';

  if (
    normalized.includes('inactive') ||
    normalized.includes('inativo') ||
    normalized.includes('cancel') ||
    normalized.includes('disabled')
  ) {
    return 'inactive';
  }

  if (normalized.includes('prospect') || normalized.includes('lead')) {
    return 'prospect';
  }

  return 'active';
}

function mapCompanyToRow(company) {
  return {
    name: cleanText(company.Nome_Empresa),
    city: cleanText(company['Localização']),
    annual_revenue: cleanText(company.Faturamento),
    employee_count: cleanText(company.Tamanho),
    sector: cleanText(company.Setores),
    source: 'bubble',
    source_id: company._id,
    created_at: company['Created Date'] ?? undefined,
  };
}

function mapUserToRow(user, resolvedCompany) {
  const sourceId = user._id ?? user.Slug;

  return {
    name: cleanText(user['Pessoal - Nome']) ?? sourceId,
    email: `${sourceId}@placeholder.masterboard.com.br`,
    phone: cleanText(user['Pessoal - Whatsapp']),
    company_id: resolvedCompany.companyId,
    company_name: resolvedCompany.companyName,
    role: cleanText(user['Pessoal - Cargo']),
    photo_url: normalizeImageUrl(user['Pessoal - Foto_perfil']),
    bio: cleanText(user['Pessoal - Biografia']),
    linkedin_url: cleanText(user['Rede - Linkedin']),
    tier: normalizeTier(user['Geral - Tier']),
    status: normalizeMemberStatus(user['Admin - Status']),
    source: 'bubble',
    source_id: sourceId,
    created_at: user['Created Date'] ?? undefined,
    updated_at: new Date().toISOString(),
  };
}

function mapSpeakerToRow(speaker) {
  return {
    slug: speaker.id,
    name: speaker.name,
    role_label: speaker.roleLabel ?? null,
    role: speaker.role ?? null,
    company: speaker.company ?? null,
    bio: speaker.bio ?? null,
    photo_url: speaker.photo ?? null,
    company_logo_url: speaker.companyLogo ?? null,
    linkedin_url: speaker.linkedin ?? null,
    topics: toArray(speaker.topics),
    is_published: true,
    source: speaker.source ?? 'bubble',
    source_id: speaker.sourceId,
    updated_at: new Date().toISOString(),
  };
}

function mapEventToRow(event) {
  return {
    slug: event.id,
    title: event.title,
    description: event.description ?? null,
    schedule_html: event.schedule ?? null,
    date: toDateOnly(event.date),
    start_time: event.startTime ?? null,
    end_time: event.endTime ?? null,
    venue: event.venue,
    city: event.city ?? null,
    country: 'BR',
    cover_image_url: event.coverImage ?? null,
    topics: toArray(event.topics),
    edition_label: event.edition ?? null,
    edition_number: event.editionNumber ?? null,
    status: event.status,
    access_type: 'public',
    drive_link: event.driveLink ?? null,
    registration_url: event.registrationUrl ?? null,
    seo_title: event.seoTitle ?? null,
    seo_description: event.seoDescription ?? null,
    is_published: true,
    source: event.source ?? 'bubble',
    source_id: event.sourceId,
    updated_at: new Date().toISOString(),
  };
}

class SupabaseRestClient {
  constructor({ url, serviceRoleKey }) {
    this.baseUrl = `${url}/rest/v1`;
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    };
  }

  async request(pathname, options = {}) {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`${options.method ?? 'GET'} ${pathname} falhou: ${response.status} ${body}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async selectBySourceId(table, sourceId) {
    const encoded = encodeURIComponent(sourceId);
    const rows = await this.request(`/${table}?source_id=eq.${encoded}&select=id,source_id&limit=1`);
    return rows[0] ?? null;
  }

  async insertRow(table, row) {
    const rows = await this.request(`/${table}?select=id,source_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });

    return rows[0];
  }

  async updateRowBySourceId(table, sourceId, row) {
    const encoded = encodeURIComponent(sourceId);
    const rows = await this.request(`/${table}?source_id=eq.${encoded}&select=id,source_id`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });

    return rows[0];
  }

  async writeWithOptionalColumns(method, table, sourceId, row, optionalColumns) {
    let nextRow = row;

    for (;;) {
      try {
        return method === 'insert'
          ? await this.insertRow(table, nextRow)
          : await this.updateRowBySourceId(table, sourceId, nextRow);
      } catch (error) {
        const missingColumn = optionalColumns.find((column) => {
          const pattern = new RegExp(`["'\`]${column}["'\`]|\\b${column}\\b`);
          return pattern.test(error.body ?? '');
        });

        if (!missingColumn || !(missingColumn in nextRow)) {
          throw error;
        }

        nextRow = { ...nextRow };
        delete nextRow[missingColumn];
        console.warn(`Coluna opcional ignorada em ${table}: ${missingColumn}`);
      }
    }
  }

  async upsertBySourceId(table, sourceId, row, options = {}) {
    const existing = await this.selectBySourceId(table, sourceId);
    const optionalColumns = options.optionalColumns ?? [];

    if (existing) {
      const updated = await this.writeWithOptionalColumns('update', table, sourceId, row, optionalColumns);
      return { row: updated, action: 'updated' };
    }

    const inserted = await this.writeWithOptionalColumns('insert', table, sourceId, row, optionalColumns);
    return { row: inserted, action: 'inserted' };
  }

  async upsertEventSpeakers(rows) {
    if (rows.length === 0) return [];

    return this.request('/event_speakers?on_conflict=event_id,speaker_id&select=event_id,speaker_id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(rows),
    });
  }
}

async function loadExportFile() {
  const source = await readFile(exportPath, 'utf8');
  const data = JSON.parse(source);

  if (
    !Array.isArray(data.events) ||
    !Array.isArray(data.speakers) ||
    !Array.isArray(data.users) ||
    !Array.isArray(data.companies)
  ) {
    throw new Error('data/bubble-export.json precisa conter arrays "events", "speakers", "users" e "companies".');
  }

  return data;
}

async function main() {
  const env = await loadEnvFile();
  const supabaseConfig = requireSupabaseEnv(env);
  const supabase = new SupabaseRestClient(supabaseConfig);
  const exportData = await loadExportFile();

  const speakerIdBySourceId = new Map();
  const eventIdBySourceId = new Map();
  const companyIdBySourceId = new Map();
  const speakerStats = { inserted: 0, updated: 0 };
  const eventStats = { inserted: 0, updated: 0 };
  const companyStats = { inserted: 0, updated: 0 };
  const memberStats = { inserted: 0, updated: 0 };
  const companyIdByName = new Map();

  for (const company of exportData.companies) {
    const sourceId = company._id;
    const companyName = cleanText(company.Nome_Empresa);
    if (!sourceId || !companyName) continue;

    const { row, action } = await supabase.upsertBySourceId(
      'companies',
      sourceId,
      mapCompanyToRow(company),
      { optionalColumns: ['source'] },
    );
    companyIdBySourceId.set(sourceId, row.id);
    const lookupKey = normalizeLookupKey(companyName);
    if (lookupKey) companyIdByName.set(lookupKey, row.id);
    companyStats[action] += 1;
  }

  for (const user of exportData.users) {
    const sourceId = user._id ?? user.Slug;
    if (!sourceId) continue;
    const resolvedCompany = resolveMemberCompany(user['Pessoal - Empresa'], companyIdBySourceId, companyIdByName);

    const { action } = await supabase.upsertBySourceId(
      'members',
      sourceId,
      mapUserToRow(user, resolvedCompany),
      { optionalColumns: ['bio', 'linkedin_url', 'photo_url', 'company_name'] },
    );
    memberStats[action] += 1;
  }

  for (const speaker of exportData.speakers) {
    const { row, action } = await supabase.upsertBySourceId(
      'speakers',
      speaker.sourceId,
      mapSpeakerToRow(speaker),
    );
    speakerIdBySourceId.set(speaker.sourceId, row.id);
    speakerStats[action] += 1;
  }

  for (const event of exportData.events) {
    const { row, action } = await supabase.upsertBySourceId(
      'events',
      event.sourceId,
      mapEventToRow(event),
    );
    eventIdBySourceId.set(event.sourceId, row.id);
    eventStats[action] += 1;
  }

  const relationRows = [];
  const seenRelations = new Set();

  for (const event of exportData.events) {
    const eventId = eventIdBySourceId.get(event.sourceId);
    if (!eventId) continue;

    for (const speakerSourceId of toArray(event.speakerSourceIds)) {
      const speakerId = speakerIdBySourceId.get(speakerSourceId);
      if (!speakerId) continue;

      const key = `${eventId}:${speakerId}`;
      if (seenRelations.has(key)) continue;

      seenRelations.add(key);
      relationRows.push({
        event_id: eventId,
        speaker_id: speakerId,
        order: null,
      });
    }
  }

  await supabase.upsertEventSpeakers(relationRows);

  console.log(
    `Empresas importadas: ${companyIdBySourceId.size} (${companyStats.inserted} inseridas, ${companyStats.updated} atualizadas)`,
  );
  console.log(
    `Membros importados: ${memberStats.inserted + memberStats.updated} (${memberStats.inserted} inseridos, ${memberStats.updated} atualizados)`,
  );
  console.log(
    `Speakers importados: ${speakerIdBySourceId.size} (${speakerStats.inserted} inseridos, ${speakerStats.updated} atualizados)`,
  );
  console.log(
    `Eventos importados: ${eventIdBySourceId.size} (${eventStats.inserted} inseridos, ${eventStats.updated} atualizados)`,
  );
  console.log(`Relacoes evento-speaker importadas: ${relationRows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
