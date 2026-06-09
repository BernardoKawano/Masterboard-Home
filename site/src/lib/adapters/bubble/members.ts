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

const isLikelyTechnicalId = (value?: string) =>
  Boolean(value && (/^\d{10,}x\d{3,}$/i.test(value) || /^[a-f0-9]{24}$/i.test(value)));

const getMemberName = (raw: BubbleUser) =>
  getString(raw, [
    'Pessoal - Nome',
    'Nome',
    'Name',
    'name',
    'Full Name',
    'full_name',
    'Nome completo',
    'Nome Completo',
    'Nome_Completo',
    'display_name',
  ]);

const getMemberPhoto = (raw: BubbleUser) =>
  normalizeImageUrl(
    getString(raw, [
      'Pessoal - Foto_perfil',
      'Foto',
      'Imagem',
      'Photo',
      'Avatar',
      'Profile Picture',
      'Foto de Perfil',
      'Foto_Perfil',
      'profile_picture',
      'profilePicture',
      'Imagem Perfil',
    ]),
  ) || undefined;

export function mapBubbleUserToMember(raw: BubbleUser, companyNameBySourceId = new Map<string, string>()): Member | null {
  const name = getMemberName(raw);
  const photo = getMemberPhoto(raw);

  if (!name) {
    return null;
  }

  const role = getString(raw, ['Pessoal - Cargo', 'Cargo', 'Role', 'Funcao', 'Função', 'Titulo', 'Título', 'Title']);
  const rawCompany = getString(raw, [
    'Pessoal - Empresa',
    'Empresa',
    'Company',
    'Organizacao',
    'Organização',
    'Nome_Empresa',
    'Empresa Nome',
    'company_name',
  ]);
  const company = rawCompany ? companyNameBySourceId.get(rawCompany) ?? (isLikelyTechnicalId(rawCompany) ? undefined : rawCompany) : undefined;
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

