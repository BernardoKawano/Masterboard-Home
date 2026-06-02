# Plano de Saída do Bubble.io

## Status atual

O Bubble.io é a **fonte temporária** de dados para eventos, speakers e membros.
O site institucional consome esses dados via `src/lib/bubble.ts` (cliente raw) e `src/lib/adapters/bubble/` (adapter de domínio).

**O Bubble NÃO é a plataforma de longo prazo.** A experiência atual é ruim e a saída está planejada, incluindo o app operacional em `app.masterboard.com.br`.

---

## Arquitetura atual de dados

```
Bubble.io API
    ↓
src/lib/bubble.ts          ← cliente HTTP, cache in-memory, helpers de formato
    ↓
src/lib/adapters/bubble/   ← mappers Bubble → tipos de domínio
    ├── events.ts           → mapBubbleEventToEvent(), buildSlugMap()
    ├── speakers.ts         → mapBubbleSpeakerToSpeaker(), buildSpeakerSlugMap()
    └── index.ts            → BubbleDataSource (implementa ContentDataSource)
    ↓
src/lib/data-source.ts     ← interface ContentDataSource + export do adapter ativo
    ↓
Páginas Astro               ← consomem apenas tipos de domain.ts
```

As páginas **nunca importam** `BubbleEvento`, `BubbleSpeaker` ou funções de `bubble.ts`.
Elas chamam `dataSource.listEvents()`, `dataSource.getSpeakersForEvent()` etc.

---

## Dados que vêm do Bubble hoje

| Entidade | Endpoint Bubble | Tipo de domínio |
|---|---|---|
| Eventos | `GET /api/1.1/obj/evento` | `Event` |
| Speakers | `GET /api/1.1/obj/speaker` | `Speaker` |
| Membros | `GET /api/1.1/obj/user` | `Member` (não implementado ainda) |
| Empresas | `GET /api/1.1/obj/empresa` | — (não implementado) |
| Conteúdos/Blog | Endpoint não identificado | — (usa JSON local por enquanto) |

---

## Mapeamento Bubble → domínio

### Evento

| Campo Bubble | Campo de domínio | Transformação |
|---|---|---|
| `_id` | `sourceId` | Nenhuma |
| `Titulo` | `id` (slug) + `title` | `slugify(Titulo)` para URL; `.trim()` para display |
| `Sobre` | `description` | Nenhuma |
| `Cronograma` | `schedule` | `bbcodeToHtml()` — converte `[b]...[/b]` para HTML |
| `Data` | `date` | ISO string mantida |
| `Horario_Inicio/Fim` | `startTime/endTime` | ISO string mantida |
| `Localizacao` | `venue` | `.trim()` |
| `Capa` | `coverImage` | `normalizeImageUrl()` — adiciona `https:` ao `//cdn.bubble.io` |
| `Temas` | `topics` | Array mantido |
| `Edicao txt` | `edition` | Nenhuma |
| `Speakers` | `speakerSourceIds` | Array de `_id` de speakers |
| `Link Drive` | `driveLink` | Nenhuma |
| *(derivado)* | `status` | `date < hoje` → `'past'`, senão → `'upcoming'` |

### Speaker

| Campo Bubble | Campo de domínio | Transformação |
|---|---|---|
| `_id` | `sourceId` | Nenhuma |
| `Nome` | `id` (slug) + `name` | `slugify(Nome)` para ID; `.trim()` para display |
| `Setor` | `roleLabel` + `role` + `company` | `parseRoleLabel()` — ex: "CEO da VIASOFT" → role="CEO", company="VIASOFT" |
| `Imagem` | `photo` | `normalizeImageUrl()` |
| `Logo marca` | `companyLogo` | `normalizeImageUrl()` |

---

## Como trocar o adapter (Bubble → Supabase/Postgres/Sanity)

1. **Crie** `src/lib/adapters/supabase/index.ts` implementando `ContentDataSource`:

