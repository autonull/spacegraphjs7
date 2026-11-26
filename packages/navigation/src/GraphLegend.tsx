import type { I18n } from '@spacegraphjs/shared';
import { createIconRenderer, passthroughI18n, useKeyboardShortcuts } from '@spacegraphjs/shared';
import { onMount } from 'solid-js';
import { GraphLegendBody, type GraphLegendBodyProps } from './GraphLegendBody';
import { GraphIconButton } from './GraphIconButton';

export type GraphLegendProps = GraphLegendBodyProps & { onClose: () => void };

/**
 * The legend overlay. It names every encoding the canvas draws: the lanes, the card colours, the
 * phase groups, the line styles, and the status dots. The colours come from the same helpers the
 * card template uses, so the legend cannot drift from the picture, and the copy comes from the same
 * i18n keys the inspector uses, so a kind is called the same thing everywhere.
 */
export const GraphLegend = (props: GraphLegendProps) => {
    const i18n: I18n = props.i18n ?? passthroughI18n;
    const Icon = props.Icon ?? createIconRenderer();
    let panel!: HTMLDivElement;

    onMount(() => panel.focus());
    useKeyboardShortcuts([
        {
            key: 'Escape',
            target: () => panel,
            preventDefault: false,
            stopPropagation: true,
            onTrigger: () => props.onClose(),
        },
    ]);

    return (
        <div
            ref={panel}
            tabindex="-1"
            data-component="spacegraph-legend"
            data-slot="graph-legend"
            class="absolute left-2 top-2 z-10 flex max-h-[calc(100%-1rem)] w-80 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md outline-none"
            role="dialog"
            aria-label={i18n.t('ui.sessionGraph.legend.label')}
        >
            <div class="flex items-center gap-2 px-2 py-1.5">
                <Icon name="outline-sliders" size="small" class="shrink-0 text-text-weak" />
                <span class="flex-1 text-14-regular text-text-strong">
                    {i18n.t('ui.sessionGraph.legend.label')}
                </span>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.legend.close')}
                    icon="close-small"
                    onClick={props.onClose}
                    Icon={Icon}
                />
            </div>

            <GraphLegendBody
                theme={props.theme}
                layout={props.layout}
                rules={props.rules}
                snapshot={props.snapshot}
                edgeKinds={props.edgeKinds}
                onToggleEdgeKind={props.onToggleEdgeKind}
                i18n={i18n}
                Icon={Icon}
            />
        </div>
    );
};

