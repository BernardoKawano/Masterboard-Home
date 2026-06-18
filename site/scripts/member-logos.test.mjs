import assert from 'node:assert/strict';
import test from 'node:test';
import { listMemberLogos } from '../src/lib/member-logos.ts';

test('listMemberLogos retorna URLs públicas sem depender de filesystem', () => {
  const logos = listMemberLogos();

  assert.ok(logos.length >= 8);
  assert.ok(logos.every((logo) => logo.src.startsWith('/logos/')));
  assert.ok(logos.some((logo) => logo.name === 'Apex'));
});
