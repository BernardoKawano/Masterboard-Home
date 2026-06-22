/** @typedef {ReturnType<import('./bubble-users.mjs').mapBubbleAppUser>} AppUser */

/** @typedef {Record<string, string>} UserFilters */

export const USER_FILTER_FIELDS = [
  { id: 'tipo', label: 'Tipo', kind: 'scalar', userKey: 'userType' },
  { id: 'tier', label: 'Tier', kind: 'scalar', userKey: 'tier' },
  { id: 'cargo', label: 'Cargo', kind: 'scalar', userKey: 'role' },
  { id: 'renewalAt', label: 'Data de renovação', kind: 'scalar', userKey: 'renewalMonth' },
  { id: 'faturamento', label: 'Faturamento', kind: 'scalar', userKey: 'companyRevenue' },
  { id: 'tamanho', label: 'Tamanho', kind: 'scalar', userKey: 'companySize' },
  { id: 'eventoConvidado', label: 'Evento convidado', kind: 'event', userKey: 'invitedEvents' },
  { id: 'eventoConfirmado', label: 'Evento confirmado', kind: 'event', userKey: 'confirmedEvents' },
  { id: 'qualificacao', label: 'Qualificação', kind: 'scalar', userKey: 'qualification' },
  { id: 'status', label: 'Status', kind: 'scalar', userKey: 'status' },
  { id: 'responsavel', label: 'Responsável', kind: 'scalar', userKey: 'accountOwner' },
  { id: 'setor', label: 'Setor', kind: 'scalar', userKey: 'sector' },
  { id: 'desafios', label: 'Desafios', kind: 'scalar', userKey: 'challenges' },
  { id: 'desafiosIcp', label: 'Desafios - ICP', kind: 'scalar', userKey: 'icpChallenges' },
];

/**
 * @param {unknown} value
 * @returns {string}
 */
export function toRenewalMonth(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
}

/**
 * @param {URLSearchParams | Record<string, string | undefined>} source
 * @returns {UserFilters}
 */
export function parseUserFilters(source) {
  /** @type {UserFilters} */
  const filters = {};

  for (const field of USER_FILTER_FIELDS) {
    const value =
      source instanceof URLSearchParams
        ? source.get(field.id)?.trim()
        : String(source[field.id] ?? '').trim();

    if (value) filters[field.id] = value;
  }

  return filters;
}

/**
 * @param {AppUser[]} users
 * @param {UserFilters} filters
 */
export function applyUserFilters(users, filters) {
  const active = Object.entries(filters).filter(([, value]) => value);
  if (active.length === 0) return users;

  return users.filter((user) =>
    active.every(([filterId, expected]) => {
      const field = USER_FILTER_FIELDS.find((item) => item.id === filterId);
      if (!field) return true;

      const key = /** @type {keyof AppUser} */ (field.userKey);
      const actual = user[key];

      if (field.kind === 'event') {
        return Array.isArray(actual) && actual.includes(expected);
      }

      return String(actual ?? '') === expected;
    }),
  );
}

/**
 * @param {AppUser[]} users
 */
export function buildUserFilterOptions(users) {
  /** @type {Record<string, string[]>} */
  const options = Object.fromEntries(USER_FILTER_FIELDS.map((field) => [field.id, []]));

  /** @type {Record<string, Set<string>>} */
  const buckets = Object.fromEntries(USER_FILTER_FIELDS.map((field) => [field.id, new Set()]));

  for (const user of users) {
    for (const field of USER_FILTER_FIELDS) {
      const key = /** @type {keyof AppUser} */ (field.userKey);
      const value = user[key];

      if (field.kind === 'event' && Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry) buckets[field.id].add(entry);
        });
        continue;
      }

      if (typeof value === 'string' && value.trim()) {
        buckets[field.id].add(value.trim());
      }
    }
  }

  for (const field of USER_FILTER_FIELDS) {
    options[field.id] = [...buckets[field.id]].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
    );
  }

  return options;
}

/**
 * @param {UserFilters} filters
 * @returns {number}
 */
export function countActiveUserFilters(filters) {
  return Object.values(filters).filter(Boolean).length;
}
