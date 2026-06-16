# Modelo de Dados — Masterboard

Esquema conceitual para o banco de dados futuro (Supabase/Postgres).
Baseado nos tipos de domínio em `src/types/domain.ts`.

---

## Entidades

### Event

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK |
| `slug` | `text` | NO | Único, SEO-friendly, ex: "masterboard-summit-sp-2025" |
| `title` | `text` | NO | — |
| `description` | `text` | YES | Texto corrido, para o About da página |
| `schedule_html` | `text` | YES | Cronograma em HTML |
| `date` | `date` | NO | Data principal do evento |
| `start_time` | `timestamptz` | YES | Horário de início |
| `end_time` | `timestamptz` | YES | Horário de encerramento |
| `venue` | `text` | NO | Nome do local |
| `city` | `text` | YES | Cidade |
| `country` | `text` | NO | Default: 'BR' |
| `cover_image_url` | `text` | YES | URL absoluta HTTPS |
| `topics` | `text[]` | NO | Default: `{}` |
| `edition_label` | `text` | YES | Ex: "Master #107" |
| `edition_number` | `integer` | YES | — |
| `status` | `event_status` | NO | Enum: upcoming, past, cancelled |
| `access_type` | `event_access_type` | NO | Default: 'public'. Enum: public, members-only, invite-only |
| `drive_link` | `text` | YES | Google Drive de materiais pós-evento |
| `registration_url` | `text` | YES | Link de inscrição (não existe no Bubble ainda) |
| `seo_title` | `text` | YES | Override do title para SEO |
| `seo_description` | `text` | YES | Override da meta description |
| `is_published` | `boolean` | NO | Default: true |
| `source` | `text` | YES | 'bubble', 'manual', etc. — rastreabilidade de origem |
| `source_id` | `text` | YES | ID original na fonte |
| `created_at` | `timestamptz` | NO | Default: now() |
| `updated_at` | `timestamptz` | NO | Default: now() |

**Enums:**
```sql
CREATE TYPE event_status AS ENUM ('upcoming', 'past', 'cancelled');
CREATE TYPE event_access_type AS ENUM ('public', 'members-only', 'invite-only');
```

**Índices recomendados:**
```sql
CREATE UNIQUE INDEX ON events(slug);
CREATE INDEX ON events(date DESC);
CREATE INDEX ON events(status);
CREATE INDEX ON events(is_published);
```

---

### Speaker

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK |
| `slug` | `text` | NO | Único, ex: "bernardo-kawano" |
| `name` | `text` | NO | — |
| `role_label` | `text` | YES | "CEO da VIASOFT" (campo completo) |
| `role` | `text` | YES | "CEO" (extraído) |
| `company` | `text` | YES | "VIASOFT" (extraído) |
| `bio` | `text` | YES | Biografia |
| `photo_url` | `text` | YES | URL da foto |
| `company_logo_url` | `text` | YES | URL do logo da empresa |
| `linkedin_url` | `text` | YES | — |
| `topics` | `text[]` | NO | Default: `{}` |
| `is_published` | `boolean` | NO | Default: true |
| `source` | `text` | YES | — |
| `source_id` | `text` | YES | — |
| `created_at` | `timestamptz` | NO | Default: now() |
| `updated_at` | `timestamptz` | NO | Default: now() |

---

### EventSpeaker (tabela de junção)

| Campo | Tipo | Notas |
|---|---|---|
| `event_id` | `uuid` | FK → events.id |
| `speaker_id` | `uuid` | FK → speakers.id |
| `order` | `integer` | Ordem de exibição |

```sql
PRIMARY KEY (event_id, speaker_id)
```

---

