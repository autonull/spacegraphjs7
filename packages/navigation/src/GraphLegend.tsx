import type {
    RenderTheme,
    EqualizerRuleSet,
    Layout,
    GraphSnapshotMeta,
    I18n,
    IconProps,
    IconComponent,
} from '@spacegraphjs/shared';
import { createIconRenderer } from '@spacegraphjs/shared';
import { Show, type JSX, onMount } from 'solid-js';
import { GraphLegendBody, type GraphLegendBodyProps } from './GraphLegendBody';
import { GraphIconButton } from './GraphIconButton';

export type GraphLegendProps = {
    theme: RenderTheme;
    /** The layout on screen; the legend says what that layout encodes. */
    layout?: Layout;
    /** The equalizer's rules, so the legend reads the same accents the cards do. */
    rules?: EqualizerRuleSet;
    /** Snapshot metadata for provenance and missing sources. */
    snapshot?: GraphSnapshotMeta;
    /** Edge kinds present in the map, with counts and visibility. */
    edgeKinds?: readonly { kind: string; count: number; hidden: boolean }[];
    onToggleEdgeKind?: (kind: string) => void;
    onClose: () => void;
    /** i18n functions for localized strings. */
    i18n?: I18n;
    /** Custom icon renderer. */
    Icon?: IconComponent;
};

/**
 * The legend overlay. It names every encoding the canvas draws: the lanes, the card colours, the
 * phase groups, the line styles, and the status dots. The colours come from the same helpers the
 * card template uses, so the legend cannot drift from the picture, and the copy comes from the same
 * i18n keys the inspector uses, so a kind is called the same thing everywhere.
 */
export const GraphLegend = (props: GraphLegendProps) => {
    const i18n: I18n = props.i18n ?? {
        t: (k: string, _v?: Record<string, string | number>) => k,
        plural: (k: string, _c: number, p?: Record<string, string | number>) =>
            p ? k.replace(/\{(\w+)\}/g, (_m, key) => String(p[key] ?? '')) : k,
    };
    const Icon = props.Icon ?? createIconRenderer();
    let panel!: HTMLDivElement;

    onMount(() => panel.focus());

    return (
        <div
            ref={panel}
            tabindex="-1"
            data-component="spacegraph-legend"
            data-slot="graph-legend"
            class="absolute left-2 top-2 z-10 flex max-h-[calc(100%-1rem)] w-80 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md outline-none"
            role="dialog"
            aria-label={i18n.t('ui.sessionGraph.legend.label')}
            onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.stopPropagation();
                props.onClose();
            }}
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

export type { GraphLegendBodyProps } from './GraphLegendBody';
