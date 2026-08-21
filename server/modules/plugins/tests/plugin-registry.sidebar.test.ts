import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSidebar, validateManifest } from '../plugin-registry.service.js';

const manifest = (overrides: Record<string, unknown> = {}) => ({
  name: 'demo',
  displayName: 'Demo Plugin',
  entry: 'build/client/index.js',
  icon: 'icon.svg',
  ...overrides,
});

test('a manifest without a sidebar object stays valid', () => {
  assert.deepEqual(validateManifest(manifest()), { valid: true });
  assert.equal(normalizeSidebar(undefined, manifest()), null);
  assert.equal(normalizeSidebar(null, manifest()), null);
});

test('a well-formed sidebar object is accepted', () => {
  const result = validateManifest(manifest({
    sidebar: { label: 'Notes', icon: 'ListTodo', order: 50, replacesTab: true },
  }));

  assert.deepEqual(result, { valid: true });
});

test('a malformed sidebar object is rejected with a reason', () => {
  const rejected = [
    { sidebar: 'Notes' },
    { sidebar: [] },
    { sidebar: { label: '' } },
    { sidebar: { label: 'x'.repeat(25) } },
    { sidebar: { order: 'first' } },
    { sidebar: { order: Number.POSITIVE_INFINITY } },
    { sidebar: { icon: 42 } },
    { sidebar: { replacesTab: 'yes' } },
  ];

  for (const overrides of rejected) {
    const result = validateManifest(manifest(overrides));
    assert.equal(result.valid, false, `${JSON.stringify(overrides)} must be rejected`);
    assert.match(String(result.error), /[Ss]idebar/);
  }
});

test('normalizeSidebar fills in defaults from the manifest', () => {
  assert.deepEqual(normalizeSidebar({}, manifest()), {
    label: 'Demo Plugin',
    icon: 'icon.svg',
    order: 500,
    replacesTab: false,
  });

  assert.deepEqual(normalizeSidebar({ label: 'Notes', order: 50, replacesTab: true }, manifest()), {
    label: 'Notes',
    icon: 'icon.svg',
    order: 50,
    replacesTab: true,
  });

  // No icon anywhere falls back to the generic plugin icon.
  assert.equal(normalizeSidebar({}, manifest({ icon: undefined }))?.icon, 'Puzzle');
});
