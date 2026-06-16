import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const sourcePath = new URL('../src/lib/responsive-image.ts', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const sandbox = { exports: {}, URL };
runInNewContext(outputText, sandbox, { filename: 'responsive-image.js' });

const { getResponsiveImageAttrs, getSupabaseStorageImageUrl } = sandbox.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));

const publicUrl = 'https://example.supabase.co/storage/v1/object/public/event-covers/master-101.jpg';
const transformed = getSupabaseStorageImageUrl(publicUrl, 640, 70);

assert.equal(
  transformed,
  'https://example.supabase.co/storage/v1/render/image/public/event-covers/master-101.jpg?width=640&quality=70',
);

const attrs = getResponsiveImageAttrs(publicUrl, {
  widths: [640, 320, 640],
  sizes: '(min-width: 1024px) 33vw, 100vw',
  quality: 72,
});

assert.equal(
  attrs.src,
  'https://example.supabase.co/storage/v1/render/image/public/event-covers/master-101.jpg?width=640&quality=72',
);
assert.equal(attrs.sizes, '(min-width: 1024px) 33vw, 100vw');
assert.equal(
  attrs.srcset,
  [
    'https://example.supabase.co/storage/v1/render/image/public/event-covers/master-101.jpg?width=320&quality=72 320w',
    'https://example.supabase.co/storage/v1/render/image/public/event-covers/master-101.jpg?width=640&quality=72 640w',
  ].join(', '),
);

const existingRenderUrl = 'https://example.supabase.co/storage/v1/render/image/public/members/ana.webp?width=300';
assert.equal(
  getSupabaseStorageImageUrl(existingRenderUrl, 160),
  'https://example.supabase.co/storage/v1/render/image/public/members/ana.webp?width=160&quality=76',
);

assert.deepEqual(
  plain(getResponsiveImageAttrs('https://cdn.bubble.io/fake-image.jpg', { widths: [320, 640] })),
  { src: 'https://cdn.bubble.io/fake-image.jpg' },
);

console.log('responsive-image: ok');
