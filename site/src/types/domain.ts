/**
 * Domain types — canônicos e independentes de qualquer fonte de dados.
 *
 * Nenhum campo aqui deve conter:
 * - Nomes de campos do Bubble ("Titulo", "_id", "Capa", etc.)
 * - IDs internos de API crus expostos para o usuário
 * - Detalhes de implementação de banco ou CMS
 *
 * Quando o Bubble for substituído por Supabase/Postgres/outro CMS,
 * estes tipos NÃO mudam — apenas o adapter muda.
 */

// ─── Enums / Union types ──────────────────────────────────────────────────────

export type EventStatus = 'upcoming' | 'past' | 'cancelled';

export type EventAccessType = 'public' | 'members-only' | 'invite-only';

export type DataSource = 'bubble' | 'supabase' | 'sanity' | 'mock' | string;

// ─── Event ────────────────────────────────────────────────────────────────────

export interface Event {
  /**
   * Slug limpo e SEO-friendly — usado como segmento de URL: /eventos/[id]/
   * Gerado pelo adapter a partir do título.
   * Exemplo: "imersao-e-conselho-com-mentores-g4"
   */
  id: string;

  /** ID bruto na fonte de dados (Bubble _id, UUID do Supabase, etc.) */
  sourceId: string;

  /** Nome do adapter que originou este dado */
  source: DataSource;

  title: string;
  description: string;

  /** Cronograma/programação em HTML (já convertido de qualquer formato fonte) */
  schedule?: string;

  /** Data principal do evento (ISO string, ex: "2025-09-18T03:00:00.000Z") */
  date: string;

  /** Horário de início (ISO datetime) */
  startTime?: string;

  /** Horário de encerramento (ISO datetime) */
  endTime?: string;

  /** Nome do local/venue */
  venue: string;

  /** Cidade — pode ser undefined se a fonte não fornecer */
  city?: string;

  /** URL absoluta HTTPS da imagem de capa */
  coverImage?: string;

  /** Tags/temas do evento */
  topics: string[];

  /** Texto de edição, ex: "Master #107" */
  edition?: string;

  /** Número da edição */
  editionNumber?: number;

  status: EventStatus;
  accessType?: EventAccessType;

  /**
   * IDs dos speakers deste evento.
   * São os `sourceId` dos speakers (IDs da fonte de dados), não os slugs.
   * A resolução para objetos Speaker é feita pelo ContentDataSource.
   */
  speakerSourceIds: string[];

  /** Link para pasta de materiais pós-evento (Drive, Notion, etc.) */
  driveLink?: string;

  // ─── SEO ──────────────────────────────────────────────────────
  seoTitle?: string;
  seoDescription?: string;
}

// ─── Speaker ─────────────────────────────────────────────────────────────────

export interface Speaker {
  /**
   * Slug do speaker — gerado a partir do nome.
   * Exemplo: "bernardo-kawano"
   */
  id: string;

  /** ID bruto na fonte de dados */
  sourceId: string;
  source: DataSource;

  name: string;

  /** Label completo de cargo, ex: "CEO da VIASOFT" */
  roleLabel: string;

  /** Cargo isolado, ex: "CEO" — derivado do roleLabel quando possível */
  role?: string;

  /** Empresa isolada, ex: "VIASOFT" — derivada do roleLabel quando possível */
  company?: string;

  bio?: string;

  /** URL absoluta HTTPS da foto do speaker */
  photo?: string;

  /** object-position CSS para ajuste fino do enquadramento, ex: "center 20%" */
  photoPosition?: string;

  /** URL absoluta HTTPS do logo da empresa */
  companyLogo?: string;

  topics?: string[];
  linkedin?: string;
}

// ─── Member ───────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  sourceId: string;
  source: DataSource;

  name: string;
  email?: string;
  phone?: string;
  company?: string;
  roleLabel?: string;
  role?: string;
  city?: string;
  photo?: string;
  companyLogo?: string;

  /** Nível de acesso / tier */
  tier?: string;

  /** Data de entrada no club */
  joinedAt?: string;
}

// ─── ContentPost (Blog) ───────────────────────────────────────────────────────

export interface ContentPost {
  /** Slug para URL: /blog/[id]/ */
  id: string;

  sourceId: string;
  source: DataSource;

  title: string;
  excerpt: string;

  /** Conteúdo em HTML */
  content: string;

  /** Data de publicação (ISO string) */
  date: string;

  author: string;
  category: string;

  coverImage?: string;
  tags: string[];

  seoTitle?: string;
  seoDescription?: string;
}

// ─── Lead / Application ───────────────────────────────────────────────────────

export interface Lead {
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  city?: string;
  lgpdConsent: boolean;
  source?: string;
  referrer?: string;
  submittedAt: string;
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

/** Retorna o caminho canônico de um evento */
export function getEventUrl(event: Pick<Event, 'id'>): string {
  return `/eventos/${event.id}/`;
}

/** Retorna o caminho canônico de um post de blog */
export function getPostUrl(post: Pick<ContentPost, 'id'>): string {
  return `/blog/${post.id}/`;
}
