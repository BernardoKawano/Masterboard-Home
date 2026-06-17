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
    defaultValue: 'Acesso por curadoria',
  },
  {
    key: 'home.hero.pill',
    label: 'Hero: selo',
    type: 'text',
    defaultValue: 'Candidaturas abertas',
  },
  {
    key: 'home.hero.line1',
    label: 'Hero: linha 1',
    type: 'text',
    defaultValue: 'Dizem que',
  },
  {
    key: 'home.hero.line2',
    label: 'Hero: linha 2',
    type: 'text',
    defaultValue: 'o topo é',
  },
  {
    key: 'home.hero.highlight',
    label: 'Hero: destaque',
    type: 'text',
    defaultValue: 'solitário.',
  },
  {
    key: 'home.hero.line3',
    label: 'Hero: linha final',
    type: 'text',
    defaultValue: 'Nós discordamos.',
  },
  {
    key: 'home.hero.description',
    label: 'Hero: descrição',
    type: 'textarea',
    defaultValue: 'Um club empresarial fechado para fundadores, CEOs e executivos que querem crescer com pares certos, experiências de alto contexto e conversas que viram decisão.',
  },
  {
    key: 'home.hero.primaryCtaLabel',
    label: 'Hero: texto do botão principal',
    type: 'text',
    defaultValue: 'Candidatar-se ao club',
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
  return text || definition.defaultValue;
}

export function settingsRowsToObject(rows = []) {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const settings = {};

  for (const definition of SETTING_DEFINITIONS) {
    const rawValue = byKey.has(definition.key) ? byKey.get(definition.key) : definition.defaultValue;
    const value = normalizeSettingValue(definition, rawValue);
    setNestedValue(settings, definition.key, value);
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
