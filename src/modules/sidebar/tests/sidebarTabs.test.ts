import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  BUILT_IN_SIDEBAR_ORDER,
  parseSidebarTab,
  pluginSidebarChips,
  showsSearchTools,
  sidebarTabKey,
} from '@/modules/sidebar/utils/sidebarTabs';

const plugin = (overrides: Record<string, unknown> = {}) => ({
  name: 'demo',
  displayName: 'Demo Plugin',
  enabled: true,
  sidebar: null,
  ...overrides,
}) as Parameters<typeof pluginSidebarChips>[0][number];

test('a plugin with a low order sits left of Projects', () => {
  const chips = pluginSidebarChips([
    plugin({ name: 'early', sidebar: { label: 'Notes', icon: 'i.svg', order: 50, replacesTab: true } }),
    plugin({ name: 'late', sidebar: { label: 'Notes', icon: 'i.svg', order: 900, replacesTab: false } }),
  ]);

  assert.deepEqual(chips.map((chip) => chip.name), ['early', 'late']);
  assert.ok(chips[0].order < BUILT_IN_SIDEBAR_ORDER.projects);
  assert.ok(chips[1].order > BUILT_IN_SIDEBAR_ORDER.archived);
});

test('only enabled plugins that declared a sidebar produce a chip', () => {
  const chips = pluginSidebarChips([
    plugin({ name: 'no-sidebar' }),
    plugin({ name: 'disabled', enabled: false, sidebar: { label: 'X', icon: 'i.svg', order: 10, replacesTab: false } }),
    plugin({ name: 'shown', sidebar: { label: 'Shown', icon: 'i.svg', order: 10, replacesTab: false } }),
  ]);

  assert.deepEqual(chips.map((chip) => chip.name), ['shown']);
});

test('the persisted tab is restored, and a vanished plugin falls back to projects', () => {
  assert.deepEqual(parseSidebarTab('plugin:demo', ['demo']), { kind: 'plugin', name: 'demo' });
  assert.deepEqual(parseSidebarTab('plugin:gone', ['demo']), { kind: 'builtin', mode: 'projects' });
  assert.deepEqual(parseSidebarTab('archived', []), { kind: 'builtin', mode: 'archived' });
  assert.deepEqual(parseSidebarTab('nonsense', []), { kind: 'builtin', mode: 'projects' });
  assert.deepEqual(parseSidebarTab(null, []), { kind: 'builtin', mode: 'projects' });

  assert.equal(sidebarTabKey({ kind: 'plugin', name: 'demo' }), 'plugin:demo');
  assert.equal(sidebarTabKey({ kind: 'builtin', mode: 'running' }), 'running');
});

test('the search box belongs to the built-in sections only', () => {
  assert.equal(showsSearchTools({ kind: 'builtin', mode: 'projects' }), true);
  assert.equal(showsSearchTools({ kind: 'plugin', name: 'demo' }), false);
});

test('a host with no sidebar plugins produces no chips at all', () => {
  assert.deepEqual(pluginSidebarChips([]), []);
  assert.deepEqual(pluginSidebarChips([plugin(), plugin({ name: 'other' })]), []);
});
