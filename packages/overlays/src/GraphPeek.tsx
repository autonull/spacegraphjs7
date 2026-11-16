import type { GraphEdge, GraphNode, VocabularyKeys } from '@spacegraphjs/shared';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { createComponent, effect, getNextElement, insert, setAttribute, template, Show } from 'solid-js/web';

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
 * 
 * This component uses imperative DOM creation with lazily-created templates to avoid SolidJS
 * template hoisting which causes "Client-only API called on the server side" errors during SSR builds.
 */
export const GraphPeek = (props: GraphPeekProps) => {
    const { i18n, Icon, vocabularyKeys, node, edge } = props;
    const vocab = vocabularyKeys ?? ({} as VocabularyKeys);
    const renderIcon = createIconRenderer(Icon);

    // Create templates lazily on first render to avoid module-level template calls
    // that fail during SSR builds
    let nodeTemplate: ReturnType<typeof template> | null = null
    let edgeTemplate: ReturnType<typeof template> | null = null
    let labelTemplate: ReturnType<typeof template> | null = null
    let additionsTemplate: ReturnType<typeof template> | null = null
    let deletionsTemplate: ReturnType<typeof template> | null = null

    const ensureTemplates = () => {
        if (nodeTemplate) return
        // Second argument is for SVG namespace (false for HTML)
        nodeTemplate = template(
            '<div data-component="spacegraph-peek" data-slot="graph-peek" class="pointer-events-none flex max-w-[260px] items-center gap-2 rounded-md border border-border-weaker-base bg-surface-base px-2 py-1 shadow-md"><span class="shrink-0 text-12-regular text-text-weaker"></span><span class="truncate text-12-regular text-text-strong"></span>',
            false,
        )
        edgeTemplate = template(
            '<div data-component="spacegraph-peek" data-slot="graph-peek" data-kind="edge" class="pointer-events-none flex max-w-[260px] items-center gap-2 rounded-md border border-border-weaker-base bg-surface-base px-2 py-1 shadow-md"><span class="shrink-0 text-12-regular text-text-weaker"></span><span class="shrink-0 text-12-regular text-text-weaker"></span><!$><!/><!$><!/><!$><!/>',
            false,
        )
        labelTemplate = template('<span class="truncate text-12-regular text-text-strong"></span>', false)
        additionsTemplate = template('<span class="shrink-0 text-12-regular text-text-weaker">+</span>', false)
        deletionsTemplate = template('<span class="shrink-0 text-12-regular text-text-weaker">−</span>', false)
    }

    const renderNode = () => {
        ensureTemplates()
        const el = getNextElement(nodeTemplate!) as HTMLElement
        const kindSpan = el.firstChild as HTMLElement
        const labelSpan = kindSpan.nextSibling as HTMLElement
        insert(kindSpan, () => i18n.t(vocab.kind?.[node!.kind] ?? `ui.sessionGraph.kind.${node!.kind}`))
        insert(labelSpan, () => node!.label)
        effect(() => setAttribute(el, "data-kind", node!.kind))
        return el
    }

    const renderEdge = () => {
        ensureTemplates()
        const el = getNextElement(edgeTemplate!) as HTMLElement
        const kindSpan = el.firstChild as HTMLElement
        const confidenceSpan = kindSpan.nextSibling as HTMLElement
        
        insert(kindSpan, () => i18n.t(vocab.edge?.[edge!.kind] ?? `ui.sessionGraph.edge.${edge!.kind}`))
        insert(confidenceSpan, () => i18n.t(`ui.sessionGraph.confidence.${edge!.confidence ?? 'explicit'}`))
        
        // Label (conditional)
        const hasLabel = () => !!edge!.label
        createComponent(Show, {
            when: hasLabel,
            keyed: true,
            get children() {
                ensureTemplates()
                const labelEl = getNextElement(labelTemplate!) as HTMLElement
                insert(labelEl, () => edge!.label)
                return labelEl
            }
        })
        
        // Additions (conditional)
        const hasAdditions = () => 
            edge!.kind === 'writes' && edge!.data && 'additions' in edge!.data && 'deletions' in edge!.data
        createComponent(Show, {
            when: hasAdditions,
            keyed: true,
            get children() {
                ensureTemplates()
                const addEl = getNextElement(additionsTemplate!) as HTMLElement
                const valueSpan = addEl.firstChild as HTMLElement
                insert(valueSpan, () => (edge!.data as { additions: number }).additions)
                return addEl
            }
        })
        
        // Deletions (conditional)
        createComponent(Show, {
            when: hasAdditions,
            keyed: true,
            get children() {
                ensureTemplates()
                const delEl = getNextElement(deletionsTemplate!) as HTMLElement
                const valueSpan = delEl.firstChild as HTMLElement
                insert(valueSpan, () => (edge!.data as { deletions: number }).deletions)
                return delEl
            }
        })
        
        return el
    }

    if (node) return renderNode()
    if (edge) return renderEdge()
    return null
};
