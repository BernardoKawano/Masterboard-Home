import { LEAD_SOURCE } from './lead-source.mjs';
import { normalizeCnpj } from './cnpj-lookup.mjs';

const DRAFT_PLACEHOLDER = '(em preenchimento)';

export const FIELD_STEP_MAP = {
  email: 0,
  'email válido': 0,
  evento_interesse: 1,
  nome: 2,
  telefone: 2,
  empresa: 2,
  cargo: 3,
  faturamento: 4,
  colaboradores: 5,
  lgpd: 6,
};

export const FIELD_LABEL_MAP = {
  email: 'e-mail profissional',
  'email válido': 'e-mail válido',
  evento_interesse: 'club de interesse',
  nome: 'nome completo',
  telefone: 'WhatsApp',
  empresa: 'nome da empresa',
  cargo: 'cargo',
  faturamento: 'faturamento anual',
  colaboradores: 'número de colaboradores',
  lgpd: 'aceite da Política de Privacidade',
};

export function parseMissingFieldsFromError(error) {
  const match = String(error || '').match(/ausentes:\s*(.+)$/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);
}

export function firstStepForMissingFields(missing) {
  if (!missing.length) return 0;
  const steps = missing.map((field) => FIELD_STEP_MAP[field] ?? 6);
  return Math.min(...steps);
}

export function formatMissingFieldLabels(missing) {
  return missing.map((field) => FIELD_LABEL_MAP[field] || field).join(', ');
}

const requiredFields = [
  'email',
  'nome',
  'telefone',
  'empresa',
  'cargo',
  'faturamento',
  'colaboradores',
];

const stepValidators = {
  0: (payload) => {
    const missing = [];
    if (!payload.email) missing.push('email');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) missing.push('email válido');
    return missing;
  },
  1: (payload) => {
    const missing = [];
    if (!payload.eventoInteresse) missing.push('evento_interesse');
    return missing;
  },
  2: (payload) => {
    const missing = [];
    if (!payload.nome) missing.push('nome');
    if (!payload.whatsapp && !payload.telefone) missing.push('telefone');
    if (!payload.empresa) missing.push('empresa');
    return missing;
  },
  3: (payload) => (payload.cargo ? [] : ['cargo']),
  4: (payload) => (payload.faturamento ? [] : ['faturamento']),
  5: (payload) => (payload.colaboradores ? [] : ['colaboradores']),
  6: (payload) => (payload.lgpd ? [] : ['lgpd']),
};

