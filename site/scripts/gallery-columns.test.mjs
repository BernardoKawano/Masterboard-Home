import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const sourcePath = new URL('../src/lib/gallery-columns.ts', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const sandbox = { exports: {}, URL };
runInNewContext(outputText, sandbox, { filename: 'gallery-columns.js' });

const { buildGalleryColumns, buildGalleryImagePaths } = sandbox.exports;

const paths = buildGalleryImagePaths(15);

assert.equal(paths.length, 15);
assert.equal(paths[0], '/gallery/01.jpg');
assert.equal(paths[14], '/gallery/15.jpg');

const columns = buildGalleryColumns(paths, 4);

assert.equal(columns.length, 4);
assert.equal(columns[0].length, 8);
assert.equal(columns[0].join(','), '/gallery/01.jpg,/gallery/02.jpg,/gallery/03.jpg,/gallery/04.jpg,/gallery/01.jpg,/gallery/02.jpg,/gallery/03.jpg,/gallery/04.jpg');
assert.equal(columns[3].join(','), '/gallery/13.jpg,/gallery/14.jpg,/gallery/15.jpg,/gallery/13.jpg,/gallery/14.jpg,/gallery/15.jpg');

const emptyColumns = buildGalleryColumns([], 4);
assert.equal(emptyColumns.length, 4);
assert.equal(emptyColumns[0].length, 0);

try {
  buildGalleryColumns(paths, 0);
  assert.fail('expected error for columnCount < 1');
} catch (error) {
  assert.match(String(error), /columnCount must be at least 1/);
}

console.log('gallery-columns.test.mjs: all assertions passed');
