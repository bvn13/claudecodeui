/**
 * Which surfaces a plugin occupies, derived from its manifest alone.
 *
 * These live with the plugins module rather than with the sidebar because the
 * sidebar is only one of the surfaces they describe: the main-area tab switcher
 * and the plugin settings list ask the same questions.
 */

type PluginLike = {
  name: string;
  displayName: string;
  enabled: boolean;
  sidebar?: { label: string; icon: string; order: number; replacesTab: boolean } | null;
};

/** Plugins that keep their tab in the main area (`replacesTab` is not set). */
export function pluginsShownAsTabs<T extends PluginLike>(plugins: T[]): T[] {
  return plugins.filter((plugin) => plugin.sidebar?.replacesTab !== true);
}

/** Human-readable list of the surfaces a plugin occupies, for the settings list. */
export function describePluginSurfaces(plugin: PluginLike & { slot?: string }): string {
  const surfaces: string[] = [];
  if (plugin.sidebar?.replacesTab !== true) surfaces.push(plugin.slot === 'tab' || !plugin.slot ? 'Tab' : plugin.slot);
  if (plugin.sidebar) surfaces.push('Sidebar');
  return surfaces.join(' + ');
}
