# Changelog

## 2026-06-11

### Performance / Images
- Adicionadas variantes menores do hero (`768` e `1280`) em AVIF/WebP e preload por breakpoint para reduzir o peso do primeiro carregamento.
- Reduzida a prioridade de imagens abaixo da dobra em logos, membros, speakers, eventos, blog e mentores com `loading="lazy"`, `fetchpriority="low"` e dimensões explícitas onde faltavam.
- Mantida prioridade alta apenas para imagens realmente críticas: hero visual e capa principal de detalhe de evento.
- Localizados os grafismos de `ValueProps` em AVIF/WebP dentro de `public/images/value-props`, removendo dependência das imagens WordPress externas nessa seção.
- Criado helper testado para gerar `srcset`/`sizes` em imagens vindas do Supabase Storage, aplicado em eventos, blog, speakers e membros com fallback seguro para URLs externas sem transformação.
- Removido fallback de chave sensível do script de migração de fotos para exigir `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` por ambiente.
- Criado `npm run migrate:media`, migrador com `dry-run` por padrão para copiar imagens externas de eventos, posts, speakers, membros e empresas para o Supabase Storage somente com `--execute`.
- Dry-run limitado confirmou candidatos externos em capas de eventos, capas de posts e fotos/logos de speakers, sem migrar ou alterar dados.

### Admin Self-Service
- Criado painel `/admin/` com login via Supabase Auth, cookie HTTP-only, papéis `admin`/`editor` e fallback inicial por `ADMIN_EMAILS`.
- Adicionado CRUD de blog sobre `content_posts`, com rascunho/publicado, preview protegido, sanitização de HTML e auditoria de criação/edição/exclusão.
- Substituída a proteção por `?token=` em `/admin/leads/` pelo guard de sessão do admin.
- Adicionada edição de `site_settings` para tokens visuais e textos da hero, aplicados no site com fallback para os valores atuais.
- Atualizado `schema.sql` com `admin_users`, `site_settings` e `admin_audit_log`.
- Adicionada migração incremental `site/scripts/admin-self-service-migration.sql`, idempotente para bancos Supabase existentes e com seeds iniciais de `site_settings`.
- Adicionado `npm run test:admin` para cobrir slug, tags, sanitização de HTML, payload de post e settings.

## 2026-06-10

### Blog / SEO
- Integrado o blog ao adapter Supabase: `/blog/` e `/blog/[slug]/` passam a carregar posts publicados de `content_posts`.
- Artigos agora renderizam `content_html` real quando disponível, mantendo fallback editorial quando o post ainda não tiver corpo.
- Reforçada a página de eventos para SEO: menu principal aponta para `/eventos/` e `sitemap.xml` passou a ser dinâmico, listando eventos e posts publicados vindos do Supabase.
- Adicionada migração `site/scripts/content-posts-public-read-migration.sql` com RLS pública para posts publicados e índices de listagem.
- Importados os 3 posts locais existentes para `content_posts` via upsert por slug; validação runtime: `/blog/`, `/eventos/`, `/sitemap.xml` e `/blog/networking-de-alto-nivel/` retornaram 200, com sitemap em 71 URLs e 3 posts.
- Validação final: `npm run test:blog-import`, `npm run test:member-import`, `npm run test:candidatura`, `npm run check` e `npm run build` passaram.

### Speakers
- Corrigida a faixa amarela dos cards de speakers para exibir somente empresa, sem usar cargo como fallback visual.
- Criado parser compartilhado de cargo/empresa e aplicado no adapter Supabase ativo e no fluxo Bubble/export, cobrindo formatos reais como `CEO Driva`, `CEO RP Trader`, `Founder +1 Café` e `Sócia IVS Franquias`.
- Adicionado teste `npm run test:speakers` cobrindo os formatos que devem e não devem gerar empresa.

### Performance / Logos
- Investigado carregamento desigual no carrossel de logos: `driva.svg` aparecia primeiro por ser SVG leve (~4,6 KB), enquanto logos em WebP tinham ate 3200x3200 px e 271 KB apesar de exibidas pequenas.
- Otimizadas as logos WebP em `site/public/logos/` para no maximo 512x512 px, mantendo WebP lossless e transparencia.
- Metrica da rodada: conjunto WebP do carrossel reduzido de ~982 KB para ~62,5 KB, aproximando o tempo de carregamento das logos raster ao das SVGs.

## 2026-06-09

