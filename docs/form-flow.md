# Fluxo do formulario de lead

## Beliefs
- O CTA publico usa botoes com a classe `.modal-club`.
- A home e o header nao usam link direto para o formulario; eles disparam um popup do tema Impreza.
- O popup esta definido no footer do tema/site builder com `[us_popup use_page_block="459" show_on="selector" trigger_selector=".modal-club"]`.
- O formulario principal de "Faca Parte do Club" e o Contact Form 7 ID `463`.
- O formulario `463` envia nome, e-mail, telefone e aceite da politica de privacidade.
- O plugin "Redirection for Contact Form 7" tem a acao `464` ligada ao formulario `463`.
- A acao `464` esta ativa, usa `action_type=redirect` e aponta para a pagina ID `26`, slug `obrigado`.

## Desires
- Alterar o fluxo de lead sem editar producao diretamente.
- Validar primeiro localmente ou em staging antes de enviar qualquer arquivo ou mudanca de banco.
- Manter reversao simples: backup original em `backup-original/` e copia editavel em `site-working-copy/`.

## Intentions
1. Para alterar campos do formulario, editar o CF7 ID `463` no WordPress ou aplicar mudanca controlada no banco.
2. Para alterar destino pos-envio, editar a acao de redirect `464` no plugin "Redirection for Contact Form 7".
3. Para alterar o comportamento do botao/modal, editar o page block `459` ou a configuracao `[us_popup]` no footer.
4. Para alterar estilo visual do popup/formulario, preferir CSS em tema filho ou area de CSS customizado, evitando mexer direto em vendor do tema Impreza.

## Validacao local
- Confirmar que o HTML publico contem botoes `.modal-club`.
- Confirmar que a pagina carrega assets do Contact Form 7 e `wpcf7-redirect`.
- Confirmar no dump SQL que o formulario `463` existe e esta publicado.
- Confirmar no dump SQL que a acao `464` esta ativa e aponta para a pagina `26`.
- Rodar lint PHP nos arquivos da copia de trabalho quando PHP estiver disponivel.
