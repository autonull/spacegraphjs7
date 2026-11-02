import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { GraphCompareChanges } from './GraphCompare';
import { Show, type JSX } from 'solid-js';

export type GraphCompareBarProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** The changes to display. */
    changes: GraphCompareChanges;
    /** Callback to start comparison. */
    onCompare: () => void;
    /** Callback to clear comparison. */
    onClear: () => void;
};

/**
 * A compact bar showing the comparison status with actions to compare or clear.
 */
export const GraphCompareBar = (props: GraphCompareBarProps): JSX.Element => {
    const { i18n, Icon, changes, onCompare, onClear } = props;
    const renderIcon = createIconRenderer(Icon);

    const hasChanges = () => changes.added.size + changes.removed.size + changes.changed.size > 0;

    return (
        <Show when={hasChanges()}>
            <div
                data-component="spacegraph-compare-bar"
                data-slot="graph-compare-bar"
                class="flex items-center gap-2 border-b border-border-weaker-base bg-surface-base px-2 py-1 text-12-regular text-text-weak"
            >
                <span class="text-text-strong">{i18n.t('ui.sessionGraph.compare.changes')}</span>
                <span class="tabular-nums text-text-weak">
                    +{changes.added.size} ~{changes.changed.size} -{changes.removed.size}
                </span>
                <div class="flex items-center gap-1 ml-auto">
                    <button
                        type="button"
                        data-slot="graph-compare-bar-compare"
                        class="rounded-sm border border-border-base px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
                        onClick={onCompare}
                    >
                        {i18n.t('ui.sessionGraph.compare.compare')}
                    </button>
                    <button
                        type="button"
                        data-slot="graph-compare-bar-clear"
                        class="rounded-sm border border-border-base px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
                        onClick={onClear}
                    >
                        {i18n.t('ui.sessionGraph.compare.clear')}
                    </button>
                </div>
            </div>
        </Show>
    );
};
