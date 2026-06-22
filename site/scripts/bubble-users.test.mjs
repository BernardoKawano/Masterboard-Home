import assert from 'node:assert/strict';
import {
  filterAppUsers,
  formatBubbleDateTime,
  getBubbleUserEmail,
  mapBubbleAppUser,
  normalizeUserSearchTerm,
  toAppUserListItem,
} from '../src/lib/admin/bubble-users.mjs';

const sampleUser = {
  _id: '123456789012x345678901',
  user_signed_up: true,
  'Created Date': '2026-06-19T15:30:00.000Z',
  'Pessoal - Nome': 'Abel Rodrigues',
  'Pessoal - Whatsapp': '44 988584000',
  'Pessoal - Cargo': 'Sócio-fundador',
  'Empresa - Nome': 'Studio Fiw a Fiw',
  'Empresa - Tamanho': '6 a 20 colaboradores',
  'Empresa - Faturamento': 'De R$2 milhões a R$3 milhões ao ano',
  'Rede - Instagram': 'https://www.instagram.com/studio_fiw_a_fiw_maringa/',
  'Geral - Tier': 'Free',
  'Geral - Tipo': 'Convidado',
  'Admin - Status': 'Lead (qualificado/convidado)',
  'Admin - Qualificacao': 'Qualificado por perfil',
  authentication: {
    email: { email: 'abelrodrigues@gmail.com' },
  },
};

assert.equal(getBubbleUserEmail(sampleUser), 'abelrodrigues@gmail.com');

const mapped = mapBubbleAppUser(sampleUser);
assert.equal(mapped.name, 'Abel Rodrigues');
assert.equal(mapped.email, 'abelrodrigues@gmail.com');
assert.equal(mapped.companyName, 'Studio Fiw a Fiw');
assert.equal(mapped.tier, 'Free');

const listItem = toAppUserListItem(mapped);
assert.equal(listItem.name, 'Abel Rodrigues');
assert.match(listItem.registeredAtLabel, /19\/06\/2026/);

assert.equal(normalizeUserSearchTerm('  abel  '), 'abel');
assert.equal(filterAppUsers([mapped], 'abel').length, 1);
assert.equal(filterAppUsers([mapped], 'fiw').length, 1);
assert.equal(formatBubbleDateTime(''), '—');

console.log('bubble-users.test.mjs — OK');
