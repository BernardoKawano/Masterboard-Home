const requiredFields = [
  'email',
  'nome',
  'telefone',
  'empresa',
  'cargo',
  'faturamento',
  'colaboradores',
];

export function getFormString(data, key) {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function buildCandidaturaPayload(data, meta = {}) {
  const codigoPais = getFormString(data, 'codigo_pais') || '+55';
  const whatsapp = getFormString(data, 'whatsapp');
  const telefone = getFormString(data, 'telefone') || (whatsapp ? `${codigoPais} ${whatsapp}` : '');

  const payload = {
    email: getFormString(data, 'email'),
    nome: getFormString(data, 'nome'),
    telefone,
    codigoPais,
    whatsapp,
    empresa: getFormString(data, 'empresa'),
    cargo: getFormString(data, 'cargo'),
    faturamento: getFormString(data, 'faturamento'),
    colaboradores: getFormString(data, 'colaboradores'),
    objetivo: getFormString(data, 'objetivo'),
    website: getFormString(data, 'website'),
    eventoInteresse: getFormString(data, 'evento_interesse'),
    intencao: getFormString(data, 'intencao') || 'membro',
    momento: getFormString(data, 'momento'),
    lgpd: data.get('lgpd') === 'on' || data.get('lgpd') === 'true',
    source: getFormString(data, 'source') || meta.source || 'site-candidatura',
    referrer: getFormString(data, 'referrer') || meta.referrer || '',
    timestamp: meta.timestamp || new Date().toISOString(),
  };

  return payload;
}

export function validateCandidaturaPayload(payload) {
  const missing = requiredFields.filter((field) => !payload[field]);

  if (!payload.lgpd) {
    missing.push('lgpd');
  }

  return missing;
}

export function scoreLead(payload) {
  let score = 0;

  if (/sócio|fundador|presidente|ceo|c-level|vice-presidente/i.test(payload.cargo)) {
    score += 35;
  } else if (/diretor/i.test(payload.cargo)) {
    score += 24;
  } else if (/gerente/i.test(payload.cargo)) {
    score += 12;
  }

  if (/Acima de R\$500 milhões|De R\$50 a R\$500 milhões/i.test(payload.faturamento)) {
    score += 35;
  } else if (/De R\$10 a R\$50 milhões/i.test(payload.faturamento)) {
    score += 28;
  } else if (/De R\$5 a R\$10 milhões|De R\$1 milhão a R\$5 milhões/i.test(payload.faturamento)) {
    score += 18;
  } else if (/De R\$500 mil a R\$1 milhão/i.test(payload.faturamento)) {
    score += 8;
  }

  if (/Acima de 1\.000|De 101 a 1\.000/i.test(payload.colaboradores)) {
    score += 25;
  } else if (/De 51 a 100/i.test(payload.colaboradores)) {
    score += 18;
  } else if (/De 10 a 50/i.test(payload.colaboradores)) {
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

function qualificationNotes(payload, score) {
  const qualification = {
    intencao: payload.intencao,
    momento: payload.momento,
    faturamento: payload.faturamento,
    colaboradores: payload.colaboradores,
    codigo_pais: payload.codigoPais,
    whatsapp: payload.whatsapp,
    objetivo: payload.objetivo,
    score,
    priority: priorityFromScore(score),
    source: payload.source,
    referrer: payload.referrer,
  };

  return JSON.stringify(qualification);
}

export function toLegacyLeadRow(payload) {
  const score = scoreLead(payload);

  return {
    name: payload.nome,
    email: payload.email,
    phone: payload.telefone,
    company: payload.empresa,
    role: payload.cargo,
    lgpd_consent: payload.lgpd,
    source: payload.source,
    referrer: payload.referrer || null,
    notes: qualificationNotes(payload, score),
    submitted_at: payload.timestamp,
  };
}

export function toLeadRow(payload) {
  const score = scoreLead(payload);

  return {
    ...toLegacyLeadRow(payload),
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
  };
}
