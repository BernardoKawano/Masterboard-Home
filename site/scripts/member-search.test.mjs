import assert from 'node:assert/strict';
import {
  buildMemberSearchFilter,
  escapeIlikePattern,
  filterMembersLocally,
  mapAdminMemberRow,
  normalizeMemberSearchTerm,
} from '../src/lib/admin/member-search.mjs';

assert.equal(normalizeMemberSearchTerm('  Ana, Silva  '), 'Ana Silva');
assert.equal(normalizeMemberSearchTerm('test(1)'), 'test 1');
assert.equal(escapeIlikePattern('100%_ok'), '100\\%\\_ok');

const filter = buildMemberSearchFilter('Ana Silva');
assert.ok(filter?.includes('name.ilike.%Ana Silva%'));
assert.ok(filter?.includes('email.ilike.%Ana Silva%'));
assert.equal(buildMemberSearchFilter('a'), null);

const mapped = mapAdminMemberRow({
  id: 'uuid-1',
  name: 'Ana Costa',
  email: 'ana@empresa.com',
  phone: '+5511999999999',
  company_name: 'Empresa X',
  role: 'CEO',
  city: 'São Paulo',
  photo_url: 'https://cdn.example.com/ana.jpg',
  linkedin_url: 'https://linkedin.com/in/ana',
  tier: 'vip',
  status: 'active',
  joined_at: '2024-03-01',
  companies: { name: 'Empresa X', logo_url: 'https://cdn.example.com/logo.png' },
});

assert.equal(mapped.name, 'Ana Costa');
assert.equal(mapped.company, 'Empresa X');
assert.equal(mapped.tier, 'vip');

const sample = [
  mapped,
  mapAdminMemberRow({
    id: 'uuid-2',
    name: 'Bruno Lima',
    email: 'bruno@outra.com',
    company_name: 'Outra Co',
    role: 'Diretor',
    tier: 'member',
    status: 'active',
  }),
];

assert.equal(filterMembersLocally(sample, 'ana').length, 1);
assert.equal(filterMembersLocally(sample, 'outra').length, 1);
assert.equal(filterMembersLocally(sample, 'x').length, 2);

console.log('member-search.test.mjs — OK');