### Member

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK |
| `name` | `text` | NO | — |
| `email` | `text` | NO | Único |
| `phone` | `text` | YES | WhatsApp preferencial |
| `company_id` | `uuid` | YES | FK → companies.id |
| `company_name` | `text` | YES | Nome textual da empresa quando a relação não puder ser resolvida |
| `role` | `text` | YES | Cargo |
| `photo_url` | `text` | YES | URL da foto pública usada no card do site |
| `city` | `text` | YES | — |
| `tier` | `member_tier` | NO | Default: 'member'. Enum: member, vip, founding |
| `status` | `member_status` | NO | Default: 'active'. Enum: active, inactive, prospect |
| `joined_at` | `date` | YES | Data de entrada no club |
| `source` | `text` | YES | Como chegou: 'referral', 'organic', etc. |
| `source_id` | `text` | YES | — |
| `created_at` | `timestamptz` | NO | Default: now() |
| `updated_at` | `timestamptz` | NO | Default: now() |

**Nota:** Dados de membros devem ficar em schema privado (Row Level Security no Supabase).

---

### Company (Empresa)

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK |
| `name` | `text` | NO | — |
| `sector` | `text` | YES | Setor/segmento |
| `website` | `text` | YES | — |
| `logo_url` | `text` | YES | — |
| `city` | `text` | YES | — |
| `annual_revenue` | `text` | YES | Range: "<1M", "1-10M", "10-50M", etc. |
| `employee_count` | `text` | YES | Range: "1-10", "11-50", etc. |
| `source_id` | `text` | YES | — |
| `created_at` | `timestamptz` | NO | Default: now() |

---

### ContentPost (Blog)

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK |
| `slug` | `text` | NO | Único, ex: "networking-de-alto-nivel" |
| `title` | `text` | NO | — |
| `excerpt` | `text` | YES | Resumo para listagem |
| `content_html` | `text` | YES | Conteúdo em HTML |
| `date` | `date` | NO | Data de publicação |
| `author` | `text` | NO | Nome do autor |
| `category` | `text` | YES | Categoria do post |
| `cover_image_url` | `text` | YES | — |
| `tags` | `text[]` | NO | Default: `{}` |
| `is_published` | `boolean` | NO | Default: false |
| `seo_title` | `text` | YES | — |
| `seo_description` | `text` | YES | — |
| `source` | `text` | YES | — |
| `source_id` | `text` | YES | — |
| `created_at` | `timestamptz` | NO | Default: now() |
| `updated_at` | `timestamptz` | NO | Default: now() |

---

### Lead (Candidatura)

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK. Default: gen_random_uuid() |
| `name` | `text` | NO | — |
| `email` | `text` | NO | — |
| `phone` | `text` | NO | — |
| `company` | `text` | NO | — |
| `role` | `text` | NO | Cargo |
| `city` | `text` | YES | — |
| `lgpd_consent` | `boolean` | NO | Deve ser true |
| `source` | `text` | YES | Canal padronizado `marca:canal:detalhe` (ex.: `masterboard:site:candidatura`, `scale:site:candidatura`) |
| `referrer` | `text` | YES | URL de referência |
| `status` | `lead_status` | NO | Default: 'new'. Enum: new, contacted, approved, rejected |
| `intent` | `text` | YES | Intenção declarada, ex: 'membro' |
| `company_moment` | `text` | YES | Momento da empresa |
| `annual_revenue` | `text` | YES | Faixa de faturamento anual |
| `employee_count` | `text` | YES | Faixa de colaboradores |
| `country_code` | `text` | YES | Código do país do WhatsApp |
| `whatsapp` | `text` | YES | Número local informado |
| `objective` | `text` | YES | Objetivo principal |
| `score` | `integer` | NO | Pontuação inicial de qualificação |
| `priority` | `text` | NO | Prioridade operacional: low, normal, high |
| `assigned_to` | `text` | YES | Responsável interno |
| `last_contacted_at` | `timestamptz` | YES | Último contato |
| `next_follow_up_at` | `timestamptz` | YES | Próximo follow-up |
| `notes` | `text` | YES | Notas internas |
| `submitted_at` | `timestamptz` | NO | Default: now() |