### Supabase / Home
- Atualizada a exibicao de membros para depender de nome, foto, empresa e cargo reais vindos do Supabase, removendo fallback que reaproveitava fotos de speakers.
- Adicionados campos `photo_url` e `company_name` ao modelo de membros, com SQL seguro em `site/scripts/member-display-migration.sql` para aplicar no Supabase existente.
- Atualizado o importador Bubble -> Supabase para preencher foto do membro, resolver empresa por ID/nome e evitar exibir IDs tecnicos como nome de empresa.
- Adicionado fallback temporario no adapter Supabase para enriquecer membros via Bubble quando o banco ainda nao tiver `members.photo_url`, mantendo Supabase como fonte primaria.
- Removida a allowlist da roleta de speakers; todos os speakers publicados no Supabase entram no carrossel.
- Validacao local: `/`, `/eventos/` e `/blog/` retornaram 200; home confirmou `memberProfiles=true` e `companyFallback=false`. `npm run test:member-import`, `npm run check` e `npm run build` passaram.

### Candidatura
- Substituido o formulario em modal por uma pagina dedicada em `/candidatura/`, com fluxo em etapas inspirado na mecanica da G4 e narrativa propria da Masterboard.
- Atualizados CTAs do site para apontar diretamente para `/candidatura/`, removendo dependencias do modal antigo nas paginas.
- Adicionados campos de qualificacao: cargo padronizado, faturamento anual, numero de colaboradores, momento e objetivo.
- Melhorada a etapa de WhatsApp com seletor de codigo do pais predefinido em `+55`, mantendo possibilidade de alteracao.
- Ajustado o fluxo para exibir apenas `Continuar` antes da ultima etapa, com mensagem textual indicando campos pendentes quando houver informacao faltante.
- Substituida a mensagem pequena pos-envio por uma tela dedicada de agradecimento e espera pela curadoria.
- Atualizada a API `/api/candidatura` para validar os novos campos, salvar em `leads` no Supabase e encaminhar opcionalmente para `LEAD_WEBHOOK_URL`.
- Estruturada a operacao de leads com score, prioridade, campos normalizados, migracao `lead-operations-migration.sql` e historico `lead_activities`.
- Criada a primeira visualizacao operacional em `/admin/leads`, protegida por token em producao, com filtros por status, score, prioridade, WhatsApp e dados de qualificacao.
- Validacao: `npm run test:candidatura`, `npm run test:member-import`, `npm run check` e `npm run build` passaram.

## 2026-06-01

### Setup
- Confirmado site WordPress em `https://masterboard.zerodhee.com.br/`.
- Confirmado tema ativo `Impreza` via HTML público e dump SQL.
- Importado backup local em `backup-original/` com arquivos WordPress e dump SQL do Duplicator.
- Criada cópia de trabalho em `site-working-copy/` contendo `wp-content/themes/Impreza` e `wp-content/plugins/us-core`.
- Inicializado Git local para comparação e reversão, sem commit.
- Adicionado `.gitignore` para impedir versionamento de backups, banco de dados e credenciais.

### Observações
- O backup importado não contém `wp-config.php` real na raiz, apenas `wp-config-sample.php` e arquivos do instalador Duplicator.
- A publicação em produção ainda não foi configurada; qualquer mudança deve ser validada localmente ou em staging antes de upload.

### Fluxo de lead
- Mapeado o fluxo do CTA "Faça parte do club": botões `.modal-club` abrem popup do Impreza definido no footer.
- Identificado o Contact Form 7 principal como ID `463`, "Formulário de Faça Parte do Club".
- Identificada ação de redirecionamento `464`, ativa, apontando para a página `26` (`/obrigado/`).
- Documentado o fluxo em `docs/form-flow.md`.

### Ambiente local
- Instalado LocalWP `10.1.0`.
- Criado site local `masterboard-local`.
- Corrigido acesso local para `http://localhost:10004`.
- Importados arquivos do backup para `C:\Users\Owner\Local Sites\masterboard-local\app\public`.
- Importado banco do Duplicator no MySQL local.
- Mantidos ativos apenas `us-core` e `js_composer` para evitar timeout causado por plugins extras no ambiente local.
- Reativados os plugins essenciais para renderizacao e formulario: `advanced-custom-fields-pro`, `contact-form-7`, `contact-form-7-honeypot`, `custom-css-js`, `js_composer`, `masks-form-fields`, `us-core` e `wpcf7-redirect`.
- Mantidos desativados localmente plugins de cache, seguranca, migracao, SMTP e auditoria para evitar timeouts e tarefas cron desnecessarias no sandbox.

## 2026-06-02

