import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUILT_IN_SIDEBAR_ORDER,
  describePluginSurfaces,
  parseSidebarTab,
  pluginSidebarChips,
  pluginsShownAsTabs,
  showsSearchTools,
  sidebarTabKey,
} from './sidebarTabs';

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

test('replacesTab removes the plugin from the main-area tabs', () => {
  const plugins = [
    plugin({ name: 'in-tabs', sidebar: { label: 'A', icon: 'i.svg', order: 10, replacesTab: false } }),
    plugin({ name: 'sidebar-only', sidebar: { label: 'B', icon: 'i.svg', order: 20, replacesTab: true } }),
    plugin({ name: 'plain' }),
  ];

  assert.deepEqual(pluginsShownAsTabs(plugins).map((p) => p.name), ['in-tabs', 'plain']);
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

test('the settings list names the surfaces a plugin occupies', () => {
  const surfaces = (overrides: Record<string, unknown>) => describePluginSurfaces({ ...plugin(overrides), slot: 'tab' });

  assert.equal(surfaces({}), 'Tab');
  assert.equal(surfaces({ sidebar: { label: 'A', icon: 'i.svg', order: 10, replacesTab: false } }), 'Tab + Sidebar');
  assert.equal(surfaces({ sidebar: { label: 'A', icon: 'i.svg', order: 10, replacesTab: true } }), 'Sidebar');
});

test('a host with no sidebar plugins produces no chips at all', () => {
  assert.deepEqual(pluginSidebarChips([]), []);
  assert.deepEqual(pluginSidebarChips([plugin(), plugin({ name: 'other' })]), []);
});
