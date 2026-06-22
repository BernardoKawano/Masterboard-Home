/** @typedef {'member' | 'vip' | 'founding'} MemberTier */
/** @typedef {'active' | 'inactive' | 'prospect'} MemberStatus */

export const MEMBER_SEARCH_FIELDS = [
  'name',
  'email',
  'company_name',
  'phone',
  'role',
  'city',
];

export const MEMBER_TIER_LABELS = {
  member: 'Membro',
  vip: 'VIP',
  founding: 'Fundador',
};

export const MEMBER_STATUS_LABELS = {
  active: 'Ativo',
  inactive: 'Inativo',
  prospect: 'Prospect',
};

/**
 * Normaliza termo de busca e remove caracteres que quebram filtros Supabase `.or()`.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeMemberSearchTerm(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Escapa curingas do operador ILIKE do Postgres.
 * @param {string} value
 * @returns {string}
 */
export function escapeIlikePattern(value) {
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Monta filtro `.or()` para busca de membros no Supabase.
 * @param {string} term
 * @returns {string | null}
 */
export function buildMemberSearchFilter(term) {
  const normalized = normalizeMemberSearchTerm(term);
  if (normalized.length < 2) return null;

  const pattern = `%${escapeIlikePattern(normalized)}%`;
  return MEMBER_SEARCH_FIELDS.map((field) => `${field}.ilike.${pattern}`).join(',');
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapAdminMemberRow(row) {
  const companyRelation = row.companies;
  const companyFromRelation =
    companyRelation && typeof companyRelation === 'object' && !Array.isArray(companyRelation)
      ? /** @type {{ name?: string | null; logo_url?: string | null }} */ (companyRelation).name
      : null;

  const companyName = typeof row.company_name === 'string' ? row.company_name.trim() : '';
  const hasTechnicalCompanyName =
    companyName && (/^\d{10,}x\d{3,}$/i.test(companyName) || /^[a-f0-9]{24}$/i.test(companyName));

  return {
    id: String(row.id ?? ''),
    name: typeof row.name === 'string' ? row.name : '',
    email: typeof row.email === 'string' ? row.email : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
    company: companyFromRelation ?? (hasTechnicalCompanyName ? '' : companyName),
    companyLogo:
      companyRelation &&
      typeof companyRelation === 'object' &&
      !Array.isArray(companyRelation) &&
      typeof /** @type {{ logo_url?: string | null }} */ (companyRelation).logo_url === 'string'
        ? /** @type {{ logo_url?: string | null }} */ (companyRelation).logo_url
        : '',
    role: typeof row.role === 'string' ? row.role : '',
    city: typeof row.city === 'string' ? row.city : '',
    photo: typeof row.photo_url === 'string' ? row.photo_url : '',
    linkedin: typeof row.linkedin_url === 'string' ? row.linkedin_url : '',
    tier: typeof row.tier === 'string' ? row.tier : 'member',
    status: typeof row.status === 'string' ? row.status : 'active',
    joinedAt: typeof row.joined_at === 'string' ? row.joined_at : '',
  };
}

/**
 * Filtra membros já carregados no cliente (fallback instantâneo).
 * @param {ReturnType<typeof mapAdminMemberRow>[]} members
 * @param {string} term
 */
export function filterMembersLocally(members, term) {
  const normalized = normalizeMemberSearchTerm(term).toLowerCase();
  if (normalized.length < 2) return members;

  return members.filter((member) => {
    const haystack = [
      member.name,
      member.email,
      member.company,
      member.phone,
      member.role,
      member.city,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  });
}
