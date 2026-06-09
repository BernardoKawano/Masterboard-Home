/**
 * SupabaseDataSource — implementação de ContentDataSource usando Supabase/Postgres.
 *
 * Mantém a mesma superfície do BubbleDataSource para permitir trocar o adapter
 * ativo em src/lib/data-source.ts sem alterar as páginas.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchMemberPreview } from '../../bubble';
import { mapBubbleUserToMember } from '../bubble/members';
import type { ContentDataSource, ListEventsOptions, ListMemberCompaniesOptions } from '../../data-source';
import type { Event, Member, MemberCompany, Speaker } from '../../../types/domain';

type SupabaseClient = ReturnType<typeof createClient>;

interface SupabaseError {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}

interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  schedule_html: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string;
  city: string | null;
  cover_image_url: string | null;
  topics: string[] | null;
  edition_label: string | null;
  edition_number: number | null;
  status: Event['status'];
  access_type: Event['accessType'] | null;
  drive_link: string | null;
  registration_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  source_id: string | null;
}

interface SpeakerRow {
  id: string;
  slug: string;
  name: string;
  role_label: string | null;
  role: string | null;
  company: string | null;
  bio: string | null;
  photo_url: string | null;
  company_logo_url: string | null;
  linkedin_url: string | null;
  topics: string[] | null;
  source_id: string | null;
}

interface MemberRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  company_name?: string | null;
  role: string | null;
  city: string | null;
  photo_url?: string | null;
  tier: string | null;
  joined_at: string | null;
  source_id: string | null;
  companies?: {
    name?: string | null;
    logo_url?: string | null;
  } | null;
}

interface CompanyRow {
  id: string;
  name: string;
  city: string | null;
  annual_revenue: string | null;
  employee_count: string | null;
  sector: string | null;
  source_id: string | null;
}

interface CompanyLookupRow {
  name: string;
  source_id: string | null;
}

interface EventSpeakerRow {
  event_id: string;
  speakers:
    | {
        id: string;
        source_id: string | null;
      }
    | {
        id: string;
        source_id: string | null;
      }[]
    | null;
}

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url: string | undefined = import.meta.env.SUPABASE_URL;
  const serviceRoleKey: string | undefined = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos no .env.');
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

function throwIfError(error: SupabaseError | null, context: string): void {
  if (!error) return;

  throw new Error(`[Supabase] ${context}: ${error.message}`);
}

function sourceId(row: { id: string; source_id: string | null }): string {
  return row.source_id ?? row.id;
}

function toIsoDate(date: string): string {
  return date.includes('T') ? date : `${date}T00:00:00.000Z`;
}

function mapEventRow(row: EventRow, speakerSourceIds: string[] = []): Event {
  return {
    id: row.slug,
    sourceId: sourceId(row),
    source: 'supabase',
    title: row.title,
    description: row.description ?? '',
    schedule: row.schedule_html ?? undefined,
    date: toIsoDate(row.date),
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    venue: row.venue,
    city: row.city ?? undefined,
    coverImage: row.cover_image_url ?? undefined,
    topics: row.topics ?? [],
    edition: row.edition_label ?? undefined,
    editionNumber: row.edition_number ?? undefined,
    status: row.status,
    accessType: row.access_type ?? undefined,
    speakerSourceIds,
    driveLink: row.drive_link ?? undefined,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
  };
}

function mapSpeakerRow(row: SpeakerRow): Speaker {
  return {
    id: row.slug,
    sourceId: sourceId(row),
    source: 'supabase',
    name: row.name,
    roleLabel: row.role_label ?? [row.role, row.company].filter(Boolean).join(' / '),
    role: row.role ?? undefined,
    company: row.company ?? undefined,
    bio: row.bio ?? undefined,
    photo: row.photo_url ?? undefined,
    companyLogo: row.company_logo_url ?? undefined,
    topics: row.topics ?? undefined,
    linkedin: row.linkedin_url ?? undefined,
  };
}

function mapMemberRow(row: MemberRow): Member {
  const companyName = row.company_name?.trim();
  const hasTechnicalCompanyName = companyName
    ? /^\d{10,}x\d{3,}$/i.test(companyName) || /^[a-f0-9]{24}$/i.test(companyName)
    : false;
  const company = row.companies?.name ?? (hasTechnicalCompanyName ? undefined : companyName);

  return {
    id: sourceId(row),
    sourceId: sourceId(row),
    source: 'supabase',
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company,
    roleLabel: [row.role, company].filter(Boolean).join(' / ') || undefined,
    role: row.role ?? undefined,
    city: row.city ?? undefined,
    photo: row.photo_url ?? undefined,
    companyLogo: row.companies?.logo_url ?? undefined,
    tier: row.tier ?? undefined,
    joinedAt: row.joined_at ?? undefined,
  };
}

function hasCompleteMemberProfile(member: Member): boolean {
  return Boolean(member.name && member.photo && member.company && (member.role || member.roleLabel));
}

function mapCompanyRow(row: CompanyRow): MemberCompany {
  return {
    id: sourceId(row),
    sourceId: sourceId(row),
    source: 'supabase',
    name: row.name,
    city: row.city ?? undefined,
    size: row.employee_count ?? undefined,
    revenue: row.annual_revenue ?? undefined,
    sector: row.sector ?? undefined,
  };
}

function getJoinedSpeaker(row: EventSpeakerRow): EventSpeakerRow['speakers'] extends Array<infer T> ? T | null : never {
  const joined = row.speakers;
  return (Array.isArray(joined) ? joined[0] : joined) as never;
}

async function getSpeakerSourceIdsByEventId(eventIds: string[]): Promise<Map<string, string[]>> {
  const speakerMap = new Map<string, string[]>();
  if (eventIds.length === 0) return speakerMap;

  const { data, error } = await getSupabaseClient()
    .from('event_speakers')
    .select('event_id, speakers(id, source_id)')
    .in('event_id', eventIds)
    .order('order', { ascending: true });

  throwIfError(error, 'buscar relações evento-speaker');

  for (const row of (data ?? []) as EventSpeakerRow[]) {
    const speaker = getJoinedSpeaker(row);
    if (!speaker) continue;

    const list = speakerMap.get(row.event_id) ?? [];
    list.push(sourceId(speaker));
    speakerMap.set(row.event_id, list);
  }

  return speakerMap;
}

async function countRows(table: 'members' | 'companies'): Promise<number> {
  const { count, error } = await getSupabaseClient()
    .from(table)
    .select('id', { count: 'exact', head: true });

  throwIfError(error, `contar ${table}`);
  return count ?? 0;
}

async function getCompanyNameBySourceId(): Promise<Map<string, string>> {
  const { data, error } = await getSupabaseClient()
    .from('companies')
    .select('name, source_id')
    .not('source_id', 'is', null)
    .limit(3000);

  throwIfError(error, 'listar empresas para fallback de membros');

  return new Map(
    ((data ?? []) as CompanyLookupRow[])
      .filter((row) => row.source_id && row.name)
      .map((row) => [row.source_id as string, row.name]),
  );
}

async function getBubbleMemberPreviewFallback(): Promise<Member[]> {
  try {
    const [raws, companyNameBySourceId] = await Promise.all([
      fetchMemberPreview(120),
      getCompanyNameBySourceId(),
    ]);

    return raws
      .map((raw) => mapBubbleUserToMember(raw, companyNameBySourceId))
      .filter((member): member is Member => Boolean(member))
      .filter(hasCompleteMemberProfile);
  } catch (error) {
    console.warn('[Supabase] fallback Bubble de membros falhou:', error);
    return [];
  }
}

export const supabaseDataSource: ContentDataSource = {
  name: 'supabase',

  async listEvents(options: ListEventsOptions = {}): Promise<Event[]> {
    const { status = 'all', sortAscending, limit, offset = 0 } = options;

    let query = getSupabaseClient()
      .from('events')
      .select('*')
      .eq('is_published', true);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (sortAscending !== undefined) {
      query = query.order('date', { ascending: sortAscending });
    }

    if (limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    throwIfError(error, 'listar eventos');

    const rows = ((data ?? []) as EventRow[]).slice(limit === undefined ? offset : 0);
    const speakerMap = await getSpeakerSourceIdsByEventId(rows.map((row) => row.id));

    return rows.map((row) => mapEventRow(row, speakerMap.get(row.id) ?? []));
  },

  async getEventById(id: string): Promise<Event | null> {
    const { data, error } = await getSupabaseClient()
      .from('events')
      .select('*')
      .eq('slug', id)
      .eq('is_published', true)
      .maybeSingle();

    throwIfError(error, 'buscar evento por slug');
    if (!data) return null;

    const row = data as EventRow;
    const speakerMap = await getSpeakerSourceIdsByEventId([row.id]);

    return mapEventRow(row, speakerMap.get(row.id) ?? []);
  },

  async getSpeakersForEvent(event: Event): Promise<Speaker[]> {
    if (!event.speakerSourceIds.length) return [];

    const speakers = await this.listSpeakers();
    const idSet = new Set(event.speakerSourceIds);

    return speakers.filter((speaker) => idSet.has(speaker.sourceId));
  },

  async listSpeakers(): Promise<Speaker[]> {
    const { data, error } = await getSupabaseClient()
      .from('speakers')
      .select('*')
      .eq('is_published', true)
      .order('name', { ascending: true });

    throwIfError(error, 'listar speakers');

    return ((data ?? []) as SpeakerRow[]).map(mapSpeakerRow);
  },

  async listMembers(): Promise<Member[]> {
    const { data, error } = await getSupabaseClient()
      .from('members')
      .select('*, companies(name, logo_url)')
      .order('name', { ascending: true });

    throwIfError(error, 'listar membros');

    const members = ((data ?? []) as MemberRow[]).map(mapMemberRow);
    const completeMembers = members.filter(hasCompleteMemberProfile);

    if (completeMembers.length > 0) {
      return members;
    }

    const fallbackMembers = await getBubbleMemberPreviewFallback();
    return fallbackMembers.length > 0 ? fallbackMembers : members;
  },

  async listMemberCompanies(options: ListMemberCompaniesOptions = {}): Promise<MemberCompany[]> {
    const limit = options.limit ?? 18;
    const offset = options.offset ?? 0;

    const { data, error } = await getSupabaseClient()
      .from('companies')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    throwIfError(error, 'listar empresas de membros');

    return ((data ?? []) as CompanyRow[]).map(mapCompanyRow);
  },

  async getMemberCount(): Promise<number> {
    return countRows('members');
  },

  async getMemberCompanyCount(): Promise<number> {
    return countRows('companies');
  },
};

export function formatEventDate(
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

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}
