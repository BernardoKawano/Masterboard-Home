export function normalizeImageUrl(value) {
  if (typeof value !== 'string') return null;

  const url = value.trim();
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;

  return url;
}

export function normalizeLookupKey(value) {
  if (typeof value !== 'string') return null;

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return normalized || null;
}

export function getFirstRelationValue(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function isLikelyTechnicalId(value) {
  if (typeof value !== 'string') return false;

  const text = value.trim();
  return /^\d{10,}x\d{3,}$/i.test(text) || /^[a-f0-9]{24}$/i.test(text);
}

export function resolveMemberCompany(rawValue, companyIdBySourceId, companyIdByName) {
  const value = getFirstRelationValue(rawValue);
  if (!value) return { companyId: null, companyName: null };

  if (typeof value === 'object') {
    const sourceId = value._id ?? value.id ?? value.sourceId ?? null;
    const name = value.Nome_Empresa ?? value.name ?? value.Nome ?? null;
    const nameKey = normalizeLookupKey(name);

    return {
      companyId:
        (sourceId ? companyIdBySourceId.get(sourceId) : null) ??
        (nameKey ? companyIdByName.get(nameKey) : null) ??
        null,
      companyName: typeof name === 'string' && name.trim() ? name.trim() : null,
    };
  }

  if (typeof value !== 'string') return { companyId: null, companyName: null };

  const text = value.trim();
  const nameKey = normalizeLookupKey(text);
  const companyId = companyIdBySourceId.get(text) ?? (nameKey ? companyIdByName.get(nameKey) : null) ?? null;

  return {
    companyId,
    companyName: companyId || isLikelyTechnicalId(text) ? null : text,
  };
}
