import assert from 'node:assert/strict';
import {
  buildStoragePath,
  extensionFromContentType,
  extensionFromUrl,
  getSelectedTargets,
  isSupabaseStorageUrl,
  normalizeImageUrl,
  parseArgs,
  parseEnvLine,
  safePathPart,
  shouldMigrateImageUrl,
} from './migrate-media-to-storage.mjs';

assert.deepEqual(parseArgs([]), {
  execute: false,
  target: 'all',
  limit: Number.POSITIVE_INFINITY,
  bucket: 'site-media',
});

assert.deepEqual(parseArgs(['--execute', '--target=events.cover_image_url', '--limit=12', '--bucket=media']), {
  execute: true,
  target: 'events.cover_image_url',
  limit: 12,
  bucket: 'media',
});

assert.deepEqual(parseEnvLine(' SUPABASE_URL="https://example.supabase.co" '), [
  'SUPABASE_URL',
  'https://example.supabase.co',
]);
assert.equal(parseEnvLine('# ignored'), null);
assert.equal(parseEnvLine('invalid'), null);

assert.equal(normalizeImageUrl('//cdn.bubble.io/image.png'), 'https://cdn.bubble.io/image.png');
assert.equal(normalizeImageUrl('  https://example.com/a.jpg  '), 'https://example.com/a.jpg');
assert.equal(normalizeImageUrl(''), null);

assert.equal(
  isSupabaseStorageUrl('https://example.supabase.co/storage/v1/object/public/site-media/a.jpg'),
  true,
);
assert.equal(shouldMigrateImageUrl('https://cdn.bubble.io/a.jpg'), true);
assert.equal(shouldMigrateImageUrl('https://example.supabase.co/storage/v1/object/public/site-media/a.jpg'), false);
assert.equal(shouldMigrateImageUrl('/images/local.webp'), false);

assert.equal(extensionFromUrl('https://cdn.example.com/photo.jpeg?x=1'), '.jpg');
assert.equal(extensionFromUrl('https://cdn.example.com/vector.svg'), '.svg');
assert.equal(extensionFromUrl('https://cdn.example.com/no-extension'), '.jpg');

assert.equal(extensionFromContentType('image/avif'), '.avif');
assert.equal(extensionFromContentType('image/jpeg; charset=binary'), '.jpg');
assert.equal(extensionFromContentType('text/html'), null);

assert.equal(safePathPart('Imersão & Conselho São Paulo #101'), 'imersao-conselho-sao-paulo-101');

const [eventTarget] = getSelectedTargets('events.cover_image_url');
assert.equal(eventTarget.table, 'events');
assert.equal(getSelectedTargets('speakers').length, 2);
assert.throws(() => getSelectedTargets('unknown'), /Target desconhecido/);

assert.equal(
  buildStoragePath(
    eventTarget,
    {
      id: 'e25031c1-a203-459c-a446-500a31d2d650',
      source_id: '1747586388589x561294425581982600',
      title: 'Master #101: Jantar de CEOs',
    },
    'https://cdn.example.com/event.png',
    'image/webp',
  ),
  'events/covers/master-101-jantar-de-ceos-1747586388589x561294425581982600.webp',
);

console.log('migrate-media-to-storage: ok');
