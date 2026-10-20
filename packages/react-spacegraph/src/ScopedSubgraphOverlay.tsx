// A scoped-subgraph overlay over the renderer contract: a small neighbourhood of one node, shown
// in a focus-trapped dialog that closes on Escape and restores the focus to whatever opened it.
// The core owns the scope and the focus behaviour; this binding owns the markup and the lifecycle.

import {
    createElement,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactElement,
    type ReactNode,
} from 'react';
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
    selected: string | undefined;
    /** Selects a node of the scope; undefined clears the selection. */
    select: (id: string | undefined) => void;
}

export type ScopedSubgraphSlot = (scope: ScopedSubgraphScope, api: ScopedSubgraphApi) => ReactNode;

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
    header?: ReactNode;
    /** The actions slot. */
    actions?: ReactNode;
    /** The scoped content. */
    content?: ScopedSubgraphSlot;
    /** The panel beside the content. */
    inspector?: ScopedSubgraphSlot;
}

export const ScopedSubgraphOverlay = (props: ScopedSubgraphOverlayProps): ReactElement => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef(props.onClose);
    const [selected, setSelected] = useState<string | undefined>(undefined);

    closeRef.current = props.onClose;

    const scope = useMemo(
        () =>
            extractSubgraph(props.model, props.nodeId, {
                limit: props.limit,
                childEdgeKind: props.childEdgeKind,
                rankFn: props.rankFn,
            }),
        [props.model, props.nodeId, props.limit, props.childEdgeKind, props.rankFn],
    );

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const overlay = new ScopedOverlay({ container: dialog, onClose: () => closeRef.current() });
        return () => overlay.dispose();
    }, []);

    const api = useMemo<ScopedSubgraphApi>(
        () => ({
            selected,
            select: (id) => {
                setSelected(id);
                props.onSelect?.(id);
            },
        }),
        [props.onSelect, selected],
    );

    return createElement(
        'div',
        {
            'data-component': 'spacegraph-scoped-overlay',
            'data-slot': 'scoped-overlay',
            style: { position: 'absolute', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' },
        },
        createElement('div', { 'data-slot': 'scoped-overlay-backdrop', 'aria-hidden': 'true' }),
        createElement(
            'div',
            {
                ref: dialogRef,
                role: 'dialog',
                'aria-modal': 'true',
                'aria-label': props.label,
                tabIndex: -1,
                'data-slot': 'scoped-overlay-dialog',
                onKeyDown: (event: ReactKeyboardEvent) => {
                    if (event.key === 'Escape') event.stopPropagation();
                },
            },
            createElement(
                'div',
                { 'data-slot': 'scoped-overlay-header' },
                props.title ? createElement('span', { 'data-slot': 'scoped-overlay-title' }, props.title) : null,
                props.header,
                createElement(
                    'button',
                    {
                        type: 'button',
                        'data-slot': 'scoped-overlay-close',
                        'aria-label': props.closeLabel ?? props.label,
                        onClick: () => props.onClose(),
                    },
                    '×',
                ),
            ),
            createElement(
                'div',
                { 'data-slot': 'scoped-overlay-body' },
                createElement('div', { 'data-slot': 'scoped-overlay-content' }, props.content?.(scope, api)),
                props.inspector
                    ? createElement('div', { 'data-slot': 'scoped-overlay-inspector' }, props.inspector(scope, api))
                    : null,
            ),
            props.actions || props.onOpenFull
                ? createElement(
                      'div',
                      { 'data-slot': 'scoped-overlay-actions' },
                      props.actions,
                      props.onOpenFull && props.openFullLabel
                          ? createElement(
                                'button',
                                {
                                    type: 'button',
                                    'data-slot': 'scoped-overlay-open-full',
                                    onClick: () => props.onOpenFull?.(props.nodeId),
                                },
                                props.openFullLabel,
                            )
                          : null,
                  )
                : null,
        ),
    );
};