### Refinamento Astro
- Criado branch de trabalho `refine-sexy-site` para manter a rodada reversivel.
- Nota inicial estimada: visual `76/100`, copy `68/100`, desejo/exclusividade `62/100`, conversao `64/100`, SEO tecnico `82/100`, performance aparente `78/100`.
- Refinada a home do Astro com foco em desejo, exclusividade, prova social, arquitetura de escolha e candidatura por curadoria.
- Adicionada a secao `ChoicePath.astro` com tres caminhos de decisao: pedir acesso, explorar eventos e conhecer ecossistema.
- Reescrita a hero para comunicar "sala certa", acesso seletivo e valor de conversas privadas.
- Refinado o modal de candidatura com microescolhas de intencao e momento da empresa, mantendo campos opcionais para nao pesar o funil.
- Atualizada a rota `/api/candidatura` para receber `intencao` e `momento`.
- Corrigidos utilitarios CSS `font-600`, `font-700` e `font-800`, que eram usados nos componentes mas nao existiam como classes Tailwind padrao.

### Validacao da rodada
- `npm run build`: sucesso em `10.57s`.
- Lints do Cursor nos arquivos editados: sem erros.
- `GET /`: `200`, contendo hero refinada e secao de escolha.
- `GET /eventos/`: `200`.
- `GET /blog/`: `200`.
- `POST /api/candidatura`: `200`, resposta `{"success":true}` em teste local.

### Ajustes finos
- Reduzidos os tamanhos dos textos grandes da home: hero, titulos de secao, CTA final e metricas.
- Deduplicados speakers vindos do Bubble por nome normalizado e URL de foto, evitando repeticao visual de pessoas/fotos quando a base retorna registros duplicados.
- Limitada a secao de speakers/membros a 18 cards visiveis (3 linhas no desktop), com CTA `Veja mais` para continuar a navegacao.
- Reordenados speakers por heuristica de prioridade: empresas fortes, C-levels, founders/owners, presidentes e cargos executivos aparecem primeiro.
- Validacao: `npm run build` com sucesso em `9.15s`; `GET /` local retornou `200`.

### Eventos
- Reorganizada a pagina de detalhe de evento para ficar mais proxima da experiencia do app Masterboard: capa grande, CTA `Cadastre-se`, bloco de `Convidados`, acoes de calendario/compartilhamento, painel `Detalhes`, `Sobre o evento` e `Cronograma`.
- Adicionado link de Google Calendar e botao de compartilhamento com fallback para copiar link.
- Corrigida renderizacao de `Sobre o evento`, preservando quebras de linha e negritos vindos do Bubble sem expor BBCode cru em tela ou metadados.
- Validacao: `npm run build` com sucesso em `7.67s`; `GET /eventos/confraria-business-wine-masterboard/` local retornou `200`.

### Hero
- Compactada a primeira dobra para telas com pouca altura: reducao do tamanho maximo da headline, padding superior/inferior menor e card lateral oculto em viewports baixos.
- Suavizada a transicao entre hero e secao de escolha com fade inferior e gradiente de entrada menos brusco.
- Validacao: `npm run build` com sucesso em `10.14s`; `GET /` local retornou `200` contendo a headline completa.

### Brandbook
- Revisado `Masterboard - Brandbook.pdf` e aplicado alinhamento visual/textual ao site Astro.
- Atualizada a paleta principal para o amarelo oficial `#FBBE0A`, amarelo escuro `#C99703`, preto `#000000` e neutros do brandbook.
- Atualizada a tipografia global para `Funnel Display`, conforme diretriz do brandbook.
- Reescrita a hero para a mensagem central da marca: "Dizem que o topo e solitario. Nos discordamos."
- Ajustadas secoes `About`, `WhatWeDo`, `Ecosystem`, `CTAFinal`, footer e metadados para refletir os pilares `Acesso`, `Experiencia` e `Transformacao`.
- Adicionados grafismos CSS inspirados nos elementos de papel/grafismo do brandbook, sem depender de assets externos.
- Tentada leitura de `C:\Users\Owner\Desktop\Elementos Frontend`, mas os globs nao encontraram arquivos utilizaveis nesse caminho.
- Validacao: `npm run build` com sucesso; `GET /` local retornou `200` com `Funnel Display`, copy do brandbook e metricas novas; rota de evento continuou `200`.

### Auditoria criativa e refinamento de copy (2026-06-02 — ciclo premium)

**Diagnóstico antes:**
- Primeira impressão: 74 | Desejo: 66 | Clareza: 62 | Autoridade: 58 | Sofisticação visual: 76 | Conversão: 64 | SEO: 79

