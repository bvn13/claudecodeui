import { Fragment, type ComponentType, type ReactNode } from 'react';
import { Activity, Archive, Folder, MessageSquare, MoreHorizontal } from 'lucide-react';
import type { TFunction } from 'i18next';

import { ActionMenu, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { SidebarSearchMode, SidebarTab } from '@/shared/types';
import type { SidebarPluginChip } from '@/modules/sidebar/utils/sidebarTabs';
import { BUILT_IN_SIDEBAR_ORDER, isSameSidebarTab, sidebarTabKey } from '@/modules/sidebar/utils/sidebarTabs';
import { useTabOverflow } from '@/modules/sidebar/hooks/useTabOverflow';
import { PluginIcon } from '@/modules/plugins';

type SidebarChip = {
  key: string;
  order: number;
  tab: SidebarTab;
  /** The dropdown always shows this; the row shows it only when `showLabel` is set. */
  label: string;
  showLabel: boolean;
  /** The row icon. Plugin icons are fetched SVGs, not lucide components. */
  renderIcon: () => ReactNode;
  menuIcon: ComponentType<{ className?: string }>;
};

type SidebarChipRowProps = {
  hasSidebarContent: boolean;
  sidebarTab: SidebarTab;
  onSidebarTabChange: (tab: SidebarTab) => void;
  pluginChips: SidebarPluginChip[];
  runningSessionsCount: number;
  t: TFunction;
};

/**
 * Used by SidebarHeader for the section switcher above the search box, in both
 * the desktop and the mobile header.
 *
 * Built-in chips and plugin chips are one ordered list, so a plugin declaring
 * `order: 50` renders left of Projects (100). The sidebar is resizable and a
 * plugin can add chips to a row that was already full, so the chips that no
 * longer fit move into a "…" dropdown at the right edge instead of spilling out
 * over the panel.
 */
export default function SidebarChipRow({
  hasSidebarContent,
  sidebarTab,
  onSidebarTabChange,
  pluginChips,
  runningSessionsCount,
  t,
}: SidebarChipRowProps) {
  const runningBadgeText = runningSessionsCount > 99 ? '99+' : String(runningSessionsCount);
  const moreLabel = t('search.modeMore', 'More');

  const builtInChip = (
    mode: SidebarSearchMode,
    label: string,
    icon: ComponentType<{ className?: string }>,
    showLabel: boolean,
  ): SidebarChip => {
    const Icon = icon;
    return {
      key: mode,
      order: BUILT_IN_SIDEBAR_ORDER[mode],
      tab: { kind: 'builtin', mode },
      label,
      showLabel,
      renderIcon: () => <Icon className="h-3 w-3" />,
      menuIcon: icon,
    };
  };

  const chips: SidebarChip[] = [];

  if (hasSidebarContent) {
    chips.push(builtInChip('projects', t('search.modeProjects'), Folder, true));
    chips.push(builtInChip('conversations', t('search.modeConversations'), MessageSquare, true));
    chips.push({
      ...builtInChip('running', t('search.runningTooltip', 'Running sessions'), Activity, false),
      renderIcon: () => (
        <span className="relative flex h-3 w-3 items-center justify-center">
          <Activity className={cn('h-3 w-3', runningSessionsCount > 0 && 'text-emerald-500')} />
          {runningSessionsCount > 0 && (
            <span className="absolute -right-2.5 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[8px] font-semibold leading-none text-white shadow-sm ring-1 ring-background">
              {runningBadgeText}
            </span>
          )}
        </span>
      ),
    });
    chips.push(builtInChip('archived', t('search.archiveOnlyTooltip', 'Archive only'), Archive, false));
  }

  for (const chip of pluginChips) {
    const tab: SidebarTab = { kind: 'plugin', name: chip.name };
    const icon = ({ className }: { className?: string }) => (
      <PluginIcon pluginName={chip.name} iconFile={chip.icon} className={className} />
    );
    chips.push({
      key: sidebarTabKey(tab),
      order: chip.order,
      tab,
      label: chip.label,
      showLabel: true,
      renderIcon: () => (
        <PluginIcon
          pluginName={chip.name}
          iconFile={chip.icon}
          className="flex h-3 w-3 items-center justify-center [&>svg]:h-3 [&>svg]:w-3"
        />
      ),
      menuIcon: icon,
    });
  }

  chips.sort((first, second) => first.order - second.order);

  const activeIndex = chips.findIndex((chip) => isSameSidebarTab(sidebarTab, chip.tab));
  const { rowRef, mirrorRef, visibleIndexes } = useTabOverflow(chips.length, activeIndex);
  const hiddenChips = chips.filter((_, index) => !visibleIndexes.includes(index));

  const renderChip = (chip: SidebarChip, canGrow: boolean) => {
    const isActive = isSameSidebarTab(sidebarTab, chip.tab);

    const button = (
      <button
        onClick={() => onSidebarTabChange(chip.tab)}
        aria-pressed={isActive}
        aria-label={chip.showLabel ? undefined : chip.label}
        title={chip.label}
        className={cn(
          'flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-normal transition-all',
          chip.key === 'archived' && 'px-2.5',
          canGrow && chip.showLabel && 'flex-1',
          isActive
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
          isActive && chip.key === 'running' && 'ring-1 ring-emerald-500/15',
        )}
      >
        {chip.renderIcon()}
        {chip.showLabel && <span className="truncate">{chip.label}</span>}
      </button>
    );

    // The labelled chips say what they are; the icon-only ones need the tooltip.
    return chip.showLabel ? button : <Tooltip content={chip.label} position="top">{button}</Tooltip>;
  };

  const overflowTrigger = (
    <ActionMenu
      label={moreLabel}
      ariaLabel={moreLabel}
      icon={MoreHorizontal}
      iconOnly
      portal
      variant="ghost"
      size="sm"
      className="flex-none"
      triggerClassName="h-auto rounded-md px-2 py-1.5 text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-3.5"
      items={hiddenChips.map((chip) => ({
        key: chip.key,
        label: chip.label,
        icon: chip.menuIcon,
        onSelect: () => onSidebarTabChange(chip.tab),
      }))}
    />
  );

  return (
    <div className="rounded-lg bg-muted/50 p-0.5">
      <div ref={rowRef} className="relative flex">
        {visibleIndexes.map((index) => (
          <Fragment key={chips[index].key}>{renderChip(chips[index], true)}</Fragment>
        ))}
        {hiddenChips.length > 0 && overflowTrigger}

        {/*
          An off-layout copy of the whole row. What to drop can only be decided
          from every chip's natural width, and a chip that has already been
          dropped is no longer in the row to measure. Clipped rather than merely
          hidden so it cannot widen an ancestor's scroll area.
        */}
        <div aria-hidden className="pointer-events-none invisible absolute inset-0 overflow-hidden">
          <div ref={mirrorRef} className="flex w-max">
            {chips.map((chip) => (
              <div key={chip.key} className="flex-none">{renderChip(chip, false)}</div>
            ))}
            <div className="flex-none">{overflowTrigger}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
