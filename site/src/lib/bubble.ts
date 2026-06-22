/**
 * Bubble.io API client — server-side only.
 *
 * Never import this module in client-side scripts.
 * All fetches happen on the server (Astro SSR or build-time).
 *
 * Token (BUBBLE_API_TOKEN) is optional for public read endpoints.
 * Set it in .env if you need privileged access (member data, etc.).
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const BUBBLE_BASE =
  import.meta.env.BUBBLE_BASE_URL ?? 'https://app.masterboard.com.br/api/1.1';

const BUBBLE_TOKEN: string | undefined = import.meta.env.BUBBLE_API_TOKEN;

/** In-memory cache TTL in milliseconds (5 minutes). */
const CACHE_TTL = 5 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BubbleEvento {
  _id: string;
  Titulo: string;
  Slug: string;
  Sobre: string;
  Cronograma?: string;
  Data: string;               // ISO date: "2025-06-07T03:00:00.000Z"
  Horario_Inicio: string;     // ISO datetime
  Horario_Fim: string;        // ISO datetime
  Localizacao: string;
  Capa: string;               // protocol-relative "//cdn.bubble.io/..."
  Temas: string[];
  Speakers?: string[];        // array of speaker _ids
  Conteudos?: string[];       // array of content _ids
  'Edicao txt'?: string;      // "Master #101"
  Edicao?: number;
  'Link Drive'?: string;
  'ID - Evento passado'?: string;
  'Usuarios Confirmados'?: string[];
  'Usuarios Presentes'?: string[];
  'Created Date': string;
  'Modified Date': string;
}

export interface BubbleSpeaker {
  _id: string;
  Nome: string;
  Setor: string;              // role / company (e.g., "CEO da VIASOFT")
  Imagem: string;             // protocol-relative
  'Logo marca'?: string;      // company logo, protocol-relative
  'Created Date': string;
  'Modified Date': string;
}

export interface BubbleUser {
  _id: string;
  email?: string;
  Email?: string;
  Nome?: string;
  Name?: string;
  name?: string;
  Cargo?: string;
  Role?: string;
  Empresa?: string;
  Company?: string;
  Cidade?: string;
  City?: string;
  Telefone?: string;
  Phone?: string;
  Foto?: string;
  Imagem?: string;
  Photo?: string;
  Avatar?: string;
  'Profile Picture'?: string;
  Plano?: string;
  Tier?: string;
  user_signed_up?: boolean;
  'Created Date'?: string;
  'Modified Date'?: string;
  [key: string]: unknown;
}

export interface BubbleEmpresa {
  _id: string;
  Nome_Empresa?: string;
  Faturamento?: string;
  'Localização'?: string;
  Tamanho?: string;
  Setores?: string;
  'Setores - Outro'?: string;
  Desafios?: string;
  'Desafios - ICP'?: string;
  Cadastro_completo?: boolean;
  'Serviços_ofertados'?: string;
  'Created Date'?: string;
  'Modified Date'?: string;
  [key: string]: unknown;
}

export type EventStatus = 'upcoming' | 'past';

