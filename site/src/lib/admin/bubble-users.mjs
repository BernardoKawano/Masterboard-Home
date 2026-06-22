/** @typedef {Record<string, unknown>} BubbleRawUser */

const FIELD_KEYS = {
  name: ['Pessoal - Nome', 'Nome', 'Name', 'name'],
  email: ['email', 'Email'],
  whatsapp: ['Pessoal - Whatsapp', 'Whatsapp', 'Telefone', 'Phone', 'Celular'],
  linkedin: ['Rede - Linkedin', 'LinkedIn'],
  instagram: ['Rede - Instagram', 'Instagram'],
  website: ['Rede - Website', 'Website', 'Site'],
  cities: ['Pessoal - Cidades', 'Cidades de atuação', 'Cidades', 'Cidade', 'City'],
  role: ['Pessoal - Cargo', 'Cargo', 'Role'],
  roleOther: ['Pessoal - Cargo - Outro', 'Cargo - Outro'],
  companyRef: ['Pessoal - Empresa', 'Empresa', 'Company'],
  companyName: ['Empresa - Nome', 'Nome_Empresa', 'Empresa Nome'],
  companySize: ['Empresa - Tamanho', 'Tamanho', 'Empresa - Colaboradores'],
  companyRevenue: ['Empresa - Faturamento', 'Faturamento'],
  referral: ['Como chegou', 'Origem', 'Source', 'Geral - Origem'],
  tier: ['Geral - Tier', 'Tier', 'Plano'],
  userType: ['Geral - Tipo', 'Tipo usuário', 'Tipo', 'Tipo_usuario'],
  joinedAt: ['Geral - Data ingresso', 'Data de ingresso', 'Data ingresso'],
  renewalAt: ['Geral - Data renovacao', 'Data de renovação', 'Data renovacao', 'Renovacao'],
  status: ['Admin - Status', 'Status'],
  accountOwner: ['Admin - Account', 'Account responsável', 'Account', 'Responsavel'],
  qualification: ['Admin - Qualificacao', 'Admin - Qualificação', 'Critérios de qualificação'],
  invitedEvents: ['Eventos convidado', 'Eventos - Convidado', 'Eventos_convidado'],
  confirmedEvents: ['Eventos confirmado', 'Eventos - Confirmado', 'Eventos_confirmado'],
  photo: ['Pessoal - Foto_perfil', 'Foto', 'Photo', 'Avatar', 'Imagem'],
  bio: ['Pessoal - Biografia', 'Biografia', 'Bio'],
  sector: ['Empresa - Setor', 'Setor', 'Setores', 'Setores - Outro'],
  challenges: ['Empresa - Desafios', 'Desafios'],
  icpChallenges: ['Empresa - Desafios ICP', 'Desafios - ICP', 'Desafios ICP'],
};

/**
 * @param {BubbleRawUser | null | undefined} raw
 * @param {string[]} keys
 * @returns {string}
 */
export function getBubbleField(raw, keys) {
  if (!raw) return '';

  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }

  return '';
}

/**
 * @param {BubbleRawUser | null | undefined} raw
 * @returns {string}
 */
export function getBubbleUserEmail(raw) {
  const auth = raw?.authentication;
  if (auth && typeof auth === 'object' && !Array.isArray(auth)) {
    const emailBlock = /** @type {{ email?: { email?: string } }} */ (auth).email;
    if (emailBlock?.email?.trim()) return emailBlock.email.trim();
  }

  return getBubbleField(raw, FIELD_KEYS.email);
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object' && 'Nome' in item && typeof item.Nome === 'string') {
          return item.Nome.trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;\n|]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isLikelyBubbleId(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9x]{10,}$/i.test(value) || /^[a-f0-9]{24}$/i.test(value);
}

/**
 * @param {BubbleRawUser} raw
 * @param {{
 *   companyNames?: Map<string, string>;
 *   companyProfiles?: Map<string, {
 *     name?: string;
 *     revenue?: string;
 *     size?: string;
 *     sector?: string;
 *     challenges?: string;
 *     icpChallenges?: string;
 *   }>;
 *   eventNames?: Map<string, string>;
 * }} [context]
 */
