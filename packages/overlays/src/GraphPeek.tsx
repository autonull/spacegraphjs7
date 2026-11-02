import type { GraphEdge, GraphNode, VocabularyKeys } from '@spacegraphjs/shared';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { Show } from 'solid-js';

export type GraphPeekProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Optional vocabulary keys for custom i18n keys. */
    vocabularyKeys?: Partial<VocabularyKeys>;
    /** The node to peek at. */
    node?: GraphNode;
    /** The edge to peek at. */
    edge?: GraphEdge;
};

/**
 * A transient look at the node or edge under the pointer: its kind and its label. It answers "what
 * is this?" without changing the selection, so a reader can scan a dense map without committing to
 * anything — and it disappears the moment the pointer moves on.
 */
export const GraphPeek = (props: GraphPeekProps) => {
    const { i18n, Icon, vocabularyKeys, node, edge } = props;
    const vocab = vocabularyKeys ?? ({} as VocabularyKeys);
    const renderIcon = createIconRenderer(Icon);

    if (node) {
        return (
            <div
                data-component="spacegraph-peek"
                data-slot="graph-peek"
                data-kind={node.kind}
                class="pointer-events-none flex max-w-[260px] items-center gap-2 rounded-md border border-border-weaker-base bg-surface-base px-2 py-1 shadow-md"
            >
                <span class="shrink-0 text-12-regular text-text-weaker">
                    {i18n.t(vocab.kind?.[node.kind] ?? `ui.sessionGraph.kind.${node.kind}`)}
                </span>
                <span class="truncate text-12-regular text-text-strong">{node.label}</span>
            </div>
        );
    }

    if (edge) {
        return (
            <div
                data-component="spacegraph-peek"
                data-slot="graph-peek"
                data-kind="edge"
                class="pointer-events-none flex max-w-[260px] items-center gap-2 rounded-md border border-border-weaker-base bg-surface-base px-2 py-1 shadow-md"
            >
                <span class="shrink-0 text-12-regular text-text-weaker">
                    {i18n.t(vocab.edge?.[edge.kind] ?? `ui.sessionGraph.edge.${edge.kind}`)}
                </span>
                <span class="shrink-0 text-12-regular text-text-weaker">
                    {i18n.t(`ui.sessionGraph.confidence.${edge.confidence ?? 'explicit'}`)}
                </span>
                <Show when={edge.label}>
                    <span class="truncate text-12-regular text-text-strong">{edge.label}</span>
                </Show>
                {edge.kind === 'writes' &&
                    edge.data &&
                    'additions' in edge.data &&
                    'deletions' in edge.data && (
                        <span class="shrink-0 text-12-regular text-text-weaker">
                            +{(edge.data as { additions: number }).additions}
                        </span>
                    )}
                {edge.kind === 'writes' &&
                    edge.data &&
                    'additions' in edge.data &&
                    'deletions' in edge.data && (
                        <span class="shrink-0 text-12-regular text-text-weaker">
                            −{(edge.data as { deletions: number }).deletions}
                        </span>
                    )}
            </div>
        );
    }

    return null;
};
