<?php
if (!defined('ABSPATH')) {
    exit;
}

$role_options = [
    'Sócio ou Fundador',
    'Presidente ou CEO',
    'Vice-presidente ou C-Level',
    'Diretor',
    'Gerente',
    'Coordenador',
    'Supervisor',
    'Analista',
];

$revenue_options = [
    'Ainda não faturamos',
    'Até R$250 mil ao ano',
    'De R$250 mil a R$500 mil ao ano',
    'De R$500 mil a R$1 milhão ao ano',
    'De R$1 milhão a R$5 milhões ao ano',
    'De R$5 a R$10 milhões ao ano',
    'De R$10 a R$50 milhões ao ano',
    'De R$50 a R$500 milhões ao ano',
    'Acima de R$500 milhões',
];

$employee_options = [
    'Acima de 1.000 colaboradores',
    'De 101 a 1.000 colaboradores',
    'De 51 a 100 colaboradores',
    'De 10 a 50 colaboradores',
    'Até 10 colaboradores',
];

$country_code_options = [
    ['value' => '+55', 'label' => 'Brasil', 'hint' => '+55'],
    ['value' => '+1', 'label' => 'EUA / Canadá', 'hint' => '+1'],
    ['value' => '+351', 'label' => 'Portugal', 'hint' => '+351'],
    ['value' => '+54', 'label' => 'Argentina', 'hint' => '+54'],
    ['value' => '+56', 'label' => 'Chile', 'hint' => '+56'],
    ['value' => '+57', 'label' => 'Colômbia', 'hint' => '+57'],
    ['value' => '+52', 'label' => 'México', 'hint' => '+52'],
    ['value' => '+598', 'label' => 'Uruguai', 'hint' => '+598'],
    ['value' => '+595', 'label' => 'Paraguai', 'hint' => '+595'],
];

$club_options = [
    'Masterboard Club — Londrina',
    'Masterboard Club — Maringá',
    'Masterboard Club — Curitiba',
];

