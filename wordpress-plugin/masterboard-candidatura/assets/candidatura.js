(function () {
  const config = window.MasterboardCandidatura || {};
  const LEAD_STORAGE_KEY = 'masterboard:candidatura:leadId';
  const ACTION_LABELS = {
    continue: 'Continuar',
    submit: 'Enviar para curadoria',
    sending: 'Enviando para curadoria...',
  };

  const FIELD_STEP_MAP = {
    email: 0,
    'email válido': 0,
    evento_interesse: 1,
    nome: 2,
    telefone: 2,
    empresa: 2,
    cargo: 3,
    faturamento: 4,
    colaboradores: 5,
    lgpd: 6,
  };

  const FIELD_LABEL_MAP = {
    email: 'e-mail profissional',
    'email válido': 'e-mail válido',
    evento_interesse: 'club de interesse',
    nome: 'nome completo',
    telefone: 'WhatsApp',
    empresa: 'nome da empresa',
    cargo: 'cargo',
    faturamento: 'faturamento anual',
    colaboradores: 'número de colaboradores',
    lgpd: 'aceite da Política de Privacidade',
  };

  const parseMissingFieldsFromError = (error) => {
    const match = String(error || '').match(/ausentes:\s*(.+)$/i);
    if (!match) return [];
    return match[1]
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
  };

  const firstStepForMissingFields = (missing) => {
    if (!missing.length) return 0;
    const steps = missing.map((field) => FIELD_STEP_MAP[field] ?? 6);
    return Math.min(...steps);
  };

  const formatMissingFieldLabels = (missing) =>
    missing.map((field) => FIELD_LABEL_MAP[field] || field).join(', ');

  const form = document.getElementById('application-form');
  if (!form) return;

  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const actionBtn = document.querySelector('[data-action]');
  const backBtn = document.querySelector('[data-back]');
  const stepIndicator = document.querySelector('[data-step-indicator]');
  const progressBar = document.querySelector('[data-progress-bar]');
  const errorEl = document.getElementById('application-error');
  const thanksEl = document.querySelector('[data-thanks]');
  const phoneCode = document.querySelector('[data-phone-code]');
  const phoneLocal = document.querySelector('[data-phone-local]');
  const phoneFull = document.querySelector('[data-phone-full]');
  const leadIdField = document.querySelector('[data-lead-id]');
  const formStepField = document.querySelector('[data-form-step]');
  const cnpjInput = document.querySelector('[data-cnpj-input]');
  const cnpjStatus = document.querySelector('[data-cnpj-status]');
  const companyField = document.querySelector('[data-company-field]');
  const cityField = document.querySelector('[data-city-field]');
  const cityDisplay = document.querySelector('[data-city-display]');
  let currentStep = 0;
  let cnpjLookupToken = 0;

  const fieldLabel = (field) =>
    field.dataset.requiredLabel ||
    field.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim() ||
    field.name ||
    'campo obrigatório';

  const showMessage = (message) => {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  };

  const normalizeCnpjDigits = (value) => value.replace(/\D/g, '');

  const formatCnpjDisplay = (digits) => {
    if (digits.length !== 14) return digits;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const setLeadId = (leadId) => {
    if (leadIdField) leadIdField.value = leadId;
    sessionStorage.setItem(LEAD_STORAGE_KEY, leadId);
  };

  const getLeadId = () => leadIdField?.value.trim() || sessionStorage.getItem(LEAD_STORAGE_KEY) || '';

  const isLastStep = () => currentStep === steps.length - 1;

  const focusStep = (stepIndex) => {
    const step = steps[stepIndex];
    if (!step) return;

    const focusable = step.querySelector(
      'input:not([type="hidden"]):not([readonly]), select, textarea',
    );
    focusable?.focus({ preventScroll: false });
  };

  const updateStep = () => {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });
    if (actionBtn) {
      actionBtn.textContent = isLastStep() ? ACTION_LABELS.submit : ACTION_LABELS.continue;
    }
    if (backBtn) {
      if (currentStep === 0) backBtn.setAttribute('hidden', '');
      else backBtn.removeAttribute('hidden');
    }
    if (stepIndicator) {
      stepIndicator.textContent = `Passo ${currentStep + 1} de ${steps.length}`;
      stepIndicator.removeAttribute('hidden');
    }
    if (progressBar) progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    if (formStepField) formStepField.value = String(currentStep);
    if (errorEl) errorEl.hidden = true;
  };

  const goToStep = (stepIndex, message) => {
    currentStep = Math.max(0, Math.min(stepIndex, steps.length - 1));
    updateStep();
    if (message) showMessage(message);
    focusStep(currentStep);
  };

  const syncPhone = () => {
    if (!phoneFull) return;
    const code = phoneCode?.value.trim() || '+55';
    const local = phoneLocal?.value.trim() || '';
    phoneFull.value = local ? `${code} ${local}` : '';
  };

  const syncCity = (city) => {
    if (cityField) cityField.value = city;
    if (cityDisplay) cityDisplay.value = city;
  };

  const setCnpjStatus = (message, visible = true) => {
    if (!cnpjStatus) return;
    cnpjStatus.textContent = message;
    cnpjStatus.hidden = !visible;
  };

  const apiHeaders = () => {
    const headers = { Accept: 'application/json' };
    if (config.nonce) headers['X-WP-Nonce'] = config.nonce;
    return headers;
  };

  const validateStepElement = (stepEl) => {
    const fields = Array.from(stepEl.querySelectorAll('input, select, textarea'));
    const missing = [];
    const seenRadioGroups = new Set();

    for (const field of fields) {
      if (!field.required) continue;

      if (field.type === 'radio') {
        if (seenRadioGroups.has(field.name)) continue;
        seenRadioGroups.add(field.name);
        if (!stepEl.querySelector(`input[type="radio"][name="${field.name}"]:checked`)) {
          missing.push(fieldLabel(field));
        }
        continue;
      }

      if (field.type === 'checkbox') {
        if (!field.checked) missing.push(fieldLabel(field));
        continue;
      }

      if (!field.value.trim()) {
        missing.push(fieldLabel(field));
        continue;
      }

      if (!field.checkValidity()) {
        missing.push(field.type === 'email' ? 'e-mail válido' : fieldLabel(field));
      }
    }

    return missing;
  };

  const findFirstInvalidStep = () => {
    syncPhone();

    for (let index = 0; index < steps.length; index += 1) {
      const missing = validateStepElement(steps[index]);
      if (missing.length > 0) return { step: index, missing };
    }

    return null;
  };

  const validateCurrentStep = () => {
    const missing = validateStepElement(steps[currentStep]);

    if (missing.length > 0) {
      showMessage(`Falta preencher: ${missing.join(', ')}.`);
      return false;
    }

    return true;
  };

  const saveProgress = async (completedStep) => {
    syncPhone();
    const data = new FormData(form);
    if (data.get('_gotcha')) return;

    const existingLeadId = getLeadId();
    if (existingLeadId) data.set('lead_id', existingLeadId);

    if (completedStep === 0) {
      const response = await fetch(config.draftUrl, {
        method: 'POST',
        body: data,
        headers: apiHeaders(),
        credentials: 'same-origin',
      });

      if (!response.ok) return;

      const result = await response.json();
      if (result.leadId) setLeadId(result.leadId);
      return;
    }

    if (!getLeadId()) return;

    data.set('form_step', String(completedStep));
    await fetch(config.draftUrl, {
      method: 'PATCH',
      body: data,
      headers: apiHeaders(),
      credentials: 'same-origin',
    });
  };

  const lookupCnpj = async () => {
    if (!cnpjInput || !config.cnpjUrl) return;

    const digits = normalizeCnpjDigits(cnpjInput.value);
    if (digits.length !== 14) {
      setCnpjStatus('', false);
      return;
    }

    cnpjInput.value = formatCnpjDisplay(digits);
    const token = ++cnpjLookupToken;
    setCnpjStatus('Consultando CNPJ...', true);

    try {
      const response = await fetch(`${config.cnpjUrl}${digits}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });

      if (token !== cnpjLookupToken) return;

      if (!response.ok) {
        setCnpjStatus('Não encontramos esse CNPJ. Preencha os dados manualmente.');
        return;
      }

      const result = await response.json();
      if (companyField && result.empresa) companyField.value = result.empresa;
      if (result.city) syncCity(result.city);

      const situacao = result.situacaoCadastral ? ` · ${result.situacaoCadastral}` : '';
      setCnpjStatus(`Dados preenchidos automaticamente${situacao}.`);
    } catch {
      if (token === cnpjLookupToken) {
        setCnpjStatus('Não foi possível consultar o CNPJ agora. Continue manualmente.');
      }
    }
  };

  const advanceStep = async () => {
    if (!validateCurrentStep()) {
      focusStep(currentStep);
      return;
    }

    try {
      await saveProgress(currentStep);
    } catch {
      // Salvamento progressivo não bloqueia o fluxo.
    }

    currentStep = Math.min(currentStep + 1, steps.length - 1);
    updateStep();
    focusStep(currentStep);
  };

  const goBack = () => {
    if (currentStep === 0) return;
    currentStep -= 1;
    updateStep();
    focusStep(currentStep);
  };

  const submitCandidatura = async () => {
    if (!actionBtn) return;

    const invalid = findFirstInvalidStep();
    if (invalid) {
      if (invalid.step !== currentStep) {
        goToStep(
          invalid.step,
          `Antes de enviar, volte e complete: ${invalid.missing.join(', ')}.`,
        );
        return;
      }

      if (!validateCurrentStep()) {
        focusStep(currentStep);
        return;
      }
    }

    syncPhone();
    actionBtn.disabled = true;
    actionBtn.textContent = ACTION_LABELS.sending;

    try {
      const data = new FormData(form);
      if (data.get('_gotcha')) return;

      const leadId = getLeadId();
      if (leadId) data.set('lead_id', leadId);
      data.set('form_step', '6');

      const headers = apiHeaders();
      const response = await fetch(config.restUrl, {
        method: 'POST',
        body: data,
        headers,
        credentials: 'same-origin',
      });

      if (!response.ok) {
        let detail = '';
        try {
          const payload = await response.json();
          detail = payload?.error || payload?.debug || '';
        } catch {
          detail = '';
        }

        const apiMissing = parseMissingFieldsFromError(detail);
        if (apiMissing.length > 0) {
          goToStep(
            firstStepForMissingFields(apiMissing),
            `Complete: ${formatMissingFieldLabels(apiMissing)}.`,
          );
          return;
        }

        throw new Error(detail || 'Falha ao enviar candidatura');
      }

      sessionStorage.removeItem(LEAD_STORAGE_KEY);
      form.hidden = true;
      progressBar?.parentElement?.setAttribute('hidden', '');
      thanksEl?.removeAttribute('hidden');
      errorEl?.setAttribute('hidden', '');
      thanksEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Não conseguimos enviar agora. Tente novamente em instantes.';
      showMessage(message);
    } finally {
      actionBtn.disabled = false;
      actionBtn.textContent = ACTION_LABELS.submit;
    }
  };

  const handlePrimaryAction = () => {
    if (isLastStep()) void submitCandidatura();
    else void advanceStep();
  };

  actionBtn?.addEventListener('click', handlePrimaryAction);
  backBtn?.addEventListener('click', goBack);

  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    handlePrimaryAction();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handlePrimaryAction();
  });

  cnpjInput?.addEventListener('input', () => {
    const digits = normalizeCnpjDigits(cnpjInput.value);
    if (digits.length <= 14) {
      cnpjInput.value = formatCnpjDisplay(digits.slice(0, 14));
    }
    if (digits.length === 14) lookupCnpj();
    else setCnpjStatus('', false);
  });

  cnpjInput?.addEventListener('blur', () => {
    const digits = normalizeCnpjDigits(cnpjInput.value);
    if (digits.length === 14) lookupCnpj();
  });

  phoneCode?.addEventListener('change', syncPhone);
  phoneLocal?.addEventListener('input', syncPhone);

  const storedLeadId = sessionStorage.getItem(LEAD_STORAGE_KEY);
  if (storedLeadId && leadIdField) leadIdField.value = storedLeadId;

  updateStep();
})();
