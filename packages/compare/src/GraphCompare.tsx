import type { I18n } from '@spacegraphjs/shared/i18n';
import type { GraphViewData, TurnStats } from '@spacegraphjs/shared/types';
import { For, Show, type JSX } from 'solid-js';

export type GraphCompareChanges = {
    added: ReadonlySet<string>;
    removed: ReadonlySet<string>;
    changed: ReadonlySet<string>;
    turnStats?: ReadonlyArray<TurnStats>;
};

export type GraphCompareProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The graph model. */
    model: GraphViewData;
    /** The changes to display. */
    changes: GraphCompareChanges;
};

/**
 * Compare-as-window: the same three counts the status chip shows, with the nodes named. The window is
 * screen space and the manager stays content-free; this component owns only the comparison's words.
 */
export const GraphCompare = (props: GraphCompareProps): JSX.Element => {
    const { i18n, model, changes } = props;

    const sections = () => [
        { key: 'added', label: i18n.t('ui.sessionGraph.compare.added'), ids: changes.added },
        { key: 'removed', label: i18n.t('ui.sessionGraph.compare.removed'), ids: changes.removed },
        { key: 'changed', label: i18n.t('ui.sessionGraph.compare.changed'), ids: changes.changed },
    ];

    const label = (id: string) => model.nodes.find((node) => node.id === id)?.label ?? id;

    const empty = () => changes.added.size + changes.removed.size + changes.changed.size === 0;

    const hasTurnStats = () => (changes.turnStats?.length ?? 0) > 0;

    return (
        <div data-slot="graph-compare-window" class="p-3 flex flex-col gap-4">
            <Show
                when={!empty()}
                fallback={
                    <div class="text-12-regular text-text-weak">
                        {i18n.t('ui.sessionGraph.compare.empty')}
                    </div>
                }
            >
                <For each={sections()}>
                    {(section) => (
                        <Show when={section.ids.size > 0}>
                            <div
                                class="mt-2 first:mt-0"
                                data-slot="graph-compare-section"
                                data-diff={section.key}
                            >
                                <div class="text-12-medium text-text-strong">
                                    {section.label}{' '}
                                    <span class="tabular-nums text-text-weak">
                                        {section.ids.size}
                                    </span>
                                </div>
                                <ul class="mt-1 flex flex-col gap-0.5">
                                    <For each={[...section.ids]}>
                                        {(id) => (
                                            <li
                                                class="truncate text-12-regular text-text-base"
                                                title={label(id)}
                                            >
                                                {label(id)}
                                            </li>
                                        )}
                                    </For>
                                </ul>
                            </div>
                        </Show>
                    )}
                </For>
            </Show>

            <Show when={hasTurnStats()}>
                <div class="border-t border-border-weaker-base pt-3">
                    <div class="text-12-medium text-text-strong mb-2">
                        {i18n.t('ui.sessionGraph.compare.turnStats')}
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-12-regular text-text-base">
                            <thead>
                                <tr class="text-left text-text-weak border-b border-border-weaker-base">
                                    <th class="pb-1 pr-4">
                                        {i18n.t('ui.sessionGraph.compare.turn')}
                                    </th>
                                    <th class="pb-1 pr-4 tabular-nums">
                                        {i18n.t('ui.sessionGraph.compare.files')}
                                    </th>
                                    <th class="pb-1 pr-4 tabular-nums">
                                        {i18n.t('ui.sessionGraph.compare.tools')}
                                    </th>
                                    <th class="pb-1 pr-4 tabular-nums">
                                        {i18n.t('ui.sessionGraph.compare.errors')}
                                    </th>
                                    <th class="pb-1 pr-4 tabular-nums">
                                        {i18n.t('ui.sessionGraph.compare.retries')}
                                    </th>
                                    <th class="pb-1 tabular-nums">
                                        {i18n.t('ui.sessionGraph.compare.duration')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <For each={changes.turnStats ?? []}>
                                    {(stat) => (
                                        <tr class="border-b border-border-weaker-base/50 last:border-0">
                                            <td class="py-1 pr-4">
                                                {i18n.t('ui.sessionGraph.compare.turnNumber', {
                                                    num: stat.turnNumber,
                                                })}
                                            </td>
                                            <td class="py-1 pr-4 tabular-nums">
                                                {stat.filesTouched}
                                            </td>
                                            <td class="py-1 pr-4 tabular-nums">{stat.toolsRun}</td>
                                            <td class="py-1 pr-4 tabular-nums text-text-on-critical-base">
                                                {stat.errors}
                                            </td>
                                            <td class="py-1 pr-4 tabular-nums text-text-on-warning-base">
                                                {stat.retries}
                                            </td>
                                            <td class="py-1 tabular-nums">
                                                {Math.round(stat.durationMs / 1000)}s
                                            </td>
                                        </tr>
                                    )}
                                </For>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Show>
        </div>
    );
};
