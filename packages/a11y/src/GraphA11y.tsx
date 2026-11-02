import type { RenderModel, I18n } from '@spacegraphjs/shared';
import type { AccessibleItem, AccessibleEdge } from '@spacegraphjs/shared';
import { AccessibilityLayer } from './AccessibilityLayer';
import { createEffect, onCleanup, onMount } from 'solid-js';

export type GraphA11yProps = {
    model: RenderModel;
    selection?: readonly string[];
    /** Anchors the wrapper's `aria-describedby`; the instructions live here. */
    instructionsId?: string;
    /** What the view changed (level, representation, depth); announced when it changes. */
    announcement?: string;
    onSelect: (id: string) => void;
    onEscape?: () => void;
    /** i18n functions for localized strings. */
    i18n?: I18n;
};

/**
 * The accessibility mirror. It mounts the library `AccessibilityLayer` — a visually hidden,
 * ordered node list with roving tabindex, arrow traversal, Enter/Space selection, Escape, and an
 * `aria-live` announcement — over the current render model, so keyboard users reach every node the
 * canvas draws. The layer never imports a renderer, so it is identical in both.
 */
export const GraphA11y = (props: GraphA11yProps) => {
    const i18n = props.i18n ?? {
        t: (k: string) => k,
        plural: (k: string, _c: number, p?: Record<string, string | number>) =>
            p ? k.replace(/\{(\w+)\}/g, (_m, key) => String(p[key] ?? '')) : k,
    };
    let container!: HTMLDivElement;
    let layer: AccessibilityLayer | undefined;
    let announced: string | undefined;

    const items = (): AccessibleItem[] =>
        props.model.nodes
            .filter((node) => node.interactive !== false)
            .map((node) => ({
                id: node.id,
                label: node.label,
                kind: node.kind,
                status: node.status ?? 'neutral',
                interactive: true,
            }));

    const edges = (): AccessibleEdge[] => {
        const labels = new Map(props.model.nodes.map((node) => [node.id, node.label]));

        return props.model.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            label: `${labels.get(edge.source) ?? edge.source} → ${labels.get(edge.target) ?? edge.target}`,
        }));
    };

    onMount(() => {
        layer = new AccessibilityLayer({
            container,
            label: i18n.t('ui.sessionGraph.a11y.label'),
            edgeLabel: i18n.t('ui.sessionGraph.a11y.edgeLabel'),
            onSelect: (id) => props.onSelect(id),
            onEscape: () => props.onEscape?.(),
            formatSelection: (labels) =>
                labels.length
                    ? i18n.t('ui.sessionGraph.a11y.selected', { labels: labels.join(', ') })
                    : i18n.t('ui.sessionGraph.a11y.cleared'),
            edgeAnnouncer: (connections) =>
                connections.length
                    ? i18n.t('ui.sessionGraph.a11y.connections', {
                          edges: connections.map((edge) => edge.label).join(', '),
                      })
                    : '',
            i18n,
        });
        // The first view state is not a change, so it is not announced.
        announced = props.announcement;
    });

    createEffect(() => layer?.setItems(items()));
    createEffect(() => layer?.setEdges(edges()));
    createEffect(() => layer?.setSelected(props.selection ?? null));
    // Announce view changes (level, representation, depth)
    createEffect(() => {
        const message = props.announcement;
        if (!message || message === announced) return;
        announced = message;
        layer?.announce(message);
    });

    onCleanup(() => {
        layer?.dispose();
        layer = undefined;
    });

    return (
        <>
            <p id={props.instructionsId} data-slot="graph-a11y-instructions" class="sr-only">
                {i18n.t('ui.sessionGraph.a11y.instructions')}
            </p>
            <div ref={container} data-component="spacegraph-a11y" data-slot="graph-a11y" />
        </>
    );
};