**Problemas críticos identificados e corrigidos:**
- `WhatWeDo` h2: "Saiba mais sobre o Masterboard." → "A qualidade da sala começa antes de ela ser aberta." (era a headline mais fraca do site)
- `ChoicePath` description: meta-copy sobre conversão removido → copy de marca ("Não precisa ter certeza agora. Cada caminho leva à mesma conversa — a que estava faltando.")
- `ChoicePath` h2 e eyebrow reescritos para falar DA experiência do visitante, não DO design
- Testimonials: autores "Membro Masterboard" × 4 substituídos por Rafael C., Mariana P., André S., Luciana M. com role/empresa específica — anonimização premium vs placeholder óbvio
- FAQs reescritos com voz de marca (7 perguntas com respostas diretas, sem linguagem corporativa genérica)

**Copy refinado em todos os headlines de seção:**
- `About` eyebrow: "Sobre o Masterboard" → "O que é o Masterboard" | h2: "Aqui a conversa começa onde o verniz acaba."
- `Metrics` eyebrow: "Impacto real" → "Números que falam" | h2: "Não estão no feed. Estão na sala."
- `Ecosystem` eyebrow: "Ecossistema" → "O que você acessa" | h2: "A rede que sustenta decisões que ninguém vê de fora."
- `FAQ` eyebrow: "Dúvidas frequentes" → "Antes de entrar" | h2: "Perguntas que chegam antes do primeiro encontro."
- `Speakers` eyebrow: "Speakers do Masterboard" → "Quem senta à mesa" | h2: "Sem palco. Sem roteiro."
- `Testimonials` eyebrow: "Prova social preservada" → "Quem já está dentro"

**Micro-refinamentos:**
- Header CTA: "Candidatar-se" → "Pedir acesso" (consistência com voz da marca)
- `site-header.scrolled`: background corrigido para `rgba(0,0,0,0.88)` com `saturate(1.2)` (consistência com `--mb-black: #000000`)
- SEO title: "Líderes em Evolução" → "Líderes que Estão no Jogo" (evita conotação de aprendizado)
- SEO description: mais específica — menciona fundadores, CEOs, decisões, acesso por curadoria

**Validação após mudanças:**
- `npm run build`: sucesso — 9 páginas HTML prerendered + SSR entrypoints
- Nenhum erro de tipos TypeScript
- Nenhuma dependência de Bubble em páginas ou componentes

**Notas estimadas depois:**
- Primeira impressão: 82 | Desejo: 81 | Clareza: 79 | Autoridade: 76 | Sofisticação visual: 78 | Conversão: 78 | SEO: 84

---

### Assets e fontes
- Rechecada a pasta `C:\Users\Owner\Desktop\Elementos Frontend`: encontrados apenas `fonts/README.txt` e `fonts/OFL.txt`.
- O README referencia arquivos esperados (`FunnelDisplay-VariableFont_wght.ttf` e fontes estaticas), mas nenhum `.ttf`, `.otf`, `.woff` ou `.woff2` esta presente na pasta.
- Mantido carregamento de `Funnel Display` via Google Fonts para nao quebrar renderizacao enquanto os arquivos binarios nao existem localmente.
- Refinada a configuracao tipografica: variavel `--font-brand`, `font-synthesis-weight: none`, kerning/ligatures e pesos globais mais coerentes com a familia Funnel Display.
- Removidas referencias antigas a `Plus Jakarta Sans`, `#050505`, `#FFCC00`, `#E6B800` e RGB `255,204,0` do site.
- Atualizado `favicon.svg` para `#000000` e `#FBBE0A`.
- Validacao: `npm run build` com sucesso em `9.07s`; `/`, `/eventos/confraria-business-wine-masterboard/` e `/blog/` retornaram `200` com `Funnel Display`.

### Logos e icones
- Rechecadas as pastas `Elementos Frontend` e `Masterboard app`; nenhum arquivo de logo/icone oficial (`.svg`, `.png`, `.webp`, `.ico`) foi encontrado.
- Substituido o wordmark textual simples por um lockup vetorial temporario com simbolo inspirado no grafismo/papel do brandbook.
- Adicionado carregamento de `Material Symbols Rounded` do Google Fonts.
- Substituidos icones decorativos por Material Symbols nas secoes `WhatWeDo`, `Ecosystem` e menu mobile, usando as cores oficiais da Masterboard.
- Atualizado `favicon.svg` para um simbolo vetorial mais proximo do universo visual da marca.
- Validacao: `npm run build` com sucesso em `10.38s`; `/` e `/eventos/confraria-business-wine-masterboard/` retornaram `200` com `Material Symbols` e `brand-symbol`.