```typescript
import type { ContentDataSource } from '../../data-source';

export const supabaseDataSource: ContentDataSource = {
  name: 'supabase',

  async listEvents(options) {
    // Query Supabase com os filtros de options
    const { data } = await supabase.from('events').select('*');
    return data.map(mapSupabaseEventToEvent);
  },

  async getEventById(id) {
    const { data } = await supabase.from('events').select('*').eq('slug', id).single();
    return data ? mapSupabaseEventToEvent(data) : null;
  },

  async getSpeakersForEvent(event) {
    // Join com a tabela de speakers
    const { data } = await supabase
      .from('event_speakers')
      .select('speakers(*)')
      .eq('event_id', event.sourceId);
    return data.flatMap(r => r.speakers).map(mapSupabaseSpeakerToSpeaker);
  },

  async listSpeakers() {
    const { data } = await supabase.from('speakers').select('*');
    return data.map(mapSupabaseSpeakerToSpeaker);
  },
};
```

2. **Troque** o export em `src/lib/data-source.ts`:

```typescript
// Antes:
export { bubbleDataSource as dataSource } from './adapters/bubble/index';

// Depois:
export { supabaseDataSource as dataSource } from './adapters/supabase/index';
```

3. **Nenhuma página muda.** As páginas continuam chamando `dataSource.*`.

---

## Exportação de dados do Bubble

Para migrar os dados existentes:

1. **Via API pública** (sem auth):
   - `GET /api/1.1/obj/evento?limit=100` — exportar todos os eventos com paginação
   - `GET /api/1.1/obj/speaker?limit=100` — exportar todos os speakers

2. **Script de migração** (a criar em `/scripts/`):
   ```bash
   node scripts/export-bubble-data.mjs > data/bubble-export.json
   ```
   Este script deve:
   - Paginar por todos os registros
   - Aplicar os mappers de domínio
   - Gerar slugs únicos
   - Exportar em formato neutro (JSON)

3. **Import no novo banco**:
   - O JSON exportado já está no formato de domínio
   - Criar script de seed no novo banco a partir deste JSON

---

## Endpoints ainda não mapeados

| Endpoint | Propósito | Requer auth? | Status |
|---|---|---|---|
| `GET /obj/user` | Membros | Sim (admin) | Não implementado |
| `GET /obj/empresa` | Empresas dos membros | Sim (admin) | Não implementado |
| `GET /obj/conteudo` | Blog/conteúdo | Desconhecido | Retorna 404 — nome real desconhecido |
| `POST /wf/confirm_presence` | Confirmar presença | Sim (membro) | Não relevante para site institucional |

---

## Riscos conhecidos

| Risco | Impacto | Mitigação |
|---|---|---|
| Bubble derruba o app sem aviso | Site exibe dados em branco | Cache in-memory de 5min + fallback graceful nos componentes |
| Slug duplicado (dois eventos com título idêntico) | Conflito de URL | `buildSlugMap()` detecta e adiciona sufixo `--abc123` do `sourceId` |
| Campo Bubble renomeado | Dados faltando | Tudo encapsulado em `bubble.ts` — alteração em 1 lugar |
| Token de API expirado | Endpoints admin param de funcionar | Apenas leitura pública é usada hoje; sem token no código |
| Bubble desativado antes da migração | Site perde dados | Exportar dados regularmente via script |

---

## Próximos passos recomendados

- [ ] Identificar endpoint correto para conteúdos/blog no Bubble
- [ ] Criar script de exportação de dados (`scripts/export-bubble-data.mjs`)
- [ ] Definir banco de destino (Supabase recomendado — grátis, Postgres nativo)
- [ ] Criar schema SQL baseado em `docs/data-model.md`
- [ ] Implementar `supabaseDataSource` seguindo o modelo acima
- [ ] Importar dados exportados do Bubble no Supabase
- [ ] Trocar export em `data-source.ts`
- [ ] Validar que todas as páginas continuam funcionando
- [ ] Desativar integração Bubble
