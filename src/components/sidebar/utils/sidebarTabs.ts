import type { SidebarSearchMode, SidebarTab } from '../types/types';

/**
 * Where the built-in sections sit in the chip row. Plugins carry their own
 * `order`, so a plugin can place itself before `Projects` purely by data.
 */
export const BUILT_IN_SIDEBAR_ORDER: Record<SidebarSearchMode, number> = {
  projects: 100,
  conversations: 200,
  running: 300,
  archived: 400,
};

export const SIDEBAR_TAB_STORAGE_KEY = 'sidebar-tab';

export type SidebarPluginChip = {
  name: string;
  label: string;
  icon: string;
  order: number;
  replacesTab: boolean;
};

type PluginLike = {
  name: string;
  displayName: string;
  enabled: boolean;
  sidebar?: { label: string; icon: string; order: number; replacesTab: boolean } | null;
};

/** Serialised form used for persistence and for React keys. */
export function sidebarTabKey(tab: SidebarTab): string {
  return tab.kind === 'plugin' ? `plugin:${tab.name}` : tab.mode;
}

export function isSameSidebarTab(a: SidebarTab, b: SidebarTab): boolean {
  return sidebarTabKey(a) === sidebarTabKey(b);
}

/** Enabled plugins that asked for a sidebar section, in the order they should appear. */
export function pluginSidebarChips(plugins: PluginLike[]): SidebarPluginChip[] {
  return plugins
    .filter((plugin) => plugin.enabled && plugin.sidebar)
    .map((plugin) => ({
      name: plugin.name,
      label: plugin.sidebar?.label ?? plugin.displayName,
      icon: plugin.sidebar?.icon ?? '',
      order: plugin.sidebar?.order ?? 500,
      replacesTab: plugin.sidebar?.replacesTab === true,
    }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

/** Plugins that keep their tab in the main area (`replacesTab` is not set). */
export function pluginsShownAsTabs<T extends PluginLike>(plugins: T[]): T[] {
  return plugins.filter((plugin) => plugin.sidebar?.replacesTab !== true);
}

/**
 * Restores the persisted tab. A plugin that has since been disabled or removed
 * falls back to `projects` instead of leaving the sidebar blank.
 */
export function parseSidebarTab(raw: string | null, availablePluginNames: string[]): SidebarTab {
  if (!raw) return { kind: 'builtin', mode: 'projects' };

  if (raw.startsWith('plugin:')) {
    const name = raw.slice('plugin:'.length);
    return availablePluginNames.includes(name)
      ? { kind: 'plugin', name }
      : { kind: 'builtin', mode: 'projects' };
  }

  return raw in BUILT_IN_SIDEBAR_ORDER
    ? { kind: 'builtin', mode: raw as SidebarSearchMode }
    : { kind: 'builtin', mode: 'projects' };
}

/** The search box belongs to the built-in sections; a plugin surface owns its own header row. */
export function showsSearchTools(tab: SidebarTab): boolean {
  return tab.kind === 'builtin';
}

/** Human-readable list of the surfaces a plugin occupies, for the settings list. */
export function describePluginSurfaces(plugin: PluginLike & { slot?: string }): string {
  const surfaces: string[] = [];
  if (plugin.sidebar?.replacesTab !== true) surfaces.push(plugin.slot === 'tab' || !plugin.slot ? 'Tab' : plugin.slot);
  if (plugin.sidebar) surfaces.push('Sidebar');
  return surfaces.join(' + ');
}
