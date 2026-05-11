import type { SpaceGraphApp } from './SpaceGraphApp';

export function setupInteractionHandlers(app: SpaceGraphApp) {
  app.sg.events.on('interaction:selection', ({ nodes, edges }) => {
    app.clearSelectionStyles();
    app.currentSelected = nodes || [];
    app.currentSelectedEdges = edges || [];
    app.applySelectionStyles();
    app.sg.events.emit('selection:changed', {
      nodes: app.currentSelected,
      edges: app.currentSelectedEdges,
      timestamp: Date.now(),
    });

    if (app.options.onNodeSelect) app.options.onNodeSelect(app.currentSelected);
    if (app.options.onEdgeSelect) app.options.onEdgeSelect(app.currentSelectedEdges);
  });

    app.sg.events.on('interaction:edgecreate', ({ source, target }) => {
        if (app.options.onEdgeCreate) {
            app.options.onEdgeCreate(source, target);
        } else {
            const edgeId = `edge-${Date.now()}`;
            app.addEdge({
                id: edgeId,
                source: source.id,
                target: target.id,
                type: 'FlowEdge',
            });
        }
    });

  app.sg.events.on('graph:click', () => {
    app.clearSelectionStyles();
    app.currentSelected = [];
    app.currentSelectedEdges = [];
    app.sg.events.emit('selection:changed', {
      nodes: app.currentSelected,
      edges: app.currentSelectedEdges,
      timestamp: Date.now(),
    });
    if (app.options.onNodeSelect) app.options.onNodeSelect([]);
    if (app.options.onEdgeSelect) app.options.onEdgeSelect([]);
  });

  app.sg.events.on('node:click', ({ node }) => {
    app.clearSelectionStyles();
    app.currentSelected = [node];
    app.currentSelectedEdges = [];
    app.applySelectionStyles();
    app.sg.events.emit('selection:changed', {
      nodes: app.currentSelected,
      edges: app.currentSelectedEdges,
      timestamp: Date.now(),
    });
    if (app.options.onNodeSelect) app.options.onNodeSelect(app.currentSelected);
    if (app.options.onEdgeSelect) app.options.onEdgeSelect([]);
  });

  app.sg.events.on('edge:click', ({ edge }) => {
    app.clearSelectionStyles();
    app.currentSelected = [];
    app.currentSelectedEdges = [edge];
    app.applySelectionStyles();
    app.sg.events.emit('selection:changed', {
      nodes: app.currentSelected,
      edges: app.currentSelectedEdges,
      timestamp: Date.now(),
    });
    if (app.options.onNodeSelect) app.options.onNodeSelect([]);
    if (app.options.onEdgeSelect) app.options.onEdgeSelect(app.currentSelectedEdges);
  });

    app.sg.events.on('node:dblclick', ({ node }) => {
        if (app.options.onNodeDblClick) {
            app.options.onNodeDblClick(node);
        } else if (app.sg.cameraControls) {
            const targetPos = node.position.clone();
            const targetRadius = node.data?.width ? Math.max(node.data.width * 1.5, 150) : 150;
            app.sg.cameraControls.flyTo(targetPos, targetRadius);
        }
    });

    app.sg.events.on('edge:dblclick', (data: any) => {
        const { edge } = data;
        if (app.options.onEdgeDblClick) {
            app.options.onEdgeDblClick(edge);
        }
    });

    app.sg.events.on('node:contextmenu', ({ node, event }) => {
        if (app.options.nodeContextMenu) {
            const items = app.options.nodeContextMenu(node);
            if (items && items.length > 0) {
                app.hud.showContextMenu(event.clientX, event.clientY, items);
            }
        }
    });

    app.sg.events.on('edge:contextmenu', (data: any) => {
        const { edge, event } = data;
        if (app.options.edgeContextMenu) {
            const items = app.options.edgeContextMenu(edge);
            if (items && items.length > 0) {
                app.hud.showContextMenu(event.clientX, event.clientY, items);
            }
        }
    });

    app.sg.events.on('graph:contextmenu', ({ event }) => {
        if (app.options.graphContextMenu) {
            const items = app.options.graphContextMenu();
            if (items && items.length > 0) {
                app.hud.showContextMenu(event.clientX, event.clientY, items);
            }
        }
    });

    app.sg.events.on('node:pointerenter', ({ node, event: _event }) => {
        if (app.options.nodeTooltip) {
            const content = app.options.nodeTooltip(node);
            if (content) {
                app.hud.showTooltip(app.sg.renderer.renderer.domElement, content as string);
            }
        }
    });

    app.sg.events.on('node:pointerleave', () => {
        app.hud.hideTooltip();
    });

    app.sg.events.on('edge:pointerenter', ({ edge, event: _event }) => {
        if (app.options.edgeTooltip) {
            const content = app.options.edgeTooltip(edge);
            if (content) {
                app.hud.showTooltip(app.sg.renderer.renderer.domElement, content as string);
            }
        }
    });

    app.sg.events.on('edge:pointerleave', () => {
        app.hud.hideTooltip();
    });
}

export function setupHotkeys(app: SpaceGraphApp) {
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', (e) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (e.key === 'Escape') {
            app.hideModal();
            app.hud.hideContextMenu();
            app.clearSelectionStyles();
            (app as any).currentSelected = [];
            (app as any).currentSelectedEdges = [];
            app.setMode('default');
            app.sg.events.emit('selection:changed', {
                nodes: (app as any).currentSelected,
                edges: (app as any).currentSelectedEdges,
                timestamp: Date.now(),
            });
            if (app.options.onNodeSelect) app.options.onNodeSelect([]);
            if (app.options.onEdgeSelect) app.options.onEdgeSelect([]);
        }

        if (
            (e.key === 'Delete' || e.key === 'Backspace') &&
            ((app as any).currentSelected.length > 0 ||
                (app as any).currentSelectedEdges.length > 0)
        ) {
            if (!(app.options.hotkeys && app.options.hotkeys[e.key])) {
                for (const edge of [...(app as any).currentSelectedEdges]) {
                    app.removeEdge(edge.id);
                }
                for (const node of [...(app as any).currentSelected]) {
                    app.removeNode(node.id);
                }
            }
        }

        if (app.options.hotkeys && app.options.hotkeys[e.key]) {
            app.options.hotkeys[e.key]();
        }
    });
}
