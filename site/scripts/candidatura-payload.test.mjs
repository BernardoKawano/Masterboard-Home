import assert from 'node:assert/strict';
import {
  buildCandidaturaPayload,
  priorityFromScore,
  scoreLead,
  toLegacyLeadRow,
  toLeadRow,
  validateCandidaturaPayload,
} from '../src/lib/candidatura-payload.mjs';

const data = new FormData();
data.set('email', ' lider@empresa.com ');
data.set('nome', 'Ana Lider');
data.set('codigo_pais', '+55');
data.set('whatsapp', '11 99999-9999');
data.set('empresa', 'Empresa Forte');
data.set('cargo', 'Presidente ou CEO');
data.set('faturamento', 'De R$10 a R$50 milhões ao ano');
data.set('colaboradores', 'De 101 a 1.000 colaboradores');
data.set('objetivo', 'Entrar em uma sala com pares certos');
data.set('momento', 'Crescimento acelerado');
data.set('lgpd', 'on');

const payload = buildCandidaturaPayload(data, {
  source: 'test',
  referrer: 'https://masterboard.com.br/',
  timestamp: '2026-06-10T12:00:00.000Z',
});

assert.deepEqual(validateCandidaturaPayload(payload), []);
assert.equal(payload.email, 'lider@empresa.com');
assert.equal(payload.telefone, '+55 11 99999-9999');
assert.equal(payload.codigoPais, '+55');
assert.equal(payload.whatsapp, '11 99999-9999');
assert.equal(payload.intencao, 'membro');

const row = toLeadRow(payload);
assert.equal(row.name, 'Ana Lider');
assert.equal(row.email, 'lider@empresa.com');
assert.equal(row.company, 'Empresa Forte');
assert.equal(row.role, 'Presidente ou CEO');
assert.equal(row.lgpd_consent, true);
assert.equal(row.source, 'test');
assert.equal(row.intent, 'membro');
assert.equal(row.annual_revenue, 'De R$10 a R$50 milhões ao ano');
assert.equal(row.employee_count, 'De 101 a 1.000 colaboradores');
assert.equal(row.country_code, '+55');
assert.equal(row.whatsapp, '11 99999-9999');
assert.equal(row.priority, 'high');
assert.equal(row.score, scoreLead(payload));
assert.equal(priorityFromScore(row.score), 'high');

const legacyRow = toLegacyLeadRow(payload);
assert.equal('annual_revenue' in legacyRow, false);
assert.equal(legacyRow.phone, '+55 11 99999-9999');

const notes = JSON.parse(row.notes);
assert.equal(notes.faturamento, 'De R$10 a R$50 milhões ao ano');
assert.equal(notes.colaboradores, 'De 101 a 1.000 colaboradores');
assert.equal(notes.codigo_pais, '+55');
assert.equal(notes.whatsapp, '11 99999-9999');
assert.equal(notes.objetivo, 'Entrar em uma sala com pares certos');
assert.equal(notes.priority, 'high');

const incomplete = new FormData();
incomplete.set('email', 'lead@empresa.com');
const missing = validateCandidaturaPayload(buildCandidaturaPayload(incomplete));
assert.deepEqual(missing, ['nome', 'telefone', 'empresa', 'cargo', 'faturamento', 'colaboradores', 'lgpd']);

console.log('candidatura-payload: ok');
