import assert from 'node:assert/strict';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const {
  getMemberCompanyScore,
  sortMembersByCompanyPrestige,
  MEMBER_PROFILE_VISIBLE_COUNT,
} = loadTsModuleFromPath('../src/lib/member-company-score.ts');

assert.equal(MEMBER_PROFILE_VISIBLE_COUNT, 15);

assert.ok(getMemberCompanyScore('VIASOFT', 'CEO') > getMemberCompanyScore('Empresa Local', 'CEO'));
assert.ok(getMemberCompanyScore('Ford Barigui', 'Diretor') > getMemberCompanyScore('VIASOFT', 'Analista'));
assert.ok(getMemberCompanyScore('Microsoft', 'Executivo') > getMemberCompanyScore('Driva', 'CEO'));

const sorted = sortMembersByCompanyPrestige([
  { name: 'Zeta', company: 'Empresa Local', role: 'CEO' },
  { name: 'Alpha', company: 'VIASOFT', role: 'CEO' },
  { name: 'Beta', company: 'Ford Barigui', role: 'Diretor' },
]);

assert.equal(sorted[0].company, 'Ford Barigui');
assert.equal(sorted[1].company, 'VIASOFT');

console.log('member-company-score.test.mjs: all assertions passed');