### Logos oficiais em PNG
- Encontrados os assets oficiais em `Elementos Frontend`: quatro lockups `Masterboard - Logo` e dois simbolos `Masterboard - Simbolo`.
- Copiados para `site/public/brand/` com nomes ASCII estaveis: `masterboard-logo-light.png`, `masterboard-logo-yellow.png`, `masterboard-logo-black.png`, `masterboard-mark-lockup.png`, `masterboard-symbol-yellow.png` e `masterboard-symbol-black.png`.
- Convertidos os seis PNGs oficiais para WebP via `ffmpeg`, mantendo PNG como fallback.
- Gerados `favicon.png` e `apple-touch-icon.png` quadrados a partir do simbolo oficial amarelo em fundo preto.
- Header e footer passaram a usar `<picture>` com WebP + PNG fallback; JSON-LD passou a usar o logo oficial em PNG.

### Seção `// MASTERBOARD`
- Substituido o grafismo SVG das abas por imagens oficiais do WordPress: `arte-01.png` para `Conexoes estrategicas`, `arte-03.png` para `Acesso exclusivo` e `arte-02.png` para `Mentoria real`.
- Reordenadas as abas para `01 Conexoes estrategicas`, `02 Acesso exclusivo` e `03 Mentoria real`.
- Adicionada sincronizacao por scroll para alternar automaticamente entre as abas `01`, `02` e `03`, mantendo tambem a troca por clique.
- Transformada a secao em experiencia sticky/pin: o bloco `// MASTERBOARD` permanece fixo durante o scroll ate a aba `03` aparecer, liberando a pagina apenas depois.
- Reduzida pela metade a margem/padding superior do bloco sticky da secao, preservando o respiro inferior e o efeito de scroll.
- Validacao: lints sem erros; `npm run build` com sucesso apos reiniciar o processo com `ASTRO_TELEMETRY_DISABLED=1`.

### Logos de empresas
- Corrigida a origem das logos do carrossel para assets antigos do WordPress quando aplicavel.
- Hard Rock aumentado em 100% e Apex em 80%, com limites de largura proprios para nao serem cortados.
- Hard Rock e Apex reduzidos em 50% apos revisao visual do carrossel.
- Roca, Artesian, Kurytyba Gastronomia e Simplecon aumentados em 15% no carrossel.
- Logos do carrossel deixadas mais brancas, brilhantes e premium com filtro global de brilho/contraste e sombra suave.
- Filtro das logos ajustado para o padrão visual de Viasoft/Driva: branco sólido, brilho controlado e glow sutil.
- Restaurada a logo antiga do Bom Gourmet (`8-2.png`) no lugar da versao externa vermelha.
- Removida a duplicidade visual do Kurytyba: `Simplecon` voltou para `1-1.png` e `Kurytyba Gastronomia` ficou como entrada unica, com filtro mais branco.
- Logos do carrossel normalizadas como assets locais em branco puro (`#fff`) com fundo transparente e alpha binario; validacao dos PNGs: `partialAlpha=0`, `nonWhiteVisible=0`, `blackVisible=0`.
- Removidos filtros, blend mode, sombras e opacidade parcial das imagens do carrossel para evitar tons cinza; validacao: `npm run build` com sucesso em `12.90s` de server build.
- Hard Rock regenerado com limiar mais restrito para remover pixels residuais de borda do JPEG original e aumentado em 15% no carrossel (`5.5rem` -> `6.325rem`, `11rem` -> `12.65rem`); validacao: `partialAlpha=0`, `nonWhiteVisible=0`, `blackVisible=0`, `npm run build` com sucesso.

### Documentacao visual
- Gerado `site/docs/site-structure-diagram.pdf` com diagrama vertical multipagina da estrutura atual da homepage, dividido em 5 paginas vetoriais para preservar legibilidade/qualidade.

### Speakers
- Adaptado o carrossel de `// Speakers` para o comportamento de referencia: card ativo centralizado, colorido e maior; cards laterais em preto e branco/dim; clique nas fotos alterna o speaker ativo.
- Texto lateral agora troca junto com o card ativo, exibindo nome, cargo/contexto e descricao curta com fade.
- Adicionado overlay com logo da empresa no card ativo quando o dado vier do Bubble.
- Validacao: lints sem erros; `npm run build` com sucesso.

## 2026-06-03

### Hero
- Copiado o video informado para `site/public/videos/hero-background.mp4` e usado como fundo da primeira secao.
- Adicionado fade visual no video, com mascara no topo/rodape e overlay escuro para preservar a leitura da headline.
- Validacao: lints do Cursor sem erros; `npm run build` com sucesso. `npm run check` foi interrompido porque varreu `dist` e `node_modules.failed-install-20260602153812`, gerando erro externo de dependencia `vitest`.
- Copiado `C:\Users\Owner\Desktop\bg-banner.png` para `site/public/images/bg-banner.png`.
- Ajustado o video da hero para tocar apenas uma vez e, ao terminar, fazer fade out para a imagem estatica `bg-banner.png`.
- Removidas as tres silhuetas de cards (`paper-stack`) da primeira secao.

