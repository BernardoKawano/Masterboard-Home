import assert from 'node:assert/strict';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const { resolveSpeakerCompany } = loadTsModuleFromPath('../src/lib/speaker-company.ts');
const { buildSpeakerPresentation, buildSpeakerBio } = loadTsModuleFromPath('../src/lib/speaker-bio.ts');

const viasoftResolution = resolveSpeakerCompany({ company: 'VIASOFT', role: 'CEO', roleLabel: 'CEO da VIASOFT' });
const viasoftPresentation = buildSpeakerPresentation(
  { name: 'Itamir Viola', roleLabel: 'CEO da VIASOFT', role: 'CEO' },
  viasoftResolution,
);

assert.match(viasoftPresentation, /^Apresenta /);
assert.match(viasoftPresentation, /VIASOFT/);
assert.match(viasoftPresentation, /ERP|agronegócio|software|escala de produto/i);

const wellhubCx = buildSpeakerPresentation(
  { name: 'Juliana Loch', roleLabel: 'CX', role: 'CX' },
  resolveSpeakerCompany({ company: 'Wellhub', role: 'CX', roleLabel: 'CX' }),
);

assert.match(wellhubCx, /experiência do colaborador|bem-estar corporativo/i);
assert.match(wellhubCx, /Wellhub/);

const wellhubTech = buildSpeakerPresentation(
  { name: 'Juliana Loch', roleLabel: 'Tecnologia', role: 'Tecnologia' },
  resolveSpeakerCompany({ company: 'Wellhub', role: 'Tecnologia', roleLabel: 'Tecnologia' }),
);

assert.notEqual(wellhubCx, wellhubTech);

const noCompany = buildSpeakerPresentation(
  { name: 'Allan Barros', roleLabel: 'CEO', role: 'CEO' },
  resolveSpeakerCompany({ roleLabel: 'CEO', role: 'CEO' }),
);

assert.match(noCompany, /^Apresenta /);
assert.doesNotMatch(noCompany, /\bna [A-Z]/);

const withTopics = buildSpeakerPresentation(
  { name: 'Teste', roleLabel: 'Marketing', topics: ['Growth', 'Branding'] },
  resolveSpeakerCompany({ company: 'Heineken', role: 'Diretor de Marketing', roleLabel: 'Diretor de Marketing' }),
);

assert.match(withTopics, /growth e branding/i);

const legacyBio = buildSpeakerBio(
  { name: 'Teste', bio: 'Bio customizada legada sem prefixo Apresenta.' },
  { confidence: 'nenhuma', source: 'needs_manual_review', evidence: '' },
);

assert.equal(legacyBio, 'Bio customizada legada sem prefixo Apresenta.');

console.log('speaker-bio.test.mjs: all assertions passed');
