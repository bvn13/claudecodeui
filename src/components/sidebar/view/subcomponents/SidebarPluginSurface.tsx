import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '../../../../contexts/ThemeContext';
import { usePlugins } from '../../../../contexts/PluginsContext';
import { authenticatedFetch } from '../../../../utils/api';
import type { Project, ProjectSession } from '../../../../types/app';
import { usePluginHostApi } from '../../../plugins/hooks/usePluginHostApi';
import { createPluginApi } from '../../../plugins/utils/pluginHostRequest';

type SidebarPluginSurfaceProps = {
  pluginName: string;
  selectedProject: Project | null;
  selectedSession: ProjectSession | null;
  /** Opens a new chat for a project on the plugin's behalf. */
  onStartNewSession: (project: Project) => void;
};

type PluginContext = {
  theme: 'dark' | 'light';
  // The plugin contract calls the project identifier `name`; it carries the DB
  // projectId, exactly as the main-area surface does.
  project: { name: string; path: string } | null;
  session: { id: string; title: string } | null;
};

function buildContext(
  isDarkMode: boolean,
  selectedProject: Project | null,
  selectedSession: ProjectSession | null,
): PluginContext {
  return {
    theme: isDarkMode ? 'dark' : 'light',
    project: selectedProject
      ? { name: selectedProject.projectId, path: selectedProject.fullPath || selectedProject.path || '' }
      : null,
    session: selectedSession
      ? { id: selectedSession.id, title: selectedSession.title || selectedSession.name || selectedSession.id }
      : null,
  };
}

/**
 * Mounts a plugin module into the sidebar, mirroring the main-area surface.
 *
 * The only difference the plugin sees is `api.surface === 'sidebar'`, which lets
 * it render at sidebar density; everything else — the Blob-URL import, the
 * context and the RPC channel — is identical.
 */
export default function SidebarPluginSurface({
  pluginName,
  selectedProject,
  selectedSession,
  onStartNewSession,
}: SidebarPluginSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();
  const { plugins } = usePlugins();
  const navigate = useNavigate();
  // The sidebar surface offers the same host API as the tab surface; only
  // `api.surface` differs.
  const hostApi = usePluginHostApi({
    onStartNewSession,
    onOpenSession: (sessionId) => navigate(`/session/${sessionId}`),
  });
  const hostApiRef = useRef(hostApi);
  hostApiRef.current = hostApi;

  const contextRef = useRef<PluginContext>(buildContext(isDarkMode, selectedProject, selectedSession));
  const contextCallbacksRef = useRef<Set<(context: PluginContext) => void>>(new Set());
  const moduleRef = useRef<{ unmount?: (element: HTMLElement) => void } | null>(null);

  const plugin = plugins.find((candidate) => candidate.name === pluginName);

  useEffect(() => {
    const context = buildContext(isDarkMode, selectedProject, selectedSession);
    contextRef.current = context;

    for (const callback of contextCallbacksRef.current) {
      try { callback(context); } catch { /* plugin error — ignore */ }
    }
  }, [isDarkMode, selectedProject, selectedSession]);

  useEffect(() => {
    if (!containerRef.current || !plugin?.enabled) return;

    let active = true;
    const container = containerRef.current;
    const entryFile = plugin?.entry ?? 'index.js';
    const contextCallbacks = contextCallbacksRef.current;

    (async () => {
      try {
        // Same fetch-then-Blob-import dance as the tab surface: the asset route
        // requires auth, so the browser must never request it directly.
        const assetUrl = `/api/plugins/${encodeURIComponent(pluginName)}/assets/${encodeURIComponent(entryFile)}`;
        const response = await authenticatedFetch(assetUrl);
        if (!response.ok) throw new Error(`Failed to fetch plugin (HTTP ${response.status})`);

        const source = await response.text();
        const blobUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
        const module = await import(/* @vite-ignore */ blobUrl).finally(() => URL.revokeObjectURL(blobUrl));
        if (!active || !containerRef.current) return;

        moduleRef.current = module;

        const api = createPluginApi({
          getContext: () => contextRef.current,

          onContextChange(callback: (context: PluginContext) => void): () => void {
            contextCallbacks.add(callback);
            return () => contextCallbacks.delete(callback);
          },

          async rpc(method: string, path: string, body?: unknown): Promise<unknown> {
            const cleanPath = String(path).replace(/^\//, '');
            const rpcResponse = await authenticatedFetch(
              `/api/plugins/${encodeURIComponent(pluginName)}/rpc/${cleanPath}`,
              {
                method: method || 'GET',
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
              },
            );
            if (!rpcResponse.ok) throw new Error(`RPC error ${rpcResponse.status}`);
            return rpcResponse.json();
          },

          getHost: () => hostApiRef.current,
          surface: 'sidebar',
        });

        await module.mount?.(container, api);
        if (!active) {
          try { module.unmount?.(container); } catch { /* ignore */ }
          moduleRef.current = null;
        }
      } catch (error) {
        if (!active) return;
        console.error(`[Plugin:${pluginName}] Failed to load in the sidebar:`, error);
        if (containerRef.current) {
          const message = document.createElement('div');
          message.className = 'p-3 text-xs text-destructive';
          message.textContent = `Plugin failed to load: ${String(error)}`;
          containerRef.current.replaceChildren(message);
        }
      }
    })();

    return () => {
      active = false;
      try { moduleRef.current?.unmount?.(container); } catch { /* ignore */ }
      contextCallbacks.clear();
      moduleRef.current = null;
    };
  }, [pluginName, plugin?.entry, plugin?.enabled]);

  return <div ref={containerRef} className="h-full w-full min-h-0 overflow-auto" />;
}