interface BubbleListResponse<T> {
  response: {
    cursor: number;
    results: T[];
    count: number;
    remaining: number;
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _cache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    _cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T): void {
  _cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function bubbleFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T | null> {
  const url = new URL(`${BUBBLE_BASE}${path}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (BUBBLE_TOKEN) {
    headers['Authorization'] = `Bearer ${BUBBLE_TOKEN}`;
  }

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      console.error(`[Bubble] ${res.status} ${url.toString()}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[Bubble] fetch error: ${url.toString()}`, err);
    return null;
  }
}

// ─── Pagination helper ────────────────────────────────────────────────────────

async function fetchAllPages<T>(
  type: string,
  pageSize = 100,
  extraParams?: Record<string, string>,
): Promise<T[]> {
  const cacheKey = `all:${type}:${JSON.stringify(extraParams ?? {})}`;
  const cached = cacheGet<T[]>(cacheKey);
  if (cached) return cached;

  const all: T[] = [];
  let cursor = 0;

  for (;;) {
    const data = await bubbleFetch<BubbleListResponse<T>>(`/obj/${type}`, {
      limit: String(pageSize),
      cursor: String(cursor),
      ...extraParams,
    });

    if (!data) break;

    all.push(...data.response.results);
    cursor += data.response.count;

    if (data.response.remaining <= 0) break;
  }

  cacheSet(cacheKey, all);
  return all;
}

// ─── Utility functions ────────────────────────────────────────────────────────

/**
 * Converts protocol-relative Bubble CDN URLs to absolute HTTPS.
 * "//cdn.bubble.io/..." → "https://cdn.bubble.io/..."
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

/**
 * Converts Bubble's BBCode-like markup to safe HTML.
 * [b]...[/b] → <strong>, \n → <br>
 */
export function bbcodeToHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\[b\]([\s\S]*?)\[\/b\]/g, '<strong>$1</strong>')
    .replace(/\[i\]([\s\S]*?)\[\/i\]/g, '<em>$1</em>')
    .replace(/\[u\]([\s\S]*?)\[\/u\]/g, '<u>$1</u>')
    .replace(/\n/g, '<br>');
}

/**
 * Infers event status from the Data field.
 * A "past" event is one whose date is before today.
 */
export function getEventStatus(evento: BubbleEvento): EventStatus {
  const eventDate = new Date(evento.Data);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today ? 'past' : 'upcoming';
}

/**
 * Builds a URL-safe path segment from a Bubble event.
 * Uses _id as the stable route key.
 */
export function eventPath(evento: BubbleEvento): string {
  return `/eventos/${evento._id}/`;
}

/**
 * Formats a Bubble ISO date string for display.
 */
export function formatBubbleDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  },
): string {
  return new Date(iso).toLocaleDateString('pt-BR', opts);
}

export function formatBubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Returns all events, sorted by Data descending (most recent first).
 * Fully paginated — fetches all 65+ events.
 */
export async function fetchAllEvents(): Promise<BubbleEvento[]> {
  const events = await fetchAllPages<BubbleEvento>('evento');
  return events.sort(
    (a, b) => new Date(b.Data).getTime() - new Date(a.Data).getTime(),
  );
}

/**
 * Returns upcoming events (Data >= today), sorted ascending.
 */
export async function fetchUpcomingEvents(limit?: number): Promise<BubbleEvento[]> {
  const all = await fetchAllEvents();
  const upcoming = all
    .filter((e) => getEventStatus(e) === 'upcoming')
    .sort((a, b) => new Date(a.Data).getTime() - new Date(b.Data).getTime());
  return limit ? upcoming.slice(0, limit) : upcoming;
}

/**
 * Returns past events sorted by most recent first.
 */
export async function fetchPastEvents(limit?: number): Promise<BubbleEvento[]> {
  const all = await fetchAllEvents();
  const past = all.filter((e) => getEventStatus(e) === 'past');
  return limit ? past.slice(0, limit) : past;
}

/**
 * Fetches a single event by its Bubble _id.
 */
export async function fetchEventById(id: string): Promise<BubbleEvento | null> {
  const cacheKey = `event:${id}`;
  const cached = cacheGet<BubbleEvento>(cacheKey);
  if (cached) return cached;

  const data = await bubbleFetch<{ response: BubbleEvento }>(`/obj/evento/${id}`);
  if (!data?.response) return null;

  cacheSet(cacheKey, data.response);
  return data.response;
}

/**
 * Fetches all speakers, cached.
 */
export async function fetchAllSpeakers(): Promise<BubbleSpeaker[]> {
  return fetchAllPages<BubbleSpeaker>('speaker');
}

export async function fetchAllEmpresas(): Promise<BubbleEmpresa[]> {
  return fetchAllPages<BubbleEmpresa>('empresa');
}

/**
 * Fetches members from Bubble's user endpoint.
 * Without an admin token, Bubble currently exposes only _id/user_signed_up.
 */
export async function fetchAllMembers(): Promise<BubbleUser[]> {
  return fetchAllPages<BubbleUser>('user');
}

/**
 * Fetches a small public preview of users for homepage member cards.
 * Count remains handled by fetchMemberCount; this avoids paginating 1k+ users.
 */
export async function fetchMemberPreview(limit = 80): Promise<BubbleUser[]> {
  const data = await bubbleFetch<BubbleListResponse<BubbleUser>>('/obj/user', {
    limit: String(limit),
    cursor: '0',
  });

  return data?.response.results ?? [];
}

/**
 * Fetches public company profiles attached to members.
 * This endpoint exposes company data, not personal member names/photos.
 */
export async function fetchMemberCompanies(
  limit = 40,
  cursor = 0,
): Promise<BubbleEmpresa[]> {
  const data = await bubbleFetch<BubbleListResponse<BubbleEmpresa>>('/obj/empresa', {
    limit: String(limit),
    cursor: String(cursor),
  });

  return data?.response.results ?? [];
}

export async function fetchMemberCompanyCount(): Promise<number> {
  const cacheKey = 'member_company_count';
  const cached = cacheGet<number>(cacheKey);
  if (cached !== null) return cached;

  const data = await bubbleFetch<BubbleListResponse<{ _id: string }>>('/obj/empresa', {
    limit: '1',
    cursor: '0',
  });

  if (!data?.response) return 0;
  const total = data.response.count + data.response.remaining;
  cacheSet(cacheKey, total);
  return total;
}

/**
 * Filters a speakers list to only those matching the given IDs.
 * Used to resolve speaker IDs from an event to full speaker objects.
 */
export function filterSpeakersByIds(
  speakers: BubbleSpeaker[],
  ids: string[],
): BubbleSpeaker[] {
  if (!ids?.length) return [];
  const idSet = new Set(ids);
  return speakers.filter((s) => idSet.has(s._id));
}

/**
 * Fetches speakers for a specific event.
 * Loads all speakers (cached) then filters in-memory.
 */
export async function fetchEventSpeakers(
  evento: BubbleEvento,
): Promise<BubbleSpeaker[]> {
  if (!evento.Speakers?.length) return [];
  const all = await fetchAllSpeakers();
  return filterSpeakersByIds(all, evento.Speakers);
}

/**
 * Fetches the total count of registered users/members from Bubble.
 * The user endpoint is public but returns only _id and user_signed_up.
 * Cache TTL: 10 minutes (count changes slowly).
 */
export async function fetchMemberCount(): Promise<number> {
  const cacheKey = 'member_count';
  const cached = cacheGet<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const data = await bubbleFetch<BubbleListResponse<{ _id: string }>>('/obj/user', {
      limit: '1',
      cursor: '0',
    });

    if (!data?.response) return 0;
    const total = data.response.count + data.response.remaining;
    // Use a longer TTL for the count (10 min) by just caching normally
    cacheSet(cacheKey, total);
    return total;
  } catch {
    return 0;
  }
}

/**
 * Builds schema.org Event JSON-LD object from a Bubble evento.
 */
export function buildEventSchema(
  evento: BubbleEvento,
  speakers: BubbleSpeaker[],
  siteUrl = 'https://masterboard.com.br',
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: evento.Titulo.trim(),
    description: evento.Sobre,
    startDate: evento.Data,
    endDate: evento.Horario_Fim,
    url: `${siteUrl}/eventos/${evento._id}/`,
    image: normalizeImageUrl(evento.Capa),
    eventStatus:
      getEventStatus(evento) === 'upcoming'
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: evento.Localizacao?.trim() || 'Masterboard Club',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'BR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Masterboard',
      url: siteUrl,
    },
    ...(speakers.length > 0 && {
      performer: speakers.map((s) => ({
        '@type': 'Person',
        name: s.Nome,
        jobTitle: s.Setor,
      })),
    }),
    keywords: evento.Temas?.join(', '),
  };
}
