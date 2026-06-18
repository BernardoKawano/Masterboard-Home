import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerSupabaseClient } from '../src/lib/supabase-client.ts';

test('createServerSupabaseClient inicializa sem erro em Node sem WebSocket nativo', () => {
  const client = createServerSupabaseClient(
    '\uFEFFhttps://example.supabase.co',
    'service-role-key',
  );

  assert.equal(typeof client.from, 'function');
});

test('normalizeEnvValue remove BOM e espaços', async () => {
  const { normalizeEnvValue } = await import('../src/lib/supabase-client.ts');
  assert.equal(normalizeEnvValue('\uFEFF https://example.supabase.co '), 'https://example.supabase.co');
});
