/**
 * GraphTimeControl - Time/scrubber control for the toolbar.
 */

import type { JSX } from 'solid-js';
import { Show, createSignal, onMount, onCleanup } from 'solid-js';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import { createPopoverRenderer, type PopoverComponent } from '@spacegraphjs/shared/popover';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { GraphViewData } from '@spacegraphjs/shared/types';
import { GraphIconButton } from './GraphIconButton';

export interface GraphTimeControlProps {
    checkpoint?: number;
    turnCount?: number;
    onCheckpoint?: (index: number) => void;
    model?: GraphViewData;
    i18n: I18n;
    Icon?: IconComponent;
    Popover?: PopoverComponent;
}

export function GraphTimeControl(props: GraphTimeControlProps): JSX.Element {
    const { i18n, Icon, ...rest } = props;
    const renderIcon = Icon ?? createIconRenderer();
    const [timeOpen, setTimeOpen] = createSignal<boolean>();
    const offLive = () =>
        rest.checkpoint !== undefined &&
        rest.turnCount !== undefined &&
        rest.checkpoint < rest.turnCount - 1;
    const timeShown = () => timeOpen() ?? offLive();

    let rootEl!: HTMLDivElement;
    onMount(() => {
        const handleCommand = (event: Event) => {
            const detail = (event as CustomEvent<{ name?: string }>).detail;
            if (detail?.name !== 'facets') return;
            const menu = rootEl?.querySelector<HTMLDetailsElement>(
                '[data-slot="graph-toolbar-facets"]',
            );
            if (menu) menu.open = true;
        };
        window.addEventListener('graph:command', handleCommand);
        onCleanup(() => window.removeEventListener('graph:command', handleCommand));
    });

    const turnStatuses = () =>
        (rest.model?.turns ?? []).map((id) => rest.model?.nodes.find((node) => node.id === id));

    return (
        <Show when={rest.onCheckpoint && (rest.turnCount ?? 0) > 1}>
            <GraphIconButton
                label={i18n.t('ui.toolbar.time.toggle')}
                icon="outline-rotate-clockwise"
                pressed={timeShown()}
                slot="graph-time-toggle"
                onClick={() => setTimeOpen(!timeShown())}
                Icon={renderIcon}
            />
            <Show when={timeShown()}>
                <label
                    data-slot="session-graph-scrubber"
                    class="flex min-w-40 items-center gap-2 text-12-regular text-text-weak"
                >
                    <div class="relative flex min-w-24 flex-1 items-center">
                        <input
                            type="range"
                            min="1"
                            max={rest.turnCount}
                            step="1"
                            value={(rest.checkpoint ?? 0) + 1}
                            aria-label={i18n.t('ui.toolbar.time.aria')}
                            class="h-1 w-full"
                            onInput={(event) =>
                                rest.onCheckpoint?.(Number(event.currentTarget.value) - 1)
                            }
                        />
                        <div
                            data-slot="graph-time-ticks"
                            class="pointer-events-none absolute inset-x-0 top-2 flex justify-between"
                        >
                            {turnStatuses().map((node) => (
                                <span
                                    data-slot="graph-time-tick"
                                    data-status={node?.status ?? 'neutral'}
                                    title={node?.label}
                                    class="h-1 w-px bg-border-weaker-base"
                                    classList={{
                                        'bg-[var(--border-critical-selected)]':
                                            node?.status === 'failed',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <output class="shrink-0 tabular-nums">
                        {i18n.t('ui.toolbar.time.value', {
                            current: String((rest.checkpoint ?? 0) + 1),
                            total: String(rest.turnCount),
                        })}
                    </output>
                </label>
            </Show>
        </Show>
    );
}
