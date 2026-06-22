import assert from 'node:assert/strict';
import {
  buildPostRowFromForm,
  normalizeHexColor,
  sanitizeHtml,
  slugify,
  splitTags,
  validatePostRow,
} from '../src/lib/admin/content-utils.mjs';
import {
  buildSettingsRowsFromForm,
  cssVariablesFromSettings,
  isLegacyHeroContent,
  settingsRowsToObject,
} from '../src/lib/admin/settings-utils.mjs';

assert.equal(slugify('Liderança de Alto Nível!'), 'lideranca-de-alto-nivel');
assert.deepEqual(splitTags(' liderança, networking, , CEOs '), ['liderança', 'networking', 'CEOs']);
assert.equal(normalizeHexColor('fbbe0a', '#000000'), '#FBBE0A');
assert.equal(normalizeHexColor('javascript:alert(1)', '#000000'), '#000000');

assert.equal(
  sanitizeHtml('<p>Ok <strong>forte</strong></p><script>alert(1)</script><a href="javascript:alert(1)">x</a>'),
  '<p>Ok <strong>forte</strong></p><a>x</a>',
);

const postForm = new FormData();
postForm.set('title', 'Networking de Alto Nível');
postForm.set('excerpt', 'Contexto antes de contato.');
postForm.set('content_html', '<h2>Intro</h2><p>Texto</p><iframe src="https://evil.test"></iframe>');
postForm.set('date', '2026-06-11');
postForm.set('author', 'Equipe Masterboard');
postForm.set('category', 'Networking');
postForm.set('tags', 'networking, liderança');
postForm.set('is_published', 'on');

const row = buildPostRowFromForm(postForm, '2026-06-11T18:00:00.000Z');
assert.equal(row.slug, 'networking-de-alto-nivel');
assert.equal(row.content_html, '<h2>Intro</h2><p>Texto</p>');
assert.deepEqual(row.tags, ['networking', 'liderança']);
assert.equal(row.is_published, true);
assert.deepEqual(validatePostRow(row), []);

const settings = settingsRowsToObject([
  { key: 'brand.primaryColor', value: '#111111' },
  { key: 'home.hero.eyebrow', value: 'Curadoria' },
]);

assert.equal(settings.brand.primaryColor, '#111111');
assert.equal(settings.brand.primaryHoverColor, '#C99703');
assert.equal(settings.home.hero.eyebrow, 'Curadoria');

const emptyHeroMeta = settingsRowsToObject([
  { key: 'home.hero.eyebrow', value: '' },
  { key: 'home.hero.pill', value: '' },
  { key: 'home.hero.line3', value: '' },
]);
assert.equal(emptyHeroMeta.home.hero.eyebrow, '');
assert.equal(emptyHeroMeta.home.hero.pill, '');
assert.equal(emptyHeroMeta.home.hero.line3, '');
assert.equal(emptyHeroMeta.home.hero.line1, 'Ecossistema empresarial');
assert.equal(emptyHeroMeta.home.hero.primaryCtaLabel, 'Quero participar');

const legacyHero = settingsRowsToObject([
  { key: 'home.hero.line1', value: 'Dizem que' },
  { key: 'home.hero.line2', value: 'o topo é' },
  { key: 'home.hero.highlight', value: 'solitário.' },
  { key: 'home.hero.eyebrow', value: 'Acesso por curadoria' },
  { key: 'home.hero.pill', value: 'Candidaturas abertas' },
]);
assert.equal(
  isLegacyHeroContent({
    line1: 'Dizem que',
    eyebrow: 'Acesso por curadoria',
    primaryCtaLabel: 'Candidatar-se ao club',
  }),
  true,
);
assert.equal(legacyHero.home.hero.line1, 'Ecossistema empresarial');
assert.equal(legacyHero.home.hero.eyebrow, '');
assert.equal(legacyHero.home.hero.primaryCtaLabel, 'Quero participar');

const settingsForm = new FormData();
settingsForm.set('brand.primaryColor', '#00ffaa');
settingsForm.set('home.hero.eyebrow', 'Novo topo');

const settingRows = buildSettingsRowsFromForm(settingsForm, 'admin@masterboard.com.br', '2026-06-11T18:00:00.000Z');
assert.equal(settingRows.find((item) => item.key === 'brand.primaryColor').value, '#00FFAA');
assert.match(cssVariablesFromSettings(settingsRowsToObject(settingRows)), /--mb-yellow: #00FFAA;/);

console.log('admin-utils: ok');
