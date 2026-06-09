import assert from 'node:assert/strict';
import {
  getFirstRelationValue,
  isLikelyTechnicalId,
  normalizeImageUrl,
  normalizeLookupKey,
  resolveMemberCompany,
} from './member-import-utils.mjs';

assert.equal(normalizeImageUrl('//cdn.bubble.io/avatar.jpg'), 'https://cdn.bubble.io/avatar.jpg');
assert.equal(normalizeImageUrl(' https://example.com/avatar.jpg '), 'https://example.com/avatar.jpg');
assert.equal(normalizeImageUrl(''), null);

assert.equal(normalizeLookupKey('  São João Ltda  '), 'sao joao ltda');
assert.equal(normalizeLookupKey('ACME S.A.'), 'acme sa');
assert.equal(normalizeLookupKey(''), null);

assert.equal(getFirstRelationValue(['company_123', 'company_456']), 'company_123');
assert.equal(getFirstRelationValue('company_123'), 'company_123');
assert.equal(getFirstRelationValue([]), null);

assert.equal(isLikelyTechnicalId('1693949023027x680087502111111111'), true);
assert.equal(isLikelyTechnicalId('507f1f77bcf86cd799439011'), true);
assert.equal(isLikelyTechnicalId('ACME S.A.'), false);

const companyIdBySourceId = new Map([['bubble_company_id', 'supabase-company-id']]);
const companyIdByName = new Map([['acme sa', 'supabase-acme-id']]);

assert.deepEqual(
  resolveMemberCompany('bubble_company_id', companyIdBySourceId, companyIdByName),
  { companyId: 'supabase-company-id', companyName: null },
);

assert.deepEqual(
  resolveMemberCompany('ACME S.A.', companyIdBySourceId, companyIdByName),
  { companyId: 'supabase-acme-id', companyName: null },
);

assert.deepEqual(
  resolveMemberCompany('Empresa Nova', companyIdBySourceId, companyIdByName),
  { companyId: null, companyName: 'Empresa Nova' },
);

assert.deepEqual(
  resolveMemberCompany('1693949023027x680087502111111111', companyIdBySourceId, companyIdByName),
  { companyId: null, companyName: null },
);

assert.deepEqual(
  resolveMemberCompany({ _id: 'bubble_company_id', Nome_Empresa: 'ACME S.A.' }, companyIdBySourceId, companyIdByName),
  { companyId: 'supabase-company-id', companyName: 'ACME S.A.' },
);

console.log('member-import-utils: ok');
