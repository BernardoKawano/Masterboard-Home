# Masterboard Home

Camada de desenvolvimento local para o site Masterboard em WordPress.

## O que vai para o GitHub

- `wp-content/themes/masterboard-child`: child theme para HTML, CSS e JavaScript customizados.
- `docs/`: documentacao do fluxo do site e formulario.
- `CHANGELOG.md`: historico das mudancas feitas no ambiente local.

## O que nao vai para o GitHub

- Backup completo do WordPress.
- Banco de dados `.sql`.
- `wp-config.php`.
- Credenciais.
- Tema/plugin premium de terceiros.

Esses arquivos ficam fora porque o repositorio e publico.

## Como editar em casa

1. Clone este repositorio.
2. Crie um site WordPress local no LocalWP.
3. Instale/ative o tema Impreza no WordPress local.
4. Copie `wp-content/themes/masterboard-child` para o `wp-content/themes` do site local.
5. Ative o tema `Masterboard Child` no painel do WordPress.

## Onde codar na mao

CSS:

```text
wp-content/themes/masterboard-child/assets/css/custom.css
```

JavaScript:

```text
wp-content/themes/masterboard-child/assets/js/custom.js
```

HTML/PHP:

```text
wp-content/themes/masterboard-child/functions.php
```

O shortcode inicial e:

```text
[masterboard_manual_section]
```

Ele renderiza um bloco HTML editavel no child theme.
