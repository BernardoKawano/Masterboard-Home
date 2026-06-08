/**
 * Bubble → Member mapper.
 *
 * O endpoint /obj/user pode expor campos diferentes conforme permissões do Bubble.
 * Este mapper aceita variações comuns e ignora apenas registros sem nome.
 */

import type { BubbleUser } from '../../bubble';
import { normalizeImageUrl } from '../../bubble';
import type { Member } from '../../../types/domain';
import { slugify } from './events';

const getString = (raw: BubbleUser, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const getMemberName = (raw: BubbleUser) =>
  getString(raw, ['Nome', 'Name', 'name', 'Full Name', 'Nome completo', 'Nome Completo']);

const getMemberPhoto = (raw: BubbleUser) =>
  normalizeImageUrl(
    getString(raw, ['Foto', 'Imagem', 'Photo', 'Avatar', 'Profile Picture', 'Foto de Perfil']),
  ) || undefined;

export function mapBubbleUserToMember(raw: BubbleUser): Member | null {
  const name = getMemberName(raw);
  const photo = getMemberPhoto(raw);

  if (!name) {
    return null;
  }

  const role = getString(raw, ['Cargo', 'Role', 'Funcao', 'Função', 'Titulo', 'Título']);
  const company = getString(raw, ['Empresa', 'Company', 'Organizacao', 'Organização']);
  const roleLabel = [role, company].filter(Boolean).join(' / ') || undefined;

  return {
    id: slugify(name) || raw._id.slice(-12),
    sourceId: raw._id,
    source: 'bubble',
    name,
    email: getString(raw, ['email', 'Email']),
    phone: getString(raw, ['Telefone', 'Phone', 'Celular']),
    company,
    role,
    roleLabel,
    city: getString(raw, ['Cidade', 'City']),
    photo,
    tier: getString(raw, ['Plano', 'Tier']),
    joinedAt: getString(raw, ['Created Date']),
  };
}

