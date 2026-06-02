# Guia de Deploy

## Requisitos

O site usa **Astro com `output: 'hybrid'` + `@astrojs/node`**.
Isso significa que páginas dinâmicas (SSR) precisam de um processo Node.js persistente.

**Páginas SSR (precisam de Node):**
- `/` — home (busca Bubble ao vivo)
- `/eventos/` — lista de eventos
- `/eventos/[id]/` — detalhe de evento
- `/api/candidatura` — endpoint POST de formulário

**Páginas estáticas (servidas como HTML puro):**
- `/blog/` e `/blog/[slug]/` — JSON local
- `/404`

---

## Opções de hospedagem

### ✅ Vercel (recomendado)

A opção mais simples para deploy de projetos Astro com SSR.

**Setup:**
1. Instale o adapter Vercel:
   ```bash
   npm install @astrojs/vercel
   ```
2. Troque o adapter em `astro.config.mjs`:
   ```javascript
   import vercel from '@astrojs/vercel/serverless';

   export default defineConfig({
     output: 'hybrid',
     adapter: vercel(),
     // ...
   });
   ```
3. Conecte o repositório no dashboard da Vercel
4. Configure as variáveis de ambiente no painel da Vercel
5. Deploy automático a cada push em `main`

**Variáveis de ambiente (Vercel dashboard → Settings → Environment Variables):**
```
BUBBLE_BASE_URL=https://app.masterboard.com.br/api/1.1
BUBBLE_API_TOKEN=          # opcional para leitura pública
LEAD_WEBHOOK_URL=          # webhook do CRM
SITE_URL=https://masterboard.com.br
```

**Domínio:** Adicionar `masterboard.com.br` em Vercel → Settings → Domains.

---

### ✅ Render

Boa alternativa ao Vercel, especialmente se você preferir mais controle.

**Setup:**
1. Mantenha o adapter `@astrojs/node` (já configurado)
2. Crie um novo Web Service no Render
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/server/entry.mjs`
   - **Environment:** Node 20+
4. Adicione as variáveis de ambiente no painel do Render

**Nota:** O Render tem um free tier com cold starts (pode demorar ~30s na primeira request após inatividade).

---

### ✅ Fly.io

Ótimo para controle total e sem cold starts.

```bash
fly launch --name masterboard-site --region gru  # região São Paulo
fly secrets set BUBBLE_BASE_URL=https://app.masterboard.com.br/api/1.1
fly secrets set LEAD_WEBHOOK_URL=https://...
fly deploy
```

---

### ⚠️ DreamHost Shared Hosting (NÃO recomendado para SSR)

DreamHost Shared Hosting **não suporta processos Node.js persistentes**.
Não é possível hospedar a versão SSR nesse ambiente diretamente.

**Alternativas se o DreamHost for obrigatório:**

#### Opção A: Build estático com dados em build-time

Transformar o site em completamente estático, buscando dados do Bubble no momento do build:

```javascript
// astro.config.mjs — modo estático
export default defineConfig({
  output: 'static',  // sem adapter Node
  // ...
});
```

Nas páginas, trocar `export const prerender = false` por `getStaticPaths()`:

```typescript
// eventos/[id].astro
export async function getStaticPaths() {
  const events = await dataSource.listEvents();
  return events.map(event => ({
    params: { id: event.id },
    props: { event },
  }));
}
```

**Limitações:**
- Dados ficam desatualizados até o próximo build
- Precisa de rebuild manual ou CI para novos eventos
- Formulário de candidatura precisaria de serviço externo (Formspree, n8n, etc.)

#### Opção B: Deploy em duas camadas

- Páginas estáticas no DreamHost
- API routes (formulário) em Vercel Functions ou similar
- Dados buscados pelo browser via fetch direto ao Bubble (sem token)

#### Opção C: Migrar o domínio para Vercel (mais simples)

Manter o DreamHost apenas para o e-mail e migrar o site para Vercel.
A maioria dos DNS suporta apontar apenas o `www` e `@` para outro servidor.

---

## Configuração de DNS (masterboard.com.br)

Para apontar `masterboard.com.br` e `www.masterboard.com.br` para o novo site:

**Vercel:**
```
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com
```

**Render:**
```
CNAME @     <seu-app>.onrender.com
CNAME www   <seu-app>.onrender.com
```

**HTTPS:** Todos os provedores acima provisionam certificado SSL automaticamente via Let's Encrypt.

---

## Variáveis de ambiente obrigatórias

| Variável | Obrigatória | Valor padrão | Descrição |
|---|---|---|---|
| `BUBBLE_BASE_URL` | Não | `https://app.masterboard.com.br/api/1.1` | URL da API do Bubble |
| `BUBBLE_API_TOKEN` | Não | — | Token para endpoints admin |
| `LEAD_WEBHOOK_URL` | Não | — | Webhook para candidaturas |
| `SITE_URL` | Não | `https://masterboard.com.br` | URL pública do site |

---

## Checklist de deploy

- [ ] `npm run build` passou localmente
- [ ] Variáveis de ambiente configuradas no painel do host
- [ ] DNS apontado para o novo host
- [ ] SSL/HTTPS ativo
- [ ] `https://masterboard.com.br/` carrega corretamente
- [ ] `https://masterboard.com.br/eventos/` mostra eventos reais do Bubble
- [ ] Formulário de candidatura envia para o webhook correto
- [ ] Redirect de `www` para apex (ou vice-versa) configurado
- [ ] Antiga URL WordPress (`masterboard.zerodhee.com.br`) mantida para redirecionamentos

---

## Cache e performance

Com `output: 'hybrid'`, as páginas SSR fazem fetch do Bubble a cada request.
O cache in-memory em `src/lib/adapters/bubble/index.ts` (TTL: 5min) evita sobrecarga.

Para melhor performance em produção, adicionar cache no nível do servidor web:
- **Vercel:** `Cache-Control: s-maxage=300, stale-while-revalidate=600` no response
- **Render/Fly:** configurar Nginx ou proxy reverso para cachear respostas GET

Exemplo de headers de cache em Astro:

```typescript
// Em qualquer página SSR
Astro.response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
```
