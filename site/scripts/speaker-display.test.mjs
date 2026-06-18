import assert from 'node:assert/strict';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const {
  displaySpeakerRole,
  speakerCompanyFieldLabel,
} = loadTsModuleFromPath('../src/lib/speaker-display.ts');

assert.equal(displaySpeakerRole('Empresa', 'Empresa'), 'CEO');
assert.equal(displaySpeakerRole('Empresa'), 'CEO');
assert.equal(displaySpeakerRole('CEO', 'Empresa'), 'CEO');
assert.equal(displaySpeakerRole(null, 'Marketing'), 'Marketing');
assert.equal(displaySpeakerRole('', ''), 'Líder convidado');

assert.equal(speakerCompanyFieldLabel(0), 'Empresa');
assert.equal(speakerCompanyFieldLabel(1), 'Empresa');
assert.equal(speakerCompanyFieldLabel(2), 'Empresas');

console.log('speaker-display.test.mjs — OK');
