/**
 * ContentDataSource — contrato de dados do site.
 *
 * Todas as páginas consomem dados EXCLUSIVAMENTE por esta interface.
 * Para trocar Bubble por Supabase/Postgres/Sanity:
 *   1. Crie um novo adapter em src/lib/adapters/<nome>/
 *   2. Implemente ContentDataSource
 *   3. Troque o export `dataSource` abaixo
 *   4. Nenhuma página precisa ser alterada
 */

import type {
  Event,
  Speaker,
  Member,
  MemberCompany,
  ContentPost,
  EventStatus,
} from '../types/domain';

// ─── Query options ────────────────────────────────────────────────────────────

export interface ListEventsOptions {
  /** Filtra por status. Default: 'all' */
  status?: EventStatus | 'all';

  /** Ordena por data crescente (upcoming-first) se true, decrescente se false */
  sortAscending?: boolean;

  /** Máximo de resultados */
  limit?: number;

  /** Offset para paginação */
  offset?: number;
}

export interface ListMemberCompaniesOptions {
  limit?: number;
  offset?: number;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface ContentDataSource {
  /**
   * Identificador do adapter ativo.
   * Ex: 'bubble', 'supabase', 'mock'
   */
  readonly name: string;

  // ─── Events ────────────────────────────────────────────────────
  listEvents(options?: ListEventsOptions): Promise<Event[]>;

  /**
   * Busca um evento pelo `id` de domínio (slug limpo).
   * Retorna null se não encontrado.
   */
  getEventById(id: string): Promise<Event | null>;

  /**
   * Retorna os speakers de um evento específico.
   * Encapsula a resolução de IDs internos — as páginas não precisam saber
   * como os speakerIds mapeiam para speakers.
   */
  getSpeakersForEvent(event: Event): Promise<Speaker[]>;

  // ─── Speakers ──────────────────────────────────────────────────
  listSpeakers(): Promise<Speaker[]>;

  // ─── Optional (implementados conforme a fonte suportar) ────────
  listMembers?(): Promise<Member[]>;
  listMemberCompanies?(options?: ListMemberCompaniesOptions): Promise<MemberCompany[]>;

  /**
   * Contagem total de membros registrados.
   * Fonte pública: Bubble user endpoint (count + remaining).
   */
  getMemberCount?(): Promise<number>;
  getMemberCompanyCount?(): Promise<number>;

  listPosts?(): Promise<ContentPost[]>;
  getPostById?(id: string): Promise<ContentPost | null>;
}

// ─── Active data source ───────────────────────────────────────────────────────
// Troque este import para migrar para outro adapter.
// O resto do código não muda.
export { supabaseDataSource as dataSource } from './adapters/supabase/index';
