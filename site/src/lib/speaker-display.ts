/** Normaliza cargo para exibição. "Empresa" vira "CEO" quando não há cargo real. */
export function displaySpeakerRole(role?: string | null, roleLabel?: string | null): string {
  const primary = String(role ?? '').trim();
  const fallback = String(roleLabel ?? '').trim();
  const value = primary || fallback;

  if (!value) return 'Líder convidado';

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (normalized === 'empresa') return 'CEO';

  return value;
}

export function speakerCompanyFieldLabel(count: number): string {
  return count > 1 ? 'Empresas' : 'Empresa';
}
