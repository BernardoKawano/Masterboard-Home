import assert from 'node:assert/strict';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const {
  getMemberCompanyScore,
  sortMembersByCompanyPrestige,
  pickMembersWithUniqueCompanies,
  getMemberCompanyKey,
  MEMBER_PROFILE_VISIBLE_COUNT,
} = loadTsModuleFromPath('../src/lib/member-company-score.ts');

const {
  isUsableMemberPhotoUrl,
  resolveMemberPhoto,
} = loadTsModuleFromPath('../src/lib/member-photo.ts');

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

assert.equal(getMemberCompanyKey('Artesian Móveis / Roca'), getMemberCompanyKey('Artesian Móveis'));

const unique = pickMembersWithUniqueCompanies([
  { name: 'A', company: 'Artesian Móveis', role: 'CEO' },
  { name: 'B', company: 'Artesian Móveis', role: 'Diretor' },
  { name: 'C', company: 'VIASOFT', role: 'CEO' },
  { name: 'D', company: 'Ford Barigui', role: 'Presidente' },
], 3);

assert.equal(unique.length, 3);
assert.equal(unique.filter((member) => /artesian/i.test(member.company)).length, 1);

assert.equal(isUsableMemberPhotoUrl('https://cdn/logo-artesian.png'), false);
assert.equal(isUsableMemberPhotoUrl('https://cdn/foto-perfil.jpg'), true);

const resolved = resolveMemberPhoto(
  { name: 'Thiago Krauze', photo: 'https://cdn/logo.png' },
  [{ name: 'Thiago Krauze', photo: 'https://cdn/thiago-krauze.jpg' }],
);
assert.equal(resolved, 'https://cdn/thiago-krauze.jpg');

console.log('member-company-score.test.mjs: all assertions passed');
