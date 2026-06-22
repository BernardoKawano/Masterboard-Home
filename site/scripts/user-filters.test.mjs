import assert from 'node:assert/strict';
import { mapBubbleAppUser } from '../src/lib/admin/bubble-users.mjs';
import {
  applyUserFilters,
  buildUserFilterOptions,
  countActiveUserFilters,
  parseUserFilters,
  toRenewalMonth,
} from '../src/lib/admin/user-filters.mjs';

const users = [
  mapBubbleAppUser({
    _id: '1',
    'Pessoal - Nome': 'Ana Costa',
    'Geral - Tipo': 'Convidado',
    'Geral - Tier': 'Club',
    'Pessoal - Cargo': 'CEO',
    'Geral - Data renovacao': '2026-06-19T12:00:00.000Z',
    'Empresa - Faturamento': 'De R$2 milhões a R$3 milhões ao ano',
    'Empresa - Tamanho': '6 a 20 colaboradores',
    'Admin - Status': 'Lead (qualificado/convidado)',
    'Admin - Qualificacao': 'Qualificado por perfil',
    'Admin - Account': 'Eduardo Vieira',
    'Eventos convidado': ['Evento A'],
    'Eventos confirmado': ['Evento B'],
    authentication: { email: { email: 'ana@empresa.com' } },
  }),
  mapBubbleAppUser({
    _id: '2',
    'Pessoal - Nome': 'Bruno Lima',
    'Geral - Tipo': 'Membro',
    'Geral - Tier': 'Free',
    'Pessoal - Cargo': 'Diretor',
    'Admin - Status': 'Membro (individual)',
    authentication: { email: { email: 'bruno@empresa.com' } },
  }),
];

assert.equal(toRenewalMonth('2026-06-19T12:00:00.000Z'), '06/2026');

const filters = parseUserFilters({ tipo: 'Convidado', tier: 'Club' });
assert.equal(countActiveUserFilters(filters), 2);

const filtered = applyUserFilters(users, filters);
assert.equal(filtered.length, 1);
assert.equal(filtered[0].name, 'Ana Costa');

const options = buildUserFilterOptions(users);
assert.ok(options.tipo.includes('Convidado'));
assert.ok(options.tier.includes('Club'));
assert.ok(options.eventoConvidado.includes('Evento A'));

console.log('user-filters.test.mjs — OK');
