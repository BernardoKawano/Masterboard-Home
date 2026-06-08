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
  fetchMemberCompanies,
  fetchMemberCount,
  fetchMemberCompanyCount,
  fetchMemberPreview,
  formatBubbleDate,
  formatBubbleTime,
} from '../../bubble';
import { mapBubbleEventToEvent, buildSlugMap, slugify } from './events';
import { mapBubbleUserToMember } from './members';
import { mapBubbleSpeakerToSpeaker, buildSpeakerSlugMap } from './speakers';
import type { ContentDataSource, ListEventsOptions, ListMemberCompaniesOptions } from '../../data-source';
import type { Event, Member, MemberCompany, Speaker } from '../../../types/domain';

// ─── Internal cache of mapped domain objects ──────────────────────────────────

let _eventsCache: Event[] | null = null;
let _eventsCacheExpiry = 0;
let _speakersCache: Speaker[] | null = null;
let _speakersCacheExpiry = 0;
let _membersCache: Member[] | null = null;
let _membersCacheExpiry = 0;
let _memberCompaniesCache: MemberCompany[] | null = null;
let _memberCompaniesCacheExpiry = 0;

const CACHE_TTL = 5 * 60 * 1000; // 5 min

const cleanPublicText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned || /^pre?ncher$/i.test(cleaned)) return undefined;
  return cleaned;
};

const mapCompanyToMemberCompany = (raw: Awaited<ReturnType<typeof fetchMemberCompanies>>[number]): MemberCompany | null => {
  const name = cleanPublicText(raw.Nome_Empresa);
  if (!name) return null;

  return {
    id: slugify(name) || raw._id.slice(-12),
    sourceId: raw._id,
    source: 'bubble',
    name,
    city: cleanPublicText(raw['Localização']),
    size: cleanPublicText(raw.Tamanho),
    revenue: cleanPublicText(raw.Faturamento),
    sector: cleanPublicText(raw['Setores - Outro']),
    services: cleanPublicText(raw.Serviços_ofertados),
    completedProfile: raw.Cadastro_completo,
  };
};

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

async function getCachedMembers(): Promise<Member[]> {
  if (_membersCache && Date.now() < _membersCacheExpiry) {
    return _membersCache;
  }

  const raws = await fetchMemberPreview();
  const mapped = raws
    .map((raw) => mapBubbleUserToMember(raw))
    .filter((member): member is Member => Boolean(member));
  const seenMemberNames = new Set<string>();
  const seenMemberPhotos = new Set<string>();
  const uniqueMembers = mapped.filter((member) => {
    const nameKey = member.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const photoKey = member.photo?.toLowerCase().trim();

    if (!nameKey || seenMemberNames.has(nameKey) || (photoKey && seenMemberPhotos.has(photoKey))) {
      return false;
    }

    seenMemberNames.add(nameKey);
    if (photoKey) {
      seenMemberPhotos.add(photoKey);
    }

    return true;
  });

  _membersCache = uniqueMembers;
  _membersCacheExpiry = Date.now() + CACHE_TTL;
  return uniqueMembers;
}

async function getCachedMemberCompanies(options: ListMemberCompaniesOptions = {}): Promise<MemberCompany[]> {
  const limit = options.limit ?? 18;
  const offset = options.offset ?? 0;

  if (_memberCompaniesCache && Date.now() < _memberCompaniesCacheExpiry && offset === 0 && limit <= _memberCompaniesCache.length) {
    return _memberCompaniesCache.slice(0, limit);
  }

  const raws = await fetchMemberCompanies(Math.max(limit + 16, 40), offset);
  const seenCompanyNames = new Set<string>();
  const companies = raws
    .map(mapCompanyToMemberCompany)
    .filter((company): company is MemberCompany => Boolean(company))
    .filter((company) => {
      const key = company.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

      if (!key || seenCompanyNames.has(key)) return false;
      seenCompanyNames.add(key);
      return true;
    })
    .sort((first, second) => {
      if (first.completedProfile !== second.completedProfile) {
        return first.completedProfile ? -1 : 1;
      }

      return first.name.localeCompare(second.name, 'pt-BR');
    });

  if (offset === 0) {
    _memberCompaniesCache = companies;
    _memberCompaniesCacheExpiry = Date.now() + CACHE_TTL;
  }

  return companies.slice(0, limit);
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

  async listMembers(): Promise<Member[]> {
    return getCachedMembers();
  },

  async listMemberCompanies(options: ListMemberCompaniesOptions = {}): Promise<MemberCompany[]> {
    return getCachedMemberCompanies(options);
  },

  async getMemberCount(): Promise<number> {
    return fetchMemberCount();
  },

  async getMemberCompanyCount(): Promise<number> {
    return fetchMemberCompanyCount();
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
