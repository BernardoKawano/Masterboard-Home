import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const sourcePath = new URL('../src/lib/speaker-role.ts', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const sandbox = { exports: {} };

runInNewContext(outputText, sandbox, { filename: 'speaker-role.js' });

const { parseRoleLabel } = sandbox.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const assertParsed = (label, expected) => {
  assert.deepEqual(plain(parseRoleLabel(label)), expected);
};

assertParsed('CEO da VIASOFT', { role: 'CEO', company: 'VIASOFT' });
assertParsed('CEO RP Trader', { role: 'CEO', company: 'RP Trader' });
assertParsed('CEO Driva', { role: 'CEO', company: 'Driva' });
assertParsed('Founder: Cultura na Prática', { role: 'Founder', company: 'Cultura na Prática' });
assertParsed('Founder +1 Café', { role: 'Founder', company: '+1 Café' });
assertParsed('Sócia IVS Franquias', { role: 'Sócia', company: 'IVS Franquias' });

assertParsed('CMO e CCO', { role: 'CMO e CCO' });
assertParsed('Diretor de Marketing', { role: 'Diretor de Marketing' });
assertParsed('Diretor Comercial', { role: 'Diretor Comercial' });
assertParsed('Diretor comercial e sócio', { role: 'Diretor comercial e sócio' });
assertParsed('Presidente Executivo', { role: 'Presidente Executivo' });
assertParsed('Vice-presidente', { role: 'Vice-presidente' });

console.log('speaker parser tests passed');
