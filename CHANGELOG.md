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
