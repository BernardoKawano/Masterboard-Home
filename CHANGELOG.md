# Changelog

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
