import assert from 'node:assert/strict';

import { test } from 'vitest';

import { describePluginSurfaces, pluginsShownAsTabs } from '@/modules/plugins/utils/pluginSurfaces';

const plugin = (overrides: Record<string, unknown> = {}) => ({
  name: 'demo',
  displayName: 'Demo Plugin',
  enabled: true,
  sidebar: null,
  ...overrides,
}) as Parameters<typeof pluginsShownAsTabs>[0][number];

test('replacesTab removes the plugin from the main-area tabs', () => {
  const plugins = [
    plugin({ name: 'in-tabs', sidebar: { label: 'A', icon: 'i.svg', order: 10, replacesTab: false } }),
    plugin({ name: 'sidebar-only', sidebar: { label: 'B', icon: 'i.svg', order: 20, replacesTab: true } }),
    plugin({ name: 'plain' }),
  ];

  assert.deepEqual(pluginsShownAsTabs(plugins).map((p) => p.name), ['in-tabs', 'plain']);
});

test('the settings list names the surfaces a plugin occupies', () => {
  const surfaces = (overrides: Record<string, unknown>) => describePluginSurfaces({ ...plugin(overrides), slot: 'tab' });

  assert.equal(surfaces({}), 'Tab');
  assert.equal(surfaces({ sidebar: { label: 'A', icon: 'i.svg', order: 10, replacesTab: false } }), 'Tab + Sidebar');
  assert.equal(surfaces({ sidebar: { label: 'A', icon: 'i.svg', order: 10, replacesTab: true } }), 'Sidebar');
});
