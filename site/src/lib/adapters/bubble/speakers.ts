/**
 * Bubble → Speaker mapper.
 */

import type { BubbleSpeaker } from '../../bubble';
import { normalizeImageUrl } from '../../bubble';
import type { Speaker } from '../../../types/domain';
import { slugify } from './events';

// ─── Role parsing ─────────────────────────────────────────────────────────────

/**
 * Tenta separar cargo e empresa de um campo como "CEO da VIASOFT" ou "CEO RP Trader".
 * Retorna { role, company } ou valores undefined se não for possível.
 */
function parseRoleLabel(label: string): { role?: string; company?: string } {
  if (!label) return {};

  // Padrões comuns: "Cargo da/do Empresa", "Cargo - Empresa", "Cargo | Empresa"
  const patterns = [
    /^(.+?)\s+d[ao]\s+(.+)$/i,  // "CEO da VIASOFT"
    /^(.+?)\s+-\s+(.+)$/,        // "CEO - VIASOFT"
    /^(.+?)\s+\|\s+(.+)$/,       // "CEO | VIASOFT"
  ];

  for (const pattern of patterns) {
    const match = label.match(pattern);
    if (match) {
      return { role: match[1].trim(), company: match[2].trim() };
    }
  }

  // Sem separador claro — usa o label inteiro como role
  return { role: label.trim() };
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * Mapeia um BubbleSpeaker para o tipo de domínio Speaker.
 *
 * @param raw      - Objeto cru do Bubble
 * @param slugMap  - Mapa sourceId → slug (para dedup, opcional)
 */
export function mapBubbleSpeakerToSpeaker(
  raw: BubbleSpeaker,
  slugMap?: Map<string, string>,
): Speaker {
  const id = slugMap?.get(raw._id) ?? (slugify(raw.Nome) || raw._id.slice(-12));
  const { role, company } = parseRoleLabel(raw.Setor ?? '');

  return {
    id,
    sourceId: raw._id,
    source: 'bubble',

    name: raw.Nome.trim(),
    roleLabel: raw.Setor ?? '',
    role,
    company,

    photo: normalizeImageUrl(raw.Imagem) || undefined,
    companyLogo: normalizeImageUrl(raw['Logo marca']) || undefined,

    bio: undefined, // Bubble não tem campo bio neste endpoint
    topics: undefined,
    linkedin: undefined,
  };
}

/**
 * Builds a deduplication slug map for speakers.
 */
export function buildSpeakerSlugMap(raws: BubbleSpeaker[]): Map<string, string> {
  const seen = new Map<string, string>(); // slug → sourceId
  const result = new Map<string, string>(); // sourceId → slug

  for (const raw of raws) {
    let id = slugify(raw.Nome);

    if (!id) {
      id = raw._id.slice(-12);
    }

    if (seen.has(id) && seen.get(id) !== raw._id) {
      id = `${id}--${raw._id.slice(-6)}`;
    }

    seen.set(id, raw._id);
    result.set(raw._id, id);
  }

  return result;
}
