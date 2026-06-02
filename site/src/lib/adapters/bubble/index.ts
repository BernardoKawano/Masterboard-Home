/**
 * BubbleDataSource — implementação de ContentDataSource usando o Bubble.io.
 *
 * Esta é a ÚNICA parte do código que chama funções de bubble.ts.
 * As páginas Astro chamam `dataSource.*`, não funções do Bubble diretamente.
 *
 * Para migrar para outro backend:
 *   1. Crie src/lib/adapters/supabase/index.ts com a mesma interface
 *   2. Troque o export em src/lib/data-source.ts
 *   3. Pronto — nenhuma página muda
 */

import {
  fetchAllEvents,
  fetchAllSpeakers,
  fetchMemberCount,
  formatBubbleDate,
  formatBubbleTime,
} from '../../bubble';
import { mapBubbleEventToEvent, buildSlugMap } from './events';
import { mapBubbleSpeakerToSpeaker, buildSpeakerSlugMap } from './speakers';
import type { ContentDataSource, ListEventsOptions } from '../../data-source';
import type { Event, Speaker } from '../../../types/domain';

// ─── Internal cache of mapped domain objects ──────────────────────────────────

let _eventsCache: Event[] | null = null;
let _eventsCacheExpiry = 0;
let _speakersCache: Speaker[] | null = null;
let _speakersCacheExpiry = 0;

const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getCachedEvents(): Promise<Event[]> {
  if (_eventsCache && Date.now() < _eventsCacheExpiry) {
    return _eventsCache;
  }

  const raws = await fetchAllEvents();
  const slugMap = buildSlugMap(raws);
  const mapped = raws.map((r) => mapBubbleEventToEvent(r, slugMap));

  _eventsCache = mapped;
  _eventsCacheExpiry = Date.now() + CACHE_TTL;
  return mapped;
}

async function getCachedSpeakers(): Promise<Speaker[]> {
  if (_speakersCache && Date.now() < _speakersCacheExpiry) {
    return _speakersCache;
  }

  const raws = await fetchAllSpeakers();
  const slugMap = buildSpeakerSlugMap(raws);
  const mapped = raws.map((r) => mapBubbleSpeakerToSpeaker(r, slugMap));
  const seenSpeakerNames = new Set<string>();
  const seenSpeakerPhotos = new Set<string>();
  const uniqueSpeakers = mapped.filter((speaker) => {
    const nameKey = speaker.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const photoKey = speaker.photo?.toLowerCase().trim();

    if (!nameKey || seenSpeakerNames.has(nameKey) || (photoKey && seenSpeakerPhotos.has(photoKey))) {
      return false;
    }

    seenSpeakerNames.add(nameKey);
    if (photoKey) {
      seenSpeakerPhotos.add(photoKey);
    }

    return true;
  });

  _speakersCache = uniqueSpeakers;
  _speakersCacheExpiry = Date.now() + CACHE_TTL;
  return uniqueSpeakers;
}

// ─── BubbleDataSource implementation ─────────────────────────────────────────

export const bubbleDataSource: ContentDataSource = {
  name: 'bubble',

  // ─── Events ───────────────────────────────────────────────────

  async listEvents(options: ListEventsOptions = {}): Promise<Event[]> {
    const { status = 'all', sortAscending, limit, offset = 0 } = options;

    let events = await getCachedEvents();

    // Filter by status
    if (status !== 'all') {
      events = events.filter((e) => e.status === status);
    }

    // Sort
    if (sortAscending === true) {
      events = [...events].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    } else if (sortAscending === false) {
      events = [...events].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    // Paginate
    const sliced = limit
      ? events.slice(offset, offset + limit)
      : events.slice(offset);

    return sliced;
  },

  async getEventById(id: string): Promise<Event | null> {
    const events = await getCachedEvents();
    return events.find((e) => e.id === id) ?? null;
  },

  async getSpeakersForEvent(event: Event): Promise<Speaker[]> {
    if (!event.speakerSourceIds.length) return [];
    const speakers = await getCachedSpeakers();
    const idSet = new Set(event.speakerSourceIds);
    // Match by sourceId (Bubble _id)
    return speakers.filter((s) => idSet.has(s.sourceId));
  },

  // ─── Speakers ─────────────────────────────────────────────────

  async listSpeakers(): Promise<Speaker[]> {
    return getCachedSpeakers();
  },

  // ─── Members ──────────────────────────────────────────────────

  async getMemberCount(): Promise<number> {
    return fetchMemberCount();
  },

  // ─── Helpers exposed via data source ──────────────────────────
  // Nota: estes helpers de formatação são para uso nos templates.
  // Eles dependem de detalhes do Bubble (ISO com fuso), mas o domínio
  // está isolado porque os campos já chegam como ISO strings genéricas.
};

// ─── Re-export formatting helpers ────────────────────────────────────────────
// Helpers que formatam campos do tipo domain.Event (ISO strings).
// Podem ser reimplementados por qualquer adapter — as páginas os importam
// de cá, não de bubble.ts diretamente.

export { formatBubbleDate as formatEventDate, formatBubbleTime as formatEventTime };
