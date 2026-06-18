import assert from 'node:assert/strict';
import test from 'node:test';
import {
  excludeDraftLeads,
  filterDraftLeads,
  filterNewLeads,
} from '../src/lib/admin/lead-query.mjs';

function createMockQuery() {
  const calls = [];
  const chain = {
    calls,
    or(filter) {
      calls.push(['or', filter]);
      return chain;
    },
    not(column, op, value) {
      calls.push(['not', column, op, value]);
      return chain;
    },
    neq(column, value) {
      calls.push(['neq', column, value]);
      return chain;
    },
    eq(column, value) {
      calls.push(['eq', column, value]);
      return chain;
    },
  };
  return chain;
}

test('filterDraftLeads uses notes/name only (no status=draft enum)', () => {
  const q = createMockQuery();
  filterDraftLeads(q);
  assert.deepEqual(q.calls[0], [
    'or',
    'notes.ilike.%"draft":true%,name.eq.(em preenchimento)',
  ]);
});

test('excludeDraftLeads avoids draft enum status', () => {
  const q = createMockQuery();
  excludeDraftLeads(q);
  assert.equal(q.calls.some((c) => c[0] === 'eq' && c[2] === 'draft'), false);
});

test('filterNewLeads combines status new with draft exclusion', () => {
  const q = createMockQuery();
  filterNewLeads(q);
  assert.deepEqual(q.calls[0], ['eq', 'status', 'new']);
  assert.equal(q.calls.some((c) => c[0] === 'not'), true);
});
