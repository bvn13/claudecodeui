import assert from 'node:assert/strict';

import { fireEvent, render, screen } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { test, vi } from 'vitest';

import type { SidebarSearchMode, SidebarTab } from '@/shared/types';
import type { SidebarPluginChip } from '@/modules/sidebar/utils/sidebarTabs';
import SidebarChipRow from '@/modules/sidebar/SidebarChipRow';

/**
 * The row has to survive a sidebar dragged down to its 220px minimum, and a
 * plugin adding a chip to a row that was already full. jsdom does no layout, so
 * widths are stubbed: the row reports the width under test and every other
 * element a width derived from its label, which is enough for the component to
 * split the chips the way a browser would.
 */

const LABELS: Record<string, string> = {
  'search.modeProjects': 'Projects',
  'search.modeConversations': 'Conversations',
  'search.runningTooltip': 'Running sessions',
  'search.archiveOnlyTooltip': 'Archive only',
  'search.modeMore': 'More',
};

const t = ((key: string, fallback?: string) => LABELS[key] ?? fallback ?? key) as unknown as TFunction;

const stubLayout = (rowWidth: number) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function measure(this: HTMLElement) {
    // The row is the only `relative flex` element in the strip; the chips are
    // wrapped in `flex-none` and the menus in `relative inline-flex`.
    const isRow = this.classList.contains('relative') && this.classList.contains('flex');
    const width = isRow ? rowWidth : 34 + 7 * (this.textContent?.trim().length ?? 0);
    return { width, height: 28, top: 0, left: 0, right: width, bottom: 28, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
};

const builtIn = (mode: SidebarSearchMode): SidebarTab => ({ kind: 'builtin', mode });

const renderRow = (
  rowWidth: number,
  sidebarTab: SidebarTab,
  pluginChips: SidebarPluginChip[] = [],
) => {
  stubLayout(rowWidth);
  const changes: SidebarTab[] = [];
  render(
    <SidebarChipRow
      hasSidebarContent
      sidebarTab={sidebarTab}
      onSidebarTabChange={(tab) => changes.push(tab)}
      pluginChips={pluginChips}
      runningSessionsCount={0}
      t={t}
    />,
  );
  return changes;
};

test('a wide row shows every chip and no overflow menu', () => {
  renderRow(400, builtIn('projects'));

  assert.ok(screen.getByRole('button', { name: 'Projects' }));
  assert.ok(screen.getByRole('button', { name: 'Conversations' }));
  assert.ok(screen.getByRole('button', { name: 'Running sessions' }));
  assert.ok(screen.getByRole('button', { name: 'Archive only' }));
  assert.equal(screen.queryByRole('button', { name: 'More' }), null);
});

test('a narrow row moves the chips that no longer fit into the dropdown', () => {
  const changes = renderRow(220, builtIn('projects'));

  assert.ok(screen.getByRole('button', { name: 'Projects' }));
  assert.equal(screen.queryByRole('button', { name: 'Conversations' }), null);

  fireEvent.click(screen.getByRole('button', { name: 'More' }));
  assert.ok(screen.getByRole('menuitem', { name: 'Running sessions' }));
  assert.ok(screen.getByRole('menuitem', { name: 'Archive only' }));

  fireEvent.click(screen.getByRole('menuitem', { name: 'Conversations' }));
  assert.deepEqual(changes, [builtIn('conversations')]);
});

test('the section on screen keeps its place in the row', () => {
  renderRow(220, builtIn('archived'));

  // Archive is the last built-in chip and the first to be dropped on width
  // alone, but it is the open section, so the row has to keep showing it.
  const archive = screen.getByRole('button', { name: 'Archive only' });
  assert.equal(archive.getAttribute('aria-pressed'), 'true');
  assert.equal(screen.queryByRole('button', { name: 'Conversations' }), null);
  assert.ok(screen.getByRole('button', { name: 'More' }));
});

test('a plugin chip takes its place by order and folds like any other', () => {
  const chips: SidebarPluginChip[] = [
    { name: 'taskwork', label: 'Tasks', icon: 'icon.svg', order: 50, replacesTab: false },
  ];

  // Wide: `order: 50` puts the plugin chip left of Projects (100).
  const wide = renderRow(400, builtIn('projects'), chips);
  assert.equal(screen.getAllByRole('button')[0]?.textContent?.trim(), 'Tasks');

  fireEvent.click(screen.getAllByRole('button', { name: 'Tasks' })[0]);
  assert.deepEqual(wide, [{ kind: 'plugin', name: 'taskwork' }]);
});