export function getFormString(data, key) {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function buildCandidaturaPayload(data, meta = {}) {
  const codigoPais = getFormString(data, 'codigo_pais') || '+55';
  const whatsapp = getFormString(data, 'whatsapp');
  const telefone = getFormString(data, 'telefone') || (whatsapp ? `${codigoPais} ${whatsapp}` : '');
  const cnpjRaw = getFormString(data, 'cnpj');
  const cnpj = normalizeCnpj(cnpjRaw) || cnpjRaw || '';

  const payload = {
    leadId: getFormString(data, 'lead_id'),
    email: getFormString(data, 'email'),
    nome: getFormString(data, 'nome'),
    telefone,
    codigoPais,
    whatsapp,
    empresa: getFormString(data, 'empresa'),
    cnpj,
    cidade: getFormString(data, 'cidade'),
    cargo: getFormString(data, 'cargo'),
    faturamento: getFormString(data, 'faturamento'),
    colaboradores: getFormString(data, 'colaboradores'),
    objetivo: getFormString(data, 'objetivo'),
    website: getFormString(data, 'website'),
    eventoInteresse: getFormString(data, 'evento_interesse'),
    intencao: getFormString(data, 'intencao') || 'membro',
    momento: getFormString(data, 'momento'),
    lgpd: data.get('lgpd') === 'on' || data.get('lgpd') === 'true',
    source: getFormString(data, 'source') || meta.source || LEAD_SOURCE.MASTERBOARD_SITE_CANDIDATURA,
    referrer: getFormString(data, 'referrer') || meta.referrer || '',
    utmSource: getFormString(data, 'utm_source'),
    utmMedium: getFormString(data, 'utm_medium'),
    utmCampaign: getFormString(data, 'utm_campaign'),
    utmContent: getFormString(data, 'utm_content'),
    ref: getFormString(data, 'ref'),
    formStep: Number.parseInt(getFormString(data, 'form_step') || String(meta.formStep ?? ''), 10) || meta.formStep || 0,
    timestamp: meta.timestamp || new Date().toISOString(),
  };

  return payload;
}

export function validateDraftEmail(payload) {
  return stepValidators[0](payload);
}

export function validateStep(step, payload) {
  const validator = stepValidators[step];
  if (!validator) return [];
  return validator(payload);
}

export function validateCandidaturaPayload(payload) {
  const missing = requiredFields.filter((field) => !payload[field]);

  if (!payload.eventoInteresse) {
    missing.push('evento_interesse');
  }

  if (!payload.lgpd) {
    missing.push('lgpd');
  }

  return missing;
}

export function scoreLead(payload) {
  let score = 0;

  if (/sócio|fundador|presidente|ceo|c-level|vice-presidente/i.test(payload.cargo || '')) {
    score += 35;
  } else if (/diretor/i.test(payload.cargo || '')) {
    score += 24;
  } else if (/gerente/i.test(payload.cargo || '')) {
    score += 12;
  }

  if (/Acima de R\$500 milhões|De R\$50 a R\$500 milhões/i.test(payload.faturamento || '')) {
    score += 35;
  } else if (/De R\$10 a R\$50 milhões/i.test(payload.faturamento || '')) {
    score += 28;
  } else if (/De R\$5 a R\$10 milhões|De R\$1 milhão a R\$5 milhões/i.test(payload.faturamento || '')) {
    score += 18;
  } else if (/De R\$500 mil a R\$1 milhão/i.test(payload.faturamento || '')) {
    score += 8;
  }

  if (/Acima de 1\.000|De 101 a 1\.000/i.test(payload.colaboradores || '')) {
    score += 25;
  } else if (/De 51 a 100/i.test(payload.colaboradores || '')) {
    score += 18;
  } else if (/De 10 a 50/i.test(payload.colaboradores || '')) {
    score += 10;
  }

  if (payload.objetivo) score += 5;
  if (payload.momento) score += 5;

  return Math.min(score, 100);
}

export function priorityFromScore(score) {
  if (score >= 70) return 'high';
  if (score < 30) return 'low';
  return 'normal';
}

function qualificationNotes(payload, score, extra = {}) {
  const qualification = {
    intencao: payload.intencao,
    momento: payload.momento,
    faturamento: payload.faturamento,
    colaboradores: payload.colaboradores,
    codigo_pais: payload.codigoPais,
    whatsapp: payload.whatsapp,
    objetivo: payload.objetivo,
    cnpj: payload.cnpj || null,
    score,
    priority: priorityFromScore(score),
    source: payload.source,
    referrer: payload.referrer,
    ...(payload.utmSource || payload.utmMedium || payload.utmCampaign || payload.ref
      ? {
          utm: {
            source: payload.utmSource || null,
            medium: payload.utmMedium || null,
            campaign: payload.utmCampaign || null,
            content: payload.utmContent || null,
            ref: payload.ref || null,
          },
        }
      : {}),
    ...extra,
  };

  return JSON.stringify(qualification);
}

export function parseLeadNotes(value) {
  if (typeof value !== 'string' || !value.trim()) return {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function isDraftLead(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.status === 'draft') return true;

  const notes = parseLeadNotes(row.notes);
  if (notes.draft === true) return true;

  return row.name === DRAFT_PLACEHOLDER;
}

function nullable(value) {
  return value || null;
}

function draftField(value) {
  return value || DRAFT_PLACEHOLDER;
}

export function toDraftLeadRow(payload, formStep) {
  const score = scoreLead(payload);
  const step = formStep ?? payload.formStep ?? 0;

  return {
    email: payload.email,
    name: draftField(payload.nome),
    phone: draftField(payload.telefone),
    company: draftField(payload.empresa),
    role: draftField(payload.cargo),
    city: nullable(payload.cidade),
    lgpd_consent: false,
    source: payload.source,
    referrer: payload.referrer || null,
    status: 'new',
    intent: payload.intencao || 'membro',
    company_moment: nullable(payload.momento),
    annual_revenue: nullable(payload.faturamento),
    employee_count: nullable(payload.colaboradores),
    country_code: nullable(payload.codigoPais),
    whatsapp: nullable(payload.whatsapp),
    objective: nullable(payload.objetivo),
    website: nullable(payload.website),
    evento_interesse: nullable(payload.eventoInteresse),
    score,
    priority: priorityFromScore(score),
    notes: qualificationNotes(payload, score, { draft: true, form_step: step }),
    submitted_at: payload.timestamp,
  };
}

export function toLegacyLeadRow(payload) {
  return {
    name: payload.nome,
    email: payload.email,
    phone: payload.telefone,
    company: payload.empresa,
    role: payload.cargo,
    lgpd_consent: payload.lgpd,
    source: payload.source,
    referrer: payload.referrer || null,
    submitted_at: payload.timestamp,
  };
}

export function toLeadRow(payload) {
  const score = scoreLead(payload);

  return {
    ...toLegacyLeadRow(payload),
    city: nullable(payload.cidade),
    status: 'new',
    intent: payload.intencao,
    company_moment: payload.momento || null,
    annual_revenue: payload.faturamento,
    employee_count: payload.colaboradores,
    country_code: payload.codigoPais,
    whatsapp: payload.whatsapp,
    objective: payload.objetivo || null,
    website: payload.website || null,
    evento_interesse: payload.eventoInteresse || null,
    score,
    priority: priorityFromScore(score),
    notes: qualificationNotes(payload, score, { draft: false, form_step: 6 }),
  };
}
