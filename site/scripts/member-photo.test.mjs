import assert from 'node:assert/strict';
import { loadTsModuleFromPath } from './load-ts-bundle.mjs';

const {
  isUsableMemberPhotoUrl,
  resolveMemberPhoto,
  normalizePersonNameKey,
} = loadTsModuleFromPath('../src/lib/member-photo.ts');

assert.equal(isUsableMemberPhotoUrl(null), false);
assert.equal(isUsableMemberPhotoUrl('https://cdn.example.com/perfil.jpg'), true);
assert.equal(isUsableMemberPhotoUrl('https://cdn.example.com/logo-marca.png'), false);
assert.equal(
  isUsableMemberPhotoUrl(
    'https://cdn.example.com/foto.jpg',
    'https://cdn.example.com/foto.jpg',
  ),
  false,
);

assert.equal(
  resolveMemberPhoto(
    { name: 'Maria Silva', photo: 'https://cdn.example.com/logo.png' },
    [{ name: 'Maria Silva', photo: 'https://cdn.example.com/maria.jpg' }],
  ),
  'https://cdn.example.com/maria.jpg',
);

assert.equal(
  resolveMemberPhoto(
    {
      name: 'Rafael Magosso',
      photo: 'https://cdn.example.com/rafael.png',
      companyLogo: null,
    },
    [{
      name: 'Rafael Magosso',
      photo: 'https://cdn.example.com/Captura%20de%20Tela%202026.png',
    }],
  ),
  'https://cdn.example.com/rafael.png',
);

assert.equal(normalizePersonNameKey('João da Silva'), normalizePersonNameKey('Joao da Silva'));

console.log('member-photo.test.mjs — OK');
