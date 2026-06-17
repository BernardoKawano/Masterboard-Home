import assert from 'node:assert/strict';
import {
  formatCnpj,
  mapBrasilApiCnpj,
  normalizeCnpj,
} from '../src/lib/cnpj-lookup.mjs';

assert.equal(normalizeCnpj('12.345.678/0001-95'), '12345678000195');
assert.equal(normalizeCnpj('123'), '');
assert.equal(formatCnpj('12345678000195'), '12.345.678/0001-95');
assert.equal(formatCnpj('invalid'), '');

const mapped = mapBrasilApiCnpj({
  razao_social: 'Empresa LTDA',
  nome_fantasia: 'Empresa',
  municipio: 'Curitiba',
  uf: 'PR',
  descricao_situacao_cadastral: 'ATIVA',
});

assert.ok(mapped);
assert.equal(mapped.empresa, 'Empresa');
assert.equal(mapped.city, 'Curitiba — PR');
assert.equal(mapped.situacaoCadastral, 'ATIVA');
assert.equal(mapBrasilApiCnpj(null), null);

console.log('cnpj-lookup: ok');
