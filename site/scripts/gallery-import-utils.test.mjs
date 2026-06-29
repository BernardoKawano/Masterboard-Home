import assert from 'node:assert/strict';
import {
  buildGalleryImportPlan,
  extractBubbleSourceId,
  gallerySlugFromName,
  mapCsvRowToPhotoInput,
  normalizeImageUrl,
  parseBubbleDate,
  parseCsv,
  parseGalleryName,
  parseImportArgs,
  photoSortOrderFromName,
  safePathPart,
} from './gallery-import-utils.mjs';

assert.equal(normalizeImageUrl('//cdn.bubble.io/foto.jpg'), 'https://cdn.bubble.io/foto.jpg');
assert.equal(normalizeImageUrl(''), null);

assert.deepEqual(parseGalleryName('15. 28/02 - Salesforce'), {
  sort_order: 15,
  name: '15. 28/02 - Salesforce',
  label: '28/02 - Salesforce',
});
assert.deepEqual(parseGalleryName('Master Trip SP'), {
  sort_order: null,
  name: 'Master Trip SP',
  label: 'Master Trip SP',
});

assert.equal(gallerySlugFromName('15. 28/02 - Salesforce'), '15-28-02-salesforce');
assert.equal(safePathPart('Governança'), 'governanca');

assert.equal(
  extractBubbleSourceId(
    '//e805637ac65a1659bd0227815d260bd1.cdn.bubble.io/f1772651568048x214717044967852380/Foto5000.jpg',
  ),
  'f1772651568048x214717044967852380',
);

assert.equal(photoSortOrderFromName('Foto5000.jpg'), 5000);
assert.equal(photoSortOrderFromName('sem-numero', 4), 5);

const isoDate = parseBubbleDate('Mar 4, 2026 4:23 pm');
assert.ok(isoDate?.startsWith('2026-03-04'));

const csv = `"Arquivo","Galeria","Nome","Creation Date","Modified Date","Slug","Creator"
"//cdn.bubble.io/f1x1/Foto1.jpg","15. 28/02 - Salesforce","Foto1.jpg","Mar 4, 2026 4:23 pm","Mar 4, 2026 4:23 pm","","bruna@masterboard.com.br"
"//cdn.bubble.io/f2x2/Foto2.jpg","15. 28/02 - Salesforce","Foto2.jpg","Mar 4, 2026 4:24 pm","Mar 4, 2026 4:24 pm","","bruna@masterboard.com.br"`;

const rows = parseCsv(csv);
assert.equal(rows.length, 2);
assert.equal(rows[0].Galeria, '15. 28/02 - Salesforce');

const mapped = mapCsvRowToPhotoInput(rows[0]);
assert.equal(mapped.valid, true);
assert.equal(mapped.gallerySlug, '15-28-02-salesforce');
assert.equal(mapped.sourceId, 'f1x1');

const plan = buildGalleryImportPlan(rows, '2026-06-23T12:00:00.000Z');
assert.equal(plan.galleries.length, 1);
assert.equal(plan.photos.length, 2);
assert.equal(plan.skipped.length, 0);
assert.equal(plan.galleries[0].sort_order, 15);
assert.equal(plan.photos[0].file_url, 'https://cdn.bubble.io/f1x1/Foto1.jpg');
assert.equal(plan.photos[0].source_id, 'f1x1');

assert.deepEqual(parseImportArgs([]), {
  execute: false,
  csvPath: null,
  limit: Number.POSITIVE_INFINITY,
  batchSize: 200,
});

assert.equal(mapCsvRowToPhotoInput({ Galeria: '', Arquivo: '' }).valid, false);

console.log('gallery-import-utils.test.mjs: ok');
