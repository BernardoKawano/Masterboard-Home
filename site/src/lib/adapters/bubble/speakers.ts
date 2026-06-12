/**
 * Bubble → Speaker mapper.
 */

import type { BubbleSpeaker } from '../../bubble';
import { normalizeImageUrl } from '../../bubble';
import { parseRoleLabel } from '../../speaker-role';
import type { Speaker } from '../../../types/domain';
import { slugify } from './events';

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
