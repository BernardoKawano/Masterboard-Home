/**
 * Bubble → Event mapper.
 *
 * Este arquivo é a única parte do código que conhece os nomes de campos
 * do Bubble ("Titulo", "Capa", "Horario_Inicio", etc.).
 * O resto do site trabalha com o tipo `Event` de domínio.
 */

import type { BubbleEvento } from '../../bubble';
import { bbcodeToHtml, normalizeImageUrl } from '../../bubble';
import type { Event, EventStatus } from '../../../types/domain';

// ─── Slugify ──────────────────────────────────────────────────────────────────

/**
 * Gera um slug SEO-friendly a partir de qualquer string.
 * Remove acentos, normaliza para lowercase, substitui não-alfanuméricos por hífen.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritics/acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')    // Não-alfanumérico → hífen
    .replace(/^-+|-+$/g, '')         // Strip leading/trailing hyphens
    .replace(/-{2,}/g, '-')          // Colapsa múltiplos hífens
    .slice(0, 80);                   // Comprimento razoável
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Deduplicates slugs in a list of raw events.
 * If two events generate the same slug, appends a short suffix from sourceId.
 * Returns a Map<sourceId → finalSlug>.
 */
export function buildSlugMap(raws: BubbleEvento[]): Map<string, string> {
  const seen = new Map<string, string>(); // slug → sourceId
  const result = new Map<string, string>(); // sourceId → slug

  for (const raw of raws) {
    let slug = slugify(raw.Titulo);

    if (!slug) {
      // Fallback: last 12 chars of sourceId
      slug = raw._id.slice(-12);
    }

    if (seen.has(slug) && seen.get(slug) !== raw._id) {
      // Collision: append short suffix from sourceId
      slug = `${slug}--${raw._id.slice(-6)}`;
    }

    seen.set(slug, raw._id);
    result.set(raw._id, slug);
  }

  return result;
}

// ─── Status inference ─────────────────────────────────────────────────────────

function deriveStatus(isoDate: string): EventStatus {
  const eventDate = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today ? 'past' : 'upcoming';
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * Mapeia um BubbleEvento para o tipo de domínio Event.
 *
 * @param raw     - Objeto cru do Bubble
 * @param slugMap - Mapa de sourceId → slug gerado por buildSlugMap().
 *                  Se não fornecido, o slug é gerado on-the-fly (sem dedup).
 */
export function mapBubbleEventToEvent(
  raw: BubbleEvento,
  slugMap?: Map<string, string>,
): Event {
  const id = slugMap?.get(raw._id) ?? (slugify(raw.Titulo) || raw._id.slice(-12));

  return {
    id,
    sourceId: raw._id,
    source: 'bubble',

    title: raw.Titulo.trim(),
    description: raw.Sobre ?? '',
    schedule: raw.Cronograma ? bbcodeToHtml(raw.Cronograma) : undefined,

    date: raw.Data,
    startTime: raw.Horario_Inicio,
    endTime: raw.Horario_Fim,

    venue: raw.Localizacao?.trim() ?? 'Masterboard Club',
    city: undefined, // Bubble não tem campo de cidade

    coverImage: normalizeImageUrl(raw.Capa) || undefined,

    topics: Array.isArray(raw.Temas) ? raw.Temas : [],
    edition: raw['Edicao txt'],
    editionNumber: raw.Edicao,

    status: deriveStatus(raw.Data),

    // speakerSourceIds armazena os _id do Bubble — resolvidos pelo BubbleDataSource
    speakerSourceIds: Array.isArray(raw.Speakers) ? raw.Speakers : [],

    driveLink: raw['Link Drive'],

    seoTitle: `${raw.Titulo.trim()} | Masterboard`,
    seoDescription: (raw.Sobre ?? '').slice(0, 155) || undefined,
  };
}