$privacy_url = esc_url(home_url('/politica-de-privacidade/'));
?>
<div class="mb-candidatura-page">
  <section class="application-hero">
    <div class="mb-candidatura-container">
      <div class="application-shell">
        <aside class="application-context" aria-label="Contexto da candidatura">
          <p class="mb-eyebrow">Candidatura Masterboard</p>
          <h1>A sala certa começa pelo filtro certo.</h1>
          <p>
            Precisamos entender seu momento, sua empresa e o tipo de conversa que pode gerar valor
            real para você e para quem já está dentro.
          </p>
          <div class="application-proof">
            <span>Curadoria antes do acesso</span>
            <span>Experiências presenciais</span>
            <span>Pares com contexto real</span>
          </div>
        </aside>

        <section class="application-card" aria-labelledby="application-title">
          <div class="application-progress" aria-hidden="true">
            <div class="application-progress__bar" data-progress-bar></div>
          </div>

          <form
            id="application-form"
            method="POST"
            novalidate
            aria-label="Formulário de candidatura ao Masterboard"
          >
            <input type="hidden" name="intencao" value="membro" />
            <input type="hidden" name="source" value="<?php echo esc_attr(MB_LEAD_SOURCE_MASTERBOARD_SITE_CANDIDATURA); ?>" />
            <input type="hidden" name="telefone" data-phone-full />
            <input type="hidden" name="lead_id" data-lead-id />
            <input type="hidden" name="cidade" data-city-field />
            <input type="hidden" name="form_step" data-form-step />

            <div class="application-step" data-step="0">
              <p class="application-kicker">Começamos simples.</p>
              <h2 id="application-title">Olá, qual é o seu e-mail profissional?</h2>
              <p class="application-copy">
                Ele identifica sua aplicação e evita que você precise repetir informações depois.
                Guardamos seu e-mail para continuidade da candidatura, conforme a
                <a href="<?php echo $privacy_url; ?>" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.
              </p>
              <label class="form-label" for="field-email">E-mail</label>
              <input
                id="field-email"
                name="email"
                type="email"
                class="form-input application-input"
                placeholder="voce@empresa.com"
                required
                data-required-label="e-mail profissional"
                autocomplete="email"
              />
            </div>

            <div class="application-step" data-step="1" hidden>
              <p class="application-kicker">Próximo passo.</p>
              <h2>Qual Masterboard Club te interessa?</h2>
              <p class="application-copy">Isso ajuda a curadoria a direcionar sua aplicação para a sala certa.</p>
              <div class="application-options application-options--single">
                <?php foreach ($club_options as $option) : ?>
                  <label class="application-option">
                    <input type="radio" name="evento_interesse" value="<?php echo esc_attr($option); ?>" required data-required-label="club de interesse" />
                    <span><?php echo esc_html($option); ?></span>
                  </label>
                <?php endforeach; ?>
              </div>
            </div>

            <div class="application-step" data-step="2" hidden>
              <p class="application-kicker">Obrigado pelo interesse.</p>
              <h2>Para priorizar sua aplicação, conte quem é você.</h2>
              <div class="application-field-stack">
                <div class="application-field">
                  <label class="form-label" for="field-nome">1. Qual o seu nome completo?</label>
                  <input id="field-nome" name="nome" type="text" class="form-input application-input" placeholder="Seu nome completo" required data-required-label="nome completo" autocomplete="name" />
                </div>
                <div class="application-field">
                  <label class="form-label" for="field-country-code">Região / código do país</label>
                  <div class="application-field-control">
                    <select id="field-country-code" name="codigo_pais" class="form-input application-input phone-code" aria-label="Código do país" data-phone-code>
                      <?php foreach ($country_code_options as $option) : ?>
                        <option value="<?php echo esc_attr($option['value']); ?>"<?php selected($option['value'], '+55'); ?>>
                          <?php echo esc_html($option['hint'] . ' · ' . $option['label']); ?>
                        </option>
                      <?php endforeach; ?>
                    </select>
                  </div>
                </div>
                <div class="application-field">
                  <label class="form-label" for="field-whatsapp">2. E o seu WhatsApp?</label>
                  <div class="application-field-control">
                    <input id="field-whatsapp" name="whatsapp" type="tel" class="form-input application-input" placeholder="11 9 0000-0000" required data-required-label="WhatsApp" data-phone-local autocomplete="tel-national" />
                  </div>
                </div>
                <div class="application-field">
                  <label class="form-label" for="field-cnpj">3. CNPJ da empresa <span class="form-label-optional">(opcional)</span></label>
                  <input id="field-cnpj" name="cnpj" type="text" class="form-input application-input" placeholder="00.000.000/0000-00" inputmode="numeric" data-cnpj-input autocomplete="off" />
                  <p class="application-hint" data-cnpj-status hidden></p>
                </div>
                <div class="application-field">
                  <label class="form-label" for="field-empresa">4. Qual o nome da sua empresa?</label>
                  <input id="field-empresa" name="empresa" type="text" class="form-input application-input" placeholder="Ex: Masterboard" required data-required-label="nome da empresa" autocomplete="organization" data-company-field />
                </div>
                <div class="application-field">
                  <label class="form-label" for="field-city-display">Cidade da empresa</label>
                  <input id="field-city-display" type="text" class="form-input application-input" placeholder="Preenchida automaticamente pelo CNPJ" readonly data-city-display />
                </div>
                <div class="application-field">
                  <label class="form-label" for="field-website">5. Site da empresa <span class="form-label-optional">(opcional)</span></label>
                  <input id="field-website" name="website" type="url" class="form-input application-input" placeholder="https://suaempresa.com.br" autocomplete="url" />
                </div>
              </div>
            </div>

            <div class="application-step" data-step="3" hidden>
              <h2>6. Qual o seu cargo na empresa?</h2>
              <p class="application-copy">Isso ajuda a entender se você está na cadeira certa para a sala.</p>
              <div class="application-options">
                <?php foreach ($role_options as $index => $option) : ?>
                  <label class="application-option">
                    <input type="radio" name="cargo" value="<?php echo esc_attr($option); ?>" required data-required-label="cargo"<?php checked($index === 0); ?> />
                    <span><?php echo esc_html($option); ?></span>
                  </label>
                <?php endforeach; ?>
              </div>
            </div>

            <div class="application-step" data-step="4" hidden>
              <h2>7. Qual o faturamento anual da sua empresa?</h2>
              <p class="application-copy">A resposta orienta a curadoria, não aparece publicamente.</p>
              <div class="application-options">
                <?php foreach ($revenue_options as $option) : ?>
                  <label class="application-option">
                    <input type="radio" name="faturamento" value="<?php echo esc_attr($option); ?>" required data-required-label="faturamento anual" />
                    <span><?php echo esc_html($option); ?></span>
                  </label>
                <?php endforeach; ?>
              </div>
            </div>

            <div class="application-step" data-step="5" hidden>
              <h2>8. Quantos colaboradores sua empresa possui?</h2>
              <p class="application-copy">Tamanho de operação muda o tipo de troca que faz sentido.</p>
              <div class="application-options">
                <?php foreach ($employee_options as $option) : ?>
                  <label class="application-option">
                    <input type="radio" name="colaboradores" value="<?php echo esc_attr($option); ?>" required data-required-label="número de colaboradores" />
                    <span><?php echo esc_html($option); ?></span>
                  </label>
                <?php endforeach; ?>
              </div>
            </div>

            <div class="application-step" data-step="6" hidden>
              <h2>9. O que faria essa sala valer seu tempo agora?</h2>
              <p class="application-copy">Último contexto antes da curadoria.</p>
              <label class="form-label" for="field-momento">Momento da empresa</label>
              <select id="field-momento" name="momento" class="form-input application-input">
                <option value="">Selecione se quiser</option>
                <option value="crescimento">Crescimento acelerado</option>
                <option value="expansao">Expansão para novos mercados</option>
                <option value="reposicionamento">Reposicionamento estratégico</option>
                <option value="capital">Busca de capital ou M&amp;A</option>
                <option value="network">Rede certa para próximos passos</option>
              </select>

              <label class="form-label mt-4" for="field-objetivo">Objetivo principal</label>
              <textarea id="field-objetivo" name="objetivo" class="form-input application-input min-h-28" placeholder="Ex: tomar decisões melhores com pares que vivem desafios parecidos."></textarea>

              <label class="application-consent">
                <input id="field-lgpd" name="lgpd" type="checkbox" required data-required-label="aceite da Política de Privacidade" />
                <span>
                  Concordo com a <a href="<?php echo $privacy_url; ?>" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
                  e autorizo o contato da equipe Masterboard.
                </span>
              </label>
            </div>

            <div class="hidden" aria-hidden="true">
              <input name="_gotcha" type="text" tabindex="-1" autocomplete="off" />
            </div>

            <div id="application-error" class="application-message application-message--error" hidden role="alert"></div>

            <div class="application-actions">
              <button type="button" class="mb-btn-primary" data-action>Continuar</button>
            </div>
          </form>

          <section class="application-thanks" data-thanks hidden aria-live="polite">
            <p class="application-kicker">Candidatura recebida.</p>
            <h2>Obrigado. Agora é com a curadoria.</h2>
            <p>
              Sua aplicação entrou na fila de análise da Masterboard. Vamos olhar seu momento,
              porte de empresa e objetivo para entender se existe fit com a sala certa.
            </p>
            <p>
              Se fizer sentido para os dois lados, nossa equipe entra em contato pelo WhatsApp informado.
            </p>
            <a href="<?php echo esc_url(home_url('/')); ?>" class="mb-btn-secondary">Voltar ao site</a>
          </section>
        </section>
      </div>
    </div>
  </section>
</div>