export function mapBubbleAppUser(raw, context = {}) {
  const { companyNames = new Map(), companyProfiles = new Map(), eventNames = new Map() } = context;
  const companyRef = getBubbleField(raw, FIELD_KEYS.companyRef);
  const companyProfile = companyRef ? companyProfiles.get(companyRef) : undefined;
  let companyName = getBubbleField(raw, FIELD_KEYS.companyName) || companyProfile?.name || '';

  if (!companyName && companyRef && companyNames.has(companyRef)) {
    companyName = companyNames.get(companyRef) ?? '';
  } else if (!companyName && companyRef && !isLikelyBubbleId(companyRef)) {
    companyName = companyRef;
  }

  const mapEvents = (value) =>
    normalizeStringList(value).map((entry) => eventNames.get(entry) ?? entry);

  const createdAt = getBubbleField(raw, ['Created Date']) || getBubbleField(raw, FIELD_KEYS.joinedAt);
  const renewalAt = getBubbleField(raw, FIELD_KEYS.renewalAt);
  const companyRevenue =
    getBubbleField(raw, FIELD_KEYS.companyRevenue) || companyProfile?.revenue || '';
  const companySize = getBubbleField(raw, FIELD_KEYS.companySize) || companyProfile?.size || '';

  return {
    id: String(raw._id ?? ''),
    name: getBubbleField(raw, FIELD_KEYS.name),
    email: getBubbleUserEmail(raw),
    whatsapp: getBubbleField(raw, FIELD_KEYS.whatsapp),
    linkedin: getBubbleField(raw, FIELD_KEYS.linkedin),
    instagram: getBubbleField(raw, FIELD_KEYS.instagram),
    website: getBubbleField(raw, FIELD_KEYS.website),
    cities: getBubbleField(raw, FIELD_KEYS.cities),
    role: getBubbleField(raw, FIELD_KEYS.role),
    roleOther: getBubbleField(raw, FIELD_KEYS.roleOther),
    companyName,
    companySize,
    companyRevenue,
    sector: getBubbleField(raw, FIELD_KEYS.sector) || companyProfile?.sector || '',
    challenges: getBubbleField(raw, FIELD_KEYS.challenges) || companyProfile?.challenges || '',
    icpChallenges:
      getBubbleField(raw, FIELD_KEYS.icpChallenges) || companyProfile?.icpChallenges || '',
    referral: getBubbleField(raw, FIELD_KEYS.referral),
    tier: getBubbleField(raw, FIELD_KEYS.tier) || 'Free',
    userType: getBubbleField(raw, FIELD_KEYS.userType),
    joinedAt: getBubbleField(raw, FIELD_KEYS.joinedAt) || createdAt,
    renewalAt,
    renewalMonth: toRenewalMonthLabel(renewalAt),
    status: getBubbleField(raw, FIELD_KEYS.status),
    accountOwner: getBubbleField(raw, FIELD_KEYS.accountOwner),
    qualification: getBubbleField(raw, FIELD_KEYS.qualification),
    invitedEvents: mapEvents(raw[FIELD_KEYS.invitedEvents[0]] ?? raw['Eventos convidado']),
    confirmedEvents: mapEvents(raw[FIELD_KEYS.confirmedEvents[0]] ?? raw['Eventos confirmado']),
    photo: getBubbleField(raw, FIELD_KEYS.photo),
    bio: getBubbleField(raw, FIELD_KEYS.bio),
    registeredAt: createdAt,
    signedUp: raw.user_signed_up === true,
  };
}

/**
 * @param {string} value
 * @returns {string}
 */
function toRenewalMonthLabel(value) {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${month}/${date.getFullYear()}`;
}

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeUserSearchTerm(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 80);
}

/**
 * @param {ReturnType<typeof mapBubbleAppUser>[]} users
 * @param {string} term
 */
export function filterAppUsers(users, term) {
  const normalized = normalizeUserSearchTerm(term).toLowerCase();
  if (normalized.length < 2) return users;

  return users.filter((user) =>
    [user.name, user.email, user.whatsapp, user.companyName, user.role, user.status, user.tier]
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  );
}

/**
 * @param {unknown} value
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatBubbleDateTime(value, options = {}) {
  if (typeof value !== 'string' || !value.trim()) return '—';

  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
    ...options,
  }).format(date);
}

/**
 * @param {ReturnType<typeof mapBubbleAppUser>} user
 */
export function toAppUserListItem(user) {
  return {
    id: user.id,
    name: user.name || '(sem nome)',
    email: user.email || '—',
    whatsapp: user.whatsapp || '—',
    registeredAt: user.registeredAt,
    registeredAtLabel: formatBubbleDateTime(user.registeredAt),
    tier: user.tier,
    status: user.status,
  };
}