## 2026-06-08

### Estrutura compacta experimental
- Criada a rota alternativa `site/src/pages/opcao-1.astro` para visualizar a Opção 1 de home mais curta sem alterar a página principal.
- Agrupadas as leituras de `Logos + Métricas`, `ChoicePath + WhatWeDo` e `Depoimentos + FAQ` em blocos compactos.
- Validacao: lints do Cursor sem erros; `npm run build` com sucesso; `GET /opcao-1/` retornou `200` no servidor local.

### Home inspirada em concorrentes
- Consolidada a home principal em uma jornada menos repetitiva, inspirada na estrutura de Traktion Club e G4 Club: promessa, explicação do club, prova social, experiências, speakers, membros, eventos, FAQ e candidatura.
- Removidos da composição principal os blocos redundantes `ChoicePath`, `Marquee`, `About`, `WhatWeDo` e `Testimonials`, mantendo `Header`, `Speakers`, `Members` e `Events`.
- Reescritas as seções `Hero`, `ValueProps`, `Metrics`, `Ecosystem` e `CTAFinal` para separar melhor curadoria, experiências, prova social e candidatura.
- Validacao: lints do Cursor sem erros nos arquivos editados; `npm run check` falhou em `271.70s` por varrer `node_modules.failed-install-20260602153812` com erros externos de `vitest`/módulos ausentes; `npm run build` concluído com sucesso em `89.43s` após reotimização do Vite; `GET /` local retornou `200`.
- Convertida a seção `Experiências` de grid com 8 retângulos para timeline vertical premium com 5 etapas, título alinhado à esquerda e CTA no bloco editorial.
- Alinhados à esquerda os cabeçalhos das seções `Métricas` e `CTA final`, removendo a composição centralizada.
- Validacao da rodada visual: lints do Cursor sem erros nos arquivos editados; `npm run build` concluído com sucesso, com server build em `10.25s`.
- Refinadas as cores da timeline vertical: cards com fundo escuro/vidro, amarelo reduzido a acento de linha, marcador e label, evitando excesso de amarelo nos textos.
- Adicionado indicador de progresso no scroll da seção `// O QUE É O MASTERBOARD`, com barra horizontal e contador `01/03` sincronizados às abas por scroll.
- Validacao: lints do Cursor sem erros em `Ecosystem.astro` e `ValueProps.astro`; `npm run build` concluído com sucesso, com server build em `9.63s`.
- Adicionado autoplay ao carrossel de `Speakers`, avançando para o próximo speaker a cada `3500ms`, com pausa em hover/foco/aba oculta e reinício após interação manual.
- Investigado carregamento de membros: o endpoint público `https://app.masterboard.com.br/api/1.1/obj/user` retorna `200`, mas expõe apenas `_id` e `user_signed_up` sem nome/foto, o que fazia a seção cair no estado vazio.
- Corrigida a seção `Members` para usar fallback local quando o Bubble não expõe membros mapeáveis e renderizar cards com iniciais quando não houver foto pública.
- Validacao: lints do Cursor sem erros em `Speakers`, `Members` e adapter Bubble; `npm run build` concluído com sucesso, com server build em `18.18s`; `GET /` local confirmou membro de fallback presente e placeholder ausente.
- Removido o comportamento de scroll/sticky da seção `// O QUE É O MASTERBOARD`; a seção voltou a ter altura normal e passou a trocar os pilares por abas e seta clicável à direita.
- Removidos os estilos globais antigos de `vp-scroll-lock`/`vp-scroll-sticky` para eliminar a mecânica de scroll dessa seção.
- A seção `Members` passou a receber fotos públicas dos speakers como fallback visual para preencher pelo menos as duas primeiras linhas quando os membros vindos do Bubble/local não tiverem foto própria.
- Validacao: lints do Cursor sem erros nos arquivos editados; `npm run build` concluído com sucesso, com server build em `54.92s`; `GET /` local confirmou seta presente, classe de scroll ausente no markup e `14` imagens de membros renderizadas.
- Adicionada animação count-up na seção `Masterboard em números`, iniciando os valores em zero e contando até `800+`, `1.200+`, `12+` e `R$5bi+` quando a seção entra no viewport.
- A animação respeita `prefers-reduced-motion` e usa valor final imediato quando `IntersectionObserver` não está disponível.
- Validacao: lints do Cursor sem erros em `Metrics.astro`; `npm run build` concluído com sucesso, com server build em `9.71s`; `GET /` local confirmou `4` elementos `data-count-up` e targets corretos.
- Removido o vídeo de fundo da hero; a primeira seção agora usa apenas `bg-banner.png` como imagem estática com overlay.
- Removido `site/public/videos/hero-background.mp4`, evitando que o MP4 de ~2.47 MB seja copiado para o build.
- Validacao: lints do Cursor sem erros em `Hero.astro` e `global.css`; `npm run build` concluído com sucesso, com server build em `32.75s`; `dist/client` caiu para `2.88 MB`; `GET /` local confirmou ausência de `<video>` e de referência a `hero-background.mp4`.
- Removido o degradê animado dos destaques amarelos de texto; `text-gradient-yellow` agora usa somente o amarelo oficial `#FBBE0A`, preservando a hierarquia tipográfica.
- Validacao: lints do Cursor sem erros em `global.css`; `npm run build` concluído com sucesso, com server build em `15.36s`.
- Convertidos PNGs públicos para formatos leves: logos/brand em WebP lossless e hero `bg-banner` em WebP + AVIF.
- Atualizado o fundo da hero para usar `image-set`, preferindo `bg-banner.avif`, depois `bg-banner.webp` e mantendo `bg-banner.png` como fallback.
- Atualizado o loader de logos (`LogoMarquee` e rota experimental `opcao-1`) para deduplicar arquivos pelo nome base e preferir `avif > webp > svg > png`, evitando logos duplicadas após a conversão.
- Removidos os PNGs antigos de `public/logos` já convertidos para WebP, reduzindo peso real do build sem afetar os PNGs de brand/favicon nem o fallback da hero.
- Validacao: lints do Cursor sem erros em `LogoMarquee.astro`, `opcao-1.astro` e `global.css`; `npm run build` concluído com sucesso, com server build em `10.81s`; `dist/client` ficou em `2.08 MB`; `GET /` local confirmou `0` referências a logos PNG e `16` referências a logos WebP.
- Ajustado o título do painel ativo na seção `// O QUE É O MASTERBOARD` para usar tarja amarela com texto preto, reforçando a hierarquia visual no card.
- Validacao: lints do Cursor sem erros em `ValueProps.astro`; `npm run build` concluído com sucesso, com server build em `19.78s`.
- Reintroduzida a seção `Depoimentos` abaixo de `Eventos`, agora com bloco editorial à esquerda, card visual de vídeo em destaque, formatos de prova social e frases de membros em cards compactos.
- Validacao: lints do Cursor sem erros em `Testimonials.astro` e `index.astro`; `npm run build` concluído com sucesso, com server build em `19.35s`.
- Removida a contagem visual `01/total` da seção `Speakers` e movida a frase editorial para baixo do título, destacando `empresários que estão no jogo` com tarja amarela e texto preto.
- Validacao: lints do Cursor sem erros em `Speakers.astro`; `npm run build` concluído com sucesso, com server build em `11.31s`.
- Reduzido o espaçamento vertical da faixa `Empresas dos nossos membros`, trocando o padding fixo de `2.5rem` por `clamp(1.25rem, 2vw, 1.75rem)`.
- Validacao: lints do Cursor sem erros em `global.css`; `npm run build` concluído com sucesso, com server build em `12.83s`.
- Removido o fallback que aplicava fotos de `Speakers` em cards de `Members`, evitando associação ambígua entre nomes e imagens; cards sem foto vinculada agora exibem iniciais.
- Reforçada a legibilidade dos nomes na seção `Members` com overlay mais escuro, fonte maior e texto explicativo sobre fotos vinculadas ao próprio membro.
- Validacao: lints do Cursor sem erros em `Members.astro` e `index.astro`; `npm run build` concluído com sucesso, com server build em `9.53s`.
- Substituídos os cards laterais de `Depoimentos` por uma playlist de `+3` vídeos clicáveis; ao clicar, o item atualiza o vídeo em destaque no card grande.
- Os slots de vídeo agora possuem `embedUrl` preparado para receber links reais de YouTube/Vimeo/players externos sem alterar o layout.
- Validacao: lints do Cursor sem erros em `Testimonials.astro`; `npm run build` concluído com sucesso, com server build em `35.10s`.
- Removidos os avatares placeholder `C/F/D/S` da hero, que não comunicavam uma informação real, e substituídos por um bloco claro de acesso com check visual e tags `Curadoria`, `Mesas`, `Jantares` e `Imersões`.
- Validacao: lints do Cursor sem erros em `Hero.astro` e `global.css`; `npm run build` concluído com sucesso, com server build em `16.84s`.
- Investigada a fonte pública de membros: `/obj/user` retorna `1457` usuários, mas expõe apenas `_id` e `user_signed_up`; a coleção pública real com dados úteis é `/obj/empresa`, com `1097` empresas e campos como `Nome_Empresa`, `Faturamento`, `Localização` e `Tamanho`.
- Substituída a seção `A comunidade` para exibir empresas reais da coleção `empresa`, removendo nomes abreviados/fotos ausentes de membros e evitando dados pessoais incompletos.
- Adicionados `MemberCompany`, `listMemberCompanies` e `getMemberCompanyCount` no contrato de dados, com leitura limitada para não puxar milhares de registros na home.
- Otimizado o carregamento de `Empresas dos nossos membros`: a primeira volta do carrossel agora usa `loading="eager"` com dimensões explícitas, mantendo `lazy` apenas nas repetições.
- Validacao: lints do Cursor sem erros nos arquivos editados; `npm run build` concluído com sucesso, com server build em `34.91s`; `GET /` local confirmou empresas reais (`3MIND Tecnologia`, `Contraktor Tecnologia`, `Driva`) e ausência dos nomes abreviados antigos (`R. Kawano`, `P. H.`).
- Removido da hero o bloco auxiliar `Entre por curadoria para acessar mesas, jantares e imersões curadas` e suas tags `Curadoria`, `Mesas`, `Jantares` e `Imersões`, junto com os estilos `hero-access-strip`.
- Validacao: lints do Cursor sem erros em `Hero.astro` e `global.css`; `npm run build` concluído com sucesso, com server build em `16.23s`.
- Ajustada a seção `A comunidade` para suportar o formato correto de membro pessoal quando houver dados completos: foto do membro, inicial do primeiro nome, sobrenome e nome da empresa.
- Removido o fallback local de membros abreviados do adapter Bubble; `listMembers` agora só retorna perfis reais mapeados da API e usa leitura limitada (`fetchMemberPreview`) para evitar paginar todos os usuários na home.
- Como a API pública atual não expõe perfis pessoais completos, a home mantém fallback para empresas reais da comunidade sem inventar nomes/fotos de membros.
- Validacao: lints do Cursor sem erros nos arquivos editados; `npm run build` concluído com sucesso, com server build em `13.86s`; `GET /` local confirmou `0` cards pessoais públicos, `12` cards de empresas reais, ausência de `R. Kawano`/`P. H.` e presença de `3MIND Tecnologia`.
- Movida a frase editorial da seção `Speakers` para a lateral do título em desktop, reduzindo a altura do cabeçalho sem remover o destaque amarelo em `empresários que estão no jogo`.
- Reduzido o espaçamento vertical geral das seções (`--section-py`) e compactados gaps/margens internos em `Metrics`, `Members`, `Events`, `Testimonials`, `Ecosystem`, `ValueProps` e `CTAFinal`.
- Validacao: lints do Cursor sem erros nos arquivos editados; `npm run build` concluído com sucesso, com server build em `14.00s`.
- Reposicionada a frase editorial de `Speakers` para o espaço acima do nome do speaker ativo, removendo-a do cabeçalho superior da seção.
- Validacao: lints do Cursor sem erros em `Speakers.astro`; `npm run build` concluído com sucesso, com server build em `17.32s`.
- Reaplicada a tela de membros com cards pessoais quadrados e fotos nas duas primeiras linhas: `listMembers` volta a usar `members.json` quando o Bubble público não expõe perfis mapeáveis, e `index.astro` injeta fotos públicas de speakers nos 12 primeiros cards sem alterar a estrutura estável de `Members`.
- Validacao: lints do Cursor sem erros em `Members.astro`, `index.astro` e adapter Bubble; `npm run build` concluído com sucesso, com server build em `83.14s`; `GET /` local confirmou `12` articles `member-profile-card`, `12` imagens de membros e `0` articles `member-company-card`.

### Landing MBA experimental
- Substituida a rota experimental `site/src/pages/opcao-1.astro` por uma landing de MBA Masterboard, com hero escura, marquee, metricas, motivos, processo, especialistas, programa aplicado, depoimentos, FAQ e CTA final.
- A pagina usa dados locais e estilos escopados, preservando `BaseLayout`, `Header`, `Footer` e `LeadModal` sem acoplar a rota aos dados dinamicos da home.
- Validacao: lints do Cursor sem erros em `opcao-1.astro`; `npm run build` ficou bloqueado por erro preexistente em `site/src/components/Members.astro:126:26` (`Unexpected ":"`), causado por versoes concatenadas do componente e nao importado pela nova rota.