---

### LeadActivity (Histórico de Lead)

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK. Default: gen_random_uuid() |
| `lead_id` | `uuid` | NO | FK → leads.id |
| `type` | `text` | NO | Tipo de atividade: created, status_change, note, contact |
| `description` | `text` | YES | Descrição legível |
| `metadata` | `jsonb` | NO | Dados auxiliares |
| `created_by` | `text` | YES | Responsável/usuário |
| `created_at` | `timestamptz` | NO | Default: now() |

---

### AdminUser

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK |
| `auth_user_id` | `uuid` | NO | ID do usuário no Supabase Auth |
| `email` | `text` | NO | Único |
| `name` | `text` | YES | Nome exibido no painel |
| `role` | `text` | NO | `admin` ou `editor` |
| `is_active` | `boolean` | NO | Permite suspender acesso sem apagar histórico |
| `created_at` | `timestamptz` | NO | Default: now() |
| `updated_at` | `timestamptz` | NO | Default: now() |

---

### SiteSetting

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `key` | `text` | NO | PK, ex: `home.hero.eyebrow` |
| `label` | `text` | NO | Rótulo exibido no admin |
| `description` | `text` | YES | Ajuda editorial |
| `type` | `text` | NO | `text`, `textarea`, `color`, `url` |
| `value` | `text` | NO | Valor normalizado pelo admin |
| `is_public` | `boolean` | NO | Se pode ser lido pelo site público |
| `updated_by` | `text` | YES | E-mail do editor |
| `updated_at` | `timestamptz` | NO | Última alteração |

---

### AdminAuditLog

| Campo | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | `uuid` | NO | PK |
| `actor_user_id` | `uuid` | YES | ID do usuário no Supabase Auth |
| `actor_email` | `text` | NO | E-mail do editor |
| `action` | `text` | NO | Ex: `post.updated`, `settings.updated` |
| `resource` | `text` | NO | Nome da tabela/recurso |
| `resource_id` | `text` | YES | ID do registro alterado |
| `before_value` | `jsonb` | YES | Snapshot antes da mudança |
| `after_value` | `jsonb` | YES | Snapshot depois da mudança |
| `created_at` | `timestamptz` | NO | Default: now() |

---

## Relações

```
Member → Company (N:1)
Event → Speaker via EventSpeaker (N:M)
Event → ContentPost (1:N — conteúdos gerados pelo evento)
Lead → Member (1:0..1 — quando aprovado)
Lead → LeadActivity (1:N — histórico operacional)
Supabase Auth User → AdminUser (1:0..1 — permissão de painel)
AdminUser → AdminAuditLog (1:N — ações administrativas)
```

---

## Row Level Security (Supabase)

```sql
-- Eventos públicos: qualquer um pode ler
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_events" ON events
  FOR SELECT USING (is_published = true);

-- Blog público: qualquer um pode ler posts publicados
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_content_posts" ON content_posts
  FOR SELECT USING (is_published = true);

-- Membros: só acesso autenticado com role correto
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_members" ON members
  FOR SELECT USING (auth.role() = 'service_role');

-- Leads: só admin lê, qualquer um insere
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert_leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_leads" ON leads FOR SELECT USING (auth.role() = 'service_role');

-- Admin: leitura/escrita via service role após validação de sessão no servidor
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
```

---

## Notas de migração do Bubble

- `Evento._id` → `events.source_id`
- `Evento.Titulo` → `events.title` (após trim)
- `Evento.Slug` do Bubble não deve ser usado diretamente — gerar novo slug limpo
- `Evento.Cronograma` (BBCode) → converter para HTML antes de inserir em `schedule_html`
- `Evento.Capa` (protocol-relative) → normalizar para HTTPS e salvar em `cover_image_url`
- `Speaker.Setor` → `speakers.role_label`; fazer parse para `role` e `company`
- Não existe campo `city` no Bubble — preencher manualmente ou deixar null
