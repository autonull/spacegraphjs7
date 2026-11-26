import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import { focusNodeCamera } from '../utils/CameraUtils';
import { isEditableTarget } from '../utils/DOMUtils';
import type { SpaceGraphEvents } from '../types';
import type { SpaceGraphApp } from './SpaceGraphApp';

/** The app mirrors the engine's one selection store; it never owns a second one. */
function applySelection(
    app: SpaceGraphApp,
    nodes: Iterable<string>,
    edges: Iterable<string>,
): void {
    app.clearSelectionStyles();
    app.currentSelected = new Set(
        [...nodes].map((id) => app.sg.getNode(id)).filter((node): node is Node => Boolean(node)),
    );
    app.currentSelectedEdges = new Set(
        [...edges].map((id) => app.sg.getEdge(id)).filter((edge): edge is Edge => Boolean(edge)),
    );
    app.applySelectionStyles();
    app.updateStatsHUD();
    app.options.onNodeSelect?.([...app.currentSelected]);
    app.options.onEdgeSelect?.([...app.currentSelectedEdges]);
}
export function setupInteractionHandlers(app: SpaceGraphApp): () => void {
    const subscriptions: { dispose(): void }[] = [];
    const on = <K extends keyof SpaceGraphEvents>(
        event: K,
        handler: (data: SpaceGraphEvents[K]) => void,
    ) => subscriptions.push(app.sg.events.on(event, handler));
    on('selection:changed', ({ nodes, edges }) => applySelection(app, nodes, edges));

    on('interaction:edgecreate', ({ source, target }) => {
        if (app.options.onEdgeCreate) {
            const sourceNode = app.sg.getNode(source);
            const targetNode = app.sg.getNode(target);
            if (sourceNode && targetNode) {
                app.options.onEdgeCreate(sourceNode, targetNode);
            }
        } else {
            const edgeId = `edge-${Date.now()}`;
            app.addEdge({
                id: edgeId,
                source,
                target,
                type: 'FlowEdge',
            });
        }
    });

    on('background:click', () => app.sg.clearSelection());
    on('node:click', (data) => {
        const id = 'node' in data ? data.node.id : data.id;
        if (id && !app.sg.selection.has(id)) app.sg.select(id);
    });
    on('edge:click', (data) => {
        const id = 'id' in data ? data.id : undefined;
        if (id && !app.sg.selection.has(id)) app.sg.select(id);
    });

    on('node:dblclick', ({ node }) => {
        if (app.options.onNodeDblClick) {
            app.options.onNodeDblClick(node);
        } else if (app.sg.cameraControls) {
            focusNodeCamera(app.sg, node);
        }
    });

    on('edge:dblclick', (data: any) => {
        const { edge } = data;
        if (app.options.onEdgeDblClick) {
            app.options.onEdgeDblClick(edge);
        }
    });

    on('node:contextmenu', ({ node, event }) => {
        if (app.options.nodeContextMenu) {
            showContextMenu(app, event, app.options.nodeContextMenu(node));
        }
    });

    on('edge:contextmenu', (data: any) => {
        const { edge, event } = data;
        if (app.options.edgeContextMenu) {
            showContextMenu(app, event, app.options.edgeContextMenu(edge));
        }
    });

    on('graph:contextmenu', ({ event }) => {
        if (app.options.graphContextMenu) {
            showContextMenu(app, event, app.options.graphContextMenu());
        }
    });

    on('node:pointerenter', ({ node, event }) => {
        if (app.options.nodeTooltip) {
            showTooltip(app, app.options.nodeTooltip(node), event);
        }
    });

    on('node:pointerleave', () => {
        app.hud.hideTooltip();
    });

    on('edge:pointerenter', ({ edge, event }) => {
        if (app.options.edgeTooltip) {
            showTooltip(app, app.options.edgeTooltip(edge), event);
        }
    });

    on('edge:pointerleave', () => {
        app.hud.hideTooltip();
    });
    return () => {
        for (const subscription of subscriptions) subscription.dispose();
    };
}

/** Show the host's context menu at the pointer, when the host offered one. */
function showContextMenu(
    app: SpaceGraphApp,
    event: { clientX: number; clientY: number },
    items: Array<{ label: string; action: () => void }> | undefined,
): void {
    if (!items || items.length === 0) return;
    app.hud.showContextMenu(event.clientX, event.clientY, items);
}

/** Show the host's tooltip over the canvas, when the host offered one. */
function showTooltip(
    app: SpaceGraphApp,
    content: string | HTMLElement | undefined,
    event?: { clientX: number; clientY: number },
): void {
    if (!content) return;
    app.hud.showTooltip(app.sg.renderer.renderer.domElement, content, event);
}

export function setupHotkeys(app: SpaceGraphApp): () => void {
    if (typeof document === 'undefined') return () => undefined;

    const onKeyDown = (e: KeyboardEvent) => {
        if (isEditableTarget(e.target)) return;

        if (e.key === 'Escape') {
            app.hideModal();
            app.hud.hideContextMenu();
            app.clearSelection();
            app.setMode('default');
        }

        if (
            (e.key === 'Delete' || e.key === 'Backspace') &&
            (app.currentSelected.size > 0 || app.currentSelectedEdges.size > 0)
        ) {
            if (!(app.options.hotkeys && app.options.hotkeys[e.key])) {
                for (const edge of [...app.currentSelectedEdges]) {
                    app.removeEdge(edge.id);
                }
                for (const node of [...app.currentSelected]) {
                    app.removeNode(node.id);
                }
            }
        }

        if (app.options.hotkeys && app.options.hotkeys[e.key]) {
            app.options.hotkeys[e.key]();
        }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
}
