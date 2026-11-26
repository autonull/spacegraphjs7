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

const zoomBy = (app: SpaceGraphApp, delta: number) =>
    app.sg.setZoom(Math.max(0, Math.min(1, app.sg.zoom + delta)));

const BUILTIN_HOTKEYS: Record<string, (app: SpaceGraphApp) => void> = {
    f: (app) => app.sg.fitView(200),
    '/': () => {
        const input = document.getElementById('sg-app-search-input');
        if (input instanceof HTMLInputElement) {
            input.focus();
            input.select();
        }
    },
    '+': (app) => zoomBy(app, 0.1),
    '=': (app) => zoomBy(app, 0.1),
    '-': (app) => zoomBy(app, -0.1),
};

export function setupHotkeys(app: SpaceGraphApp): () => void {
    if (typeof document === 'undefined') return () => undefined;

    const onKeyDown = (e: KeyboardEvent) => {
        if (isEditableTarget(e.target)) return;

        if (e.key === 'Escape') {
            app.hideModal();
            app.hud.hideContextMenu();
            app.clearSelection();
            app.setMode('default');
            return;
        }

        const hostHotkey = app.options.hotkeys?.[e.key];
        if (hostHotkey) {
            hostHotkey();
            return;
        }

        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const builtin = BUILTIN_HOTKEYS[e.key];
        if (!builtin) return;
        e.preventDefault();
        builtin(app);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
}
