import type { IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { Show, type JSX } from 'solid-js';
import { GraphIconButton } from './GraphIconButton';

export type GraphStatusBarProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** How many nodes the verbs act on. The bar is absent at zero. */
    count: number;
    /** Callback to frame selection. */
    onFrame: () => void;
    /** Callback to keep only selection. */
    onKeepOnly: () => void;
    /** Callback to copy paths. */
    onCopyPaths: () => void;
    /** Callback to export subset. */
    onExportSubset: () => void;
    /** Callback to clear selection. */
    onClear: () => void;
    /** C1: attach a note to the selected node. */
    onAddNote?: () => void;
    /** B1: two turns are held; compare them, or clear the active comparison. */
    compare?: { active: boolean; onCompare: () => void; onClear: () => void };
    /** B2: the selected node is a group; the verbs collapse it or every other group. */
    group?: { collapsed: boolean; onToggle: () => void; onCollapseOthers: () => void };
};

const StatusButton = (props: {
    slot: string;
    label: string;
    onClick: () => void;
}): JSX.Element => (
    <button
        type="button"
        data-slot={props.slot}
        class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
        onClick={props.onClick}
    >
        {props.label}
    </button>
);

/**
 * B1 — the selection is a set, not a click. Every verb is pure over the selected ids, so the bar
 * never owns state: it names what the reader can do with what they are holding.
 */
export const GraphStatusBar = (props: GraphStatusBarProps): JSX.Element => {
    const { i18n, Icon, ...rest } = props;

    return (
        <Show when={rest.count > 0}>
            <div
                data-component="spacegraph-status-bar"
                data-slot="graph-status-bar"
                data-selection-count={rest.count}
                class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
            >
                <span data-slot="graph-status-count" class="tabular-nums">
                    {i18n.plural('ui.sessionGraph.status.count', rest.count)}
                </span>
                <div class="flex items-center gap-1">
                    <StatusButton
                        slot="graph-status-frame"
                        label={i18n.t('ui.sessionGraph.status.frame')}
                        onClick={() => rest.onFrame()}
                    />
                    <StatusButton
                        slot="graph-status-keep-only"
                        label={i18n.t('ui.sessionGraph.status.keepOnly')}
                        onClick={() => rest.onKeepOnly()}
                    />
                    <StatusButton
                        slot="graph-status-copy-paths"
                        label={i18n.t('ui.sessionGraph.status.copyPaths')}
                        onClick={() => rest.onCopyPaths()}
                    />
                    <StatusButton
                        slot="graph-status-export"
                        label={i18n.t('ui.sessionGraph.status.exportSubset')}
                        onClick={() => rest.onExportSubset()}
                    />
                    <Show when={rest.onAddNote}>
                        <StatusButton
                            slot="graph-status-add-note"
                            label={i18n.t('ui.sessionGraph.note.add')}
                            onClick={() => rest.onAddNote?.()}
                        />
                    </Show>
                    <Show when={rest.compare}>
                        {(compare) => (
                            <button
                                type="button"
                                data-slot="graph-status-compare"
                                data-active={compare().active}
                                class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
                                onClick={() =>
                                    compare().active ? compare().onClear() : compare().onCompare()
                                }
                            >
                                {i18n.t(
                                    compare().active
                                        ? 'ui.sessionGraph.compare.clear'
                                        : 'ui.sessionGraph.compare.turns',
                                )}
                            </button>
                        )}
                    </Show>
                    <Show when={rest.group}>
                        {(group) => (
                            <>
                                <button
                                    type="button"
                                    data-slot="graph-status-group-toggle"
                                    data-collapsed={group().collapsed}
                                    class="rounded-sm px-1.5 py-0.5 text-text-base hover:bg-surface-base-hover"
                                    onClick={() => group().onToggle()}
                                >
                                    {i18n.t(
                                        group().collapsed
                                            ? 'ui.sessionGraph.status.expandGroup'
                                            : 'ui.sessionGraph.status.collapseGroup',
                                    )}
                                </button>
                                <StatusButton
                                    slot="graph-status-group-others"
                                    label={i18n.t('ui.sessionGraph.status.collapseOthers')}
                                    onClick={() => group().onCollapseOthers()}
                                />
                            </>
                        )}
                    </Show>
                </div>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.status.clear')}
                    icon="close-small"
                    onClick={() => rest.onClear()}
                    Icon={Icon}
                />
            </div>
        </Show>
    );
};
