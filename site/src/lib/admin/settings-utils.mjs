import { normalizeHexColor } from './content-utils.mjs';

export const SETTING_DEFINITIONS = [
  {
    key: 'brand.primaryColor',
    label: 'Cor principal',
    type: 'color',
    defaultValue: '#FBBE0A',
    description: 'Usada nos botões primários e destaques.',
  },
  {
    key: 'brand.primaryHoverColor',
    label: 'Cor principal no hover',
    type: 'color',
    defaultValue: '#C99703',
    description: 'Usada quando o cursor passa sobre botões primários.',
  },
  {
    key: 'home.hero.eyebrow',
    label: 'Hero: chamada superior',
    type: 'text',
    defaultValue: '',
    allowEmpty: true,
  },
  {
    key: 'home.hero.pill',
    label: 'Hero: selo',
    type: 'text',
    defaultValue: '',
    allowEmpty: true,
  },
  {
    key: 'home.hero.line1',
    label: 'Hero: linha 1',
    type: 'text',
    defaultValue: 'Ecossistema',
  },
  {
    key: 'home.hero.line2',
    label: 'Hero: linha 2',
    type: 'text',
    defaultValue: 'de educação',
  },
  {
    key: 'home.hero.highlight',
    label: 'Hero: destaque',
    type: 'text',
    defaultValue: 'e negócios',
  },
  {
    key: 'home.hero.line3',
    label: 'Hero: linha final',
    type: 'text',
    defaultValue: '',
    allowEmpty: true,
  },
  {
    key: 'home.hero.description',
    label: 'Hero: descrição',
    type: 'textarea',
    defaultValue:
      'Reunimos métodos, experiências e aprendizados de grandes executivos que construíram resultados em empresas como Microsoft, Salesforce, Amazon, SAP, Azul e Wellhub para ajudar empresários a tomar melhores decisões, desenvolver seus times e construir negócios preparados para crescer.',
  },
  {
    key: 'home.hero.primaryCtaLabel',
    label: 'Hero: texto do botão principal',
    type: 'text',
    defaultValue: 'Quero participar',
  },
  {
    key: 'home.hero.primaryCtaHref',
    label: 'Hero: link do botão principal',
    type: 'url',
    defaultValue: '/aplicacao/',
  },
  {
    key: 'home.hero.secondaryCtaLabel',
    label: 'Hero: texto do botão secundário',
    type: 'text',
    defaultValue: 'Ver experiências',
  },
  {
    key: 'home.hero.secondaryCtaHref',
    label: 'Hero: link do botão secundário',
    type: 'url',
    defaultValue: '#experiencias',
  },
];

const HERO_SETTING_KEYS = SETTING_DEFINITIONS
  .filter((definition) => definition.key.startsWith('home.hero.'))
  .map((definition) => definition.key);

const LEGACY_HERO_MARKERS = {
  line1: new Set(['Dizem que']),
  eyebrow: new Set(['Acesso por curadoria']),
  primaryCtaLabel: new Set(['Candidatar-se ao club']),
};

export function isLegacyHeroContent(hero = {}) {
  return (
    LEGACY_HERO_MARKERS.line1.has(hero.line1) ||
    LEGACY_HERO_MARKERS.eyebrow.has(hero.eyebrow) ||
    LEGACY_HERO_MARKERS.primaryCtaLabel.has(hero.primaryCtaLabel)
  );
}

function applyHeroPdfRefreshDefaults(settings) {
  for (const key of HERO_SETTING_KEYS) {
    const definition = SETTING_DEFINITIONS.find((item) => item.key === key);
    if (!definition) continue;
    setNestedValue(settings, key, normalizeSettingValue(definition, definition.defaultValue));
  }

  return settings;
}

export function defaultSettingsObject() {
  return settingsRowsToObject([]);
}

function setNestedValue(target, path, value) {
  const parts = path.split('.');
  let current = target;

  for (const part of parts.slice(0, -1)) {
    current[part] = current[part] || {};
    current = current[part];
  }

  current[parts.at(-1)] = value;
}

function normalizeSettingValue(definition, value) {
  if (definition.type === 'color') {
    return normalizeHexColor(value, definition.defaultValue);
  }

  const text = String(value ?? '').trim();
  if (text) return text;
  if (definition.allowEmpty) return '';
  return definition.defaultValue;
}

export function settingsRowsToObject(rows = []) {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const settings = {};

  for (const definition of SETTING_DEFINITIONS) {
    const rawValue = byKey.has(definition.key) ? byKey.get(definition.key) : definition.defaultValue;
    const value = normalizeSettingValue(definition, rawValue);
    setNestedValue(settings, definition.key, value);
  }

  if (isLegacyHeroContent(settings.home?.hero)) {
    applyHeroPdfRefreshDefaults(settings);
  }

  return settings;
}

export function settingsRowsForAdmin(rows = []) {
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return SETTING_DEFINITIONS.map((definition) => {
    const row = byKey.get(definition.key);
    return {
      ...definition,
      value: normalizeSettingValue(definition, row?.value ?? definition.defaultValue),
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ?? null,
    };
  });
}

export function buildSettingsRowsFromForm(data, updatedBy, now = new Date().toISOString()) {
  return SETTING_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    description: definition.description ?? null,
    type: definition.type,
    value: normalizeSettingValue(definition, data.get(definition.key)),
    is_public: true,
    updated_by: updatedBy,
    updated_at: now,
  }));
}

export function cssVariablesFromSettings(settings) {
  return [
    `--mb-yellow: ${settings.brand.primaryColor};`,
    `--mb-yellow-dark: ${settings.brand.primaryHoverColor};`,
  ].join(' ');
}
