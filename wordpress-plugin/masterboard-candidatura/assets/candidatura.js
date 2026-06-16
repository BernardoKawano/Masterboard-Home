(function () {
  const config = window.MasterboardCandidatura || {};
  const form = document.getElementById('application-form');
  if (!form) return;

  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const nextBtn = document.querySelector('[data-next]');
  const submitBtn = document.querySelector('[data-submit]');
  const progressBar = document.querySelector('[data-progress-bar]');
  const errorEl = document.getElementById('application-error');
  const thanksEl = document.querySelector('[data-thanks]');
  const phoneCode = document.querySelector('[data-phone-code]');
  const phoneLocal = document.querySelector('[data-phone-local]');
  const phoneFull = document.querySelector('[data-phone-full]');
  let currentStep = 0;

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

  const updateStep = () => {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
    });
    if (nextBtn) nextBtn.hidden = currentStep === steps.length - 1;
    if (submitBtn) submitBtn.hidden = currentStep !== steps.length - 1;
    if (progressBar) progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    if (errorEl) errorEl.hidden = true;
  };

  const syncPhone = () => {
    if (!phoneFull) return;
    const code = phoneCode?.value.trim() || '+55';
    const local = phoneLocal?.value.trim() || '';
    phoneFull.value = local ? `${code} ${local}` : '';
  };

  const validateCurrentStep = () => {
    const current = steps[currentStep];
    const fields = Array.from(current.querySelectorAll('input, select, textarea'));
    const missing = [];
    const seenRadioGroups = new Set();

    for (const field of fields) {
      if (!field.required) continue;

      if (field.type === 'radio') {
        if (seenRadioGroups.has(field.name)) continue;
        seenRadioGroups.add(field.name);
        if (!current.querySelector(`input[type="radio"][name="${field.name}"]:checked`)) {
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

    if (missing.length > 0) {
      showMessage(`Falta preencher: ${missing.join(', ')}.`);
      return false;
    }

    return true;
  };

  nextBtn?.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    currentStep = Math.min(currentStep + 1, steps.length - 1);
    updateStep();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateCurrentStep() || !submitBtn) return;

    syncPhone();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando para curadoria...';

    try {
      const data = new FormData(form);
      if (data.get('_gotcha')) return;

      const headers = { Accept: 'application/json' };
      if (config.nonce) headers['X-WP-Nonce'] = config.nonce;

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
        throw new Error(detail || 'Falha ao enviar candidatura');
      }

      form.hidden = true;
      progressBar?.parentElement?.setAttribute('hidden', '');
      thanksEl?.removeAttribute('hidden');
      errorEl?.setAttribute('hidden', '');
      thanksEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Não conseguimos enviar agora. Tente novamente em instantes.';
      showMessage(message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar para curadoria';
    }
  });

  phoneCode?.addEventListener('change', syncPhone);
  phoneLocal?.addEventListener('input', syncPhone);
  updateStep();
})();
