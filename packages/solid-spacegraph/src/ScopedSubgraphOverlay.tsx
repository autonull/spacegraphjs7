// A scoped-subgraph overlay over the renderer contract: a small neighbourhood of one node, shown
// in a focus-trapped dialog that closes on Escape and restores the focus to whatever opened it.
// The core owns the scope and the focus behaviour; this binding owns the markup and the lifecycle.

import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import {
    extractSubgraph,
    ScopedOverlay,
    type OverlayEdge,
    type OverlayModel,
    type OverlayNode,
    type ScopedSubgraph,
} from 'spacegraphjs/overlays';

export type ScopedSubgraphScope = ScopedSubgraph<OverlayNode, OverlayEdge>;

export interface ScopedSubgraphApi {
    /** The selected node of the scope. */
    selected: () => string | undefined;
    /** Selects a node of the scope; undefined clears the selection. */
    select: (id: string | undefined) => void;
}

export type ScopedSubgraphSlot = (scope: ScopedSubgraphScope, api: ScopedSubgraphApi) => Node | undefined;

export interface ScopedSubgraphOverlayProps {
    /** The host model the scope is taken from. */
    model: OverlayModel<OverlayNode, OverlayEdge>;
    /** The node the overlay scopes to; an unknown id shows an empty scope. */
    nodeId: string;
    /** The maximum number of nodes in the scope, the root included. */
    limit?: number;
    /** The edge kind that links a child to its parent. */
    childEdgeKind?: string;
    /** Ranks a child; a lower rank is more important. */
    rankFn?: (node: OverlayNode) => number;
    /** The accessible name of the dialog. */
    label: string;
    /** The title shown in the header. */
    title?: string;
    /** The accessible name of the close control. */
    closeLabel?: string;
    /** The label of the control that opens the full graph. */
    openFullLabel?: string;
    onClose: () => void;
    /** Called with the scope's node id when the full graph is requested. */
    onOpenFull?: (nodeId: string) => void;
    /** Called when the scope's selection changes. */
    onSelect?: (id: string | undefined) => void;
    /** The header slot. */
    header?: Node;
    /** The actions slot. */
    actions?: Node;
    /** The scoped content. */
    content?: ScopedSubgraphSlot;
    /** The panel beside the content. */
    inspector?: ScopedSubgraphSlot;
}

const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes: Record<string, string> = {},
): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    return node;
};

export const ScopedSubgraphOverlay = (props: ScopedSubgraphOverlayProps) => {
    const root = element('div', { 'data-component': 'spacegraph-scoped-overlay', 'data-slot': 'scoped-overlay' });
    root.append(element('div', { 'data-slot': 'scoped-overlay-backdrop', 'aria-hidden': 'true' }));

    const dialog = element('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': props.label,
        tabindex: '-1',
        'data-slot': 'scoped-overlay-dialog',
    });
    root.append(dialog);

    const header = element('div', { 'data-slot': 'scoped-overlay-header' });
    const title = element('span', { 'data-slot': 'scoped-overlay-title' });
    if (props.title) title.textContent = props.title;
    header.append(title);
    if (props.header) header.append(props.header);

    const close = element('button', { type: 'button', 'data-slot': 'scoped-overlay-close' });
    close.setAttribute('aria-label', props.closeLabel ?? props.label);
    close.textContent = '×';
    close.addEventListener('click', () => props.onClose());
    header.append(close);

    const body = element('div', { 'data-slot': 'scoped-overlay-body' });
    const content = element('div', { 'data-slot': 'scoped-overlay-content' });
    const inspector = element('div', { 'data-slot': 'scoped-overlay-inspector' });
    body.append(content, inspector);

    const actions = element('div', { 'data-slot': 'scoped-overlay-actions' });
    if (props.actions) actions.append(props.actions);

    const openFull = element('button', { type: 'button', 'data-slot': 'scoped-overlay-open-full' });
    openFull.textContent = props.openFullLabel ?? '';
    openFull.addEventListener('click', () => props.onOpenFull?.(props.nodeId));

    dialog.append(header, body, actions);

    const [selected, setSelected] = createSignal<string | undefined>(undefined);
    const scope = createMemo(() =>
        extractSubgraph(props.model, props.nodeId, {
            limit: props.limit,
            childEdgeKind: props.childEdgeKind,
            rankFn: props.rankFn,
        }),
    );
    const api: ScopedSubgraphApi = {
        selected,
        select: (id) => {
            setSelected(id);
            props.onSelect?.(id);
        },
    };

    createEffect(() => {
        const current = scope();
        content.replaceChildren();
        const rendered = props.content?.(current, api);
        if (rendered) content.append(rendered);
        inspector.replaceChildren();
        const panel = props.inspector?.(current, api);
        if (panel) inspector.append(panel);
    });

    createEffect(() => {
        actions.replaceChildren();
        if (props.actions) actions.append(props.actions);
        if (props.onOpenFull && props.openFullLabel) actions.append(openFull);
    });

    onMount(() => {
        const overlay = new ScopedOverlay({ container: dialog, onClose: () => props.onClose() });
        onCleanup(() => overlay.dispose());
    });

    return root;
};
