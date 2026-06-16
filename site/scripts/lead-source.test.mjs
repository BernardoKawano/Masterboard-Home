import assert from 'node:assert/strict';
import {
  LEAD_SOURCE,
  formatLeadSourceLabel,
  getLeadBrandLabel,
  leadSourceFilterValues,
  parseLeadSource,
} from '../src/lib/lead-source.mjs';

assert.equal(LEAD_SOURCE.MASTERBOARD_SITE_CANDIDATURA, 'masterboard:site:candidatura');
assert.equal(LEAD_SOURCE.SCALE_SITE_CANDIDATURA, 'scale:site:candidatura');

const masterboard = parseLeadSource(LEAD_SOURCE.MASTERBOARD_SITE_CANDIDATURA);
assert.equal(masterboard.brand, 'masterboard');
assert.equal(masterboard.channel, 'site');
assert.equal(masterboard.detail, 'candidatura');

const scale = parseLeadSource(LEAD_SOURCE.SCALE_SITE_CANDIDATURA);
assert.equal(scale.brand, 'scale');

const legacy = parseLeadSource('candidatura-page');
assert.equal(legacy.brand, 'masterboard');
assert.equal(legacy.channel, 'site');

assert.equal(
  formatLeadSourceLabel(masterboard),
  'Masterboard · Site · candidatura',
);
assert.equal(getLeadBrandLabel('scale'), 'Scale');
assert.ok(leadSourceFilterValues('masterboard')?.supabaseOr.includes('masterboard:%'));
assert.ok(leadSourceFilterValues('scale')?.supabaseOr.includes('scale:%'));
assert.equal(leadSourceFilterValues('all'), null);

console.log('lead-source: ok');
