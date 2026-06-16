/** @typedef {'masterboard' | 'scale' | 'unknown'} LeadBrand */

/**
 * Padrão: marca:canal:detalhe
 * Ex.: masterboard:site:candidatura
 */
export const LEAD_SOURCE = Object.freeze({
  MASTERBOARD_SITE_CANDIDATURA: 'masterboard:site:candidatura',
  MASTERBOARD_SITE_CTA: 'masterboard:site:cta',
  MASTERBOARD_SITE_EVENTO: 'masterboard:site:evento',
  MASTERBOARD_APP: 'masterboard:app:signup',
  MASTERBOARD_WHATSAPP: 'masterboard:whatsapp:inbound',

  SCALE_SITE_CANDIDATURA: 'scale:site:candidatura',
  SCALE_SITE_CTA: 'scale:site:cta',
  SCALE_SITE_EVENTO: 'scale:site:evento',
  SCALE_APP: 'scale:app:signup',
  SCALE_WHATSAPP: 'scale:whatsapp:inbound',
});

/** Valores antigos ainda presentes no banco → marca Masterboard. */
const LEGACY_MASTERBOARD_SOURCES = new Set(['candidatura-page', 'site-candidatura']);

const BRAND_LABELS = {
  masterboard: 'Masterboard',
  scale: 'Scale',
  unknown: 'Outros',
};

const CHANNEL_LABELS = {
  site: 'Site',
  app: 'App',
  whatsapp: 'WhatsApp',
};

/**
 * @param {string | null | undefined} source
 */
export function parseLeadSource(source) {
  const raw = typeof source === 'string' ? source.trim() : '';
  if (!raw) {
    return { raw: '', brand: 'unknown', channel: '', detail: '' };
  }

  if (LEGACY_MASTERBOARD_SOURCES.has(raw)) {
    return { raw, brand: 'masterboard', channel: 'site', detail: 'candidatura' };
  }

  const [brand, channel = '', detail = ''] = raw.split(':');
  const normalizedBrand = brand === 'masterboard' || brand === 'scale' ? brand : 'unknown';

  return {
    raw,
    brand: /** @type {LeadBrand} */ (normalizedBrand),
    channel,
    detail,
  };
}

/**
 * @param {LeadBrand | string} brand
 */
export function getLeadBrandLabel(brand) {
  return BRAND_LABELS[/** @type {keyof typeof BRAND_LABELS} */ (brand)] ?? brand;
}

/**
 * @param {ReturnType<typeof parseLeadSource>} parsed
 */
export function formatLeadSourceLabel(parsed) {
  if (!parsed.raw) return '-';

  if (LEGACY_MASTERBOARD_SOURCES.has(parsed.raw)) {
    return 'Masterboard · Site · candidatura (legado)';
  }

  const brand = getLeadBrandLabel(parsed.brand);
  const channel = CHANNEL_LABELS[/** @type {keyof typeof CHANNEL_LABELS} */ (parsed.channel)] ?? parsed.channel;
  const detail = parsed.detail ? parsed.detail.replace(/-/g, ' ') : '';

  return [brand, channel, detail].filter(Boolean).join(' · ');
}

/**
 * Filtros usados no painel /admin/leads/.
 * @param {LeadBrand | 'all'} brand
 */
export function leadSourceFilterValues(brand) {
  if (brand === 'all') return null;

  if (brand === 'masterboard') {
    return {
      supabaseOr: 'source.ilike.masterboard:%,source.eq.candidatura-page,source.eq.site-candidatura',
    };
  }

  if (brand === 'scale') {
    return {
      supabaseOr: 'source.ilike.scale:%',
    };
  }

  return {
    supabaseOr: `source.not.ilike.masterboard:%,source.not.ilike.scale:%,source.not.eq.candidatura-page,source.not.eq.site-candidatura`,
  };
}
