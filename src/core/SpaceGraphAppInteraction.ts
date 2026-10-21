import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import { focusRadiusOf } from '../utils/CameraUtils';
import type { SpaceGraphApp } from './SpaceGraphApp';

/**
 * The selection the app holds, the styles it draws with, and the news it breaks.
 */
function setSelection(app: SpaceGraphApp, nodes: Node[], edges: Edge[]): void {
  app.clearSelectionStyles();
  app.currentSelected = new Set(nodes);
  app.currentSelectedEdges = new Set(edges);
  app.applySelectionStyles();

  const selectedNodes = [...app.currentSelected];
  const selectedEdges = [...app.currentSelectedEdges];
  app.sg.events.emit('selection:changed', {
    nodes: selectedNodes,
    edges: selectedEdges,
    timestamp: Date.now(),
  });

  if (app.options.onNodeSelect) app.options.onNodeSelect([...selectedNodes]);
  if (app.options.onEdgeSelect) app.options.onEdgeSelect([...selectedEdges]);
}

export function setupInteractionHandlers(app: SpaceGraphApp) {
  app.sg.events.on('interaction:selection', ({ nodes, edges }) => {
    setSelection(app, nodes || [], edges || []);
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
    setSelection(app, [], []);
  });

  app.sg.events.on('node:click', ({ node }) => {
    setSelection(app, [node], []);
  });

  app.sg.events.on('edge:click', ({ edge }) => {
    setSelection(app, [], [edge]);
  });

  app.sg.events.on('node:dblclick', ({ node }) => {
    if (app.options.onNodeDblClick) {
      app.options.onNodeDblClick(node);
    } else if (app.sg.cameraControls) {
      app.sg.cameraControls.flyTo(node.position.clone(), focusRadiusOf(node));
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
      showContextMenu(app, event, app.options.nodeContextMenu(node));
    }
  });

  app.sg.events.on('edge:contextmenu', (data: any) => {
    const { edge, event } = data;
    if (app.options.edgeContextMenu) {
      showContextMenu(app, event, app.options.edgeContextMenu(edge));
    }
  });

  app.sg.events.on('graph:contextmenu', ({ event }) => {
    if (app.options.graphContextMenu) {
      showContextMenu(app, event, app.options.graphContextMenu());
    }
  });

  app.sg.events.on('node:pointerenter', ({ node, event: _event }) => {
    if (app.options.nodeTooltip) {
      showTooltip(app, app.options.nodeTooltip(node));
    }
  });

  app.sg.events.on('node:pointerleave', () => {
    app.hud.hideTooltip();
  });

  app.sg.events.on('edge:pointerenter', ({ edge, event: _event }) => {
    if (app.options.edgeTooltip) {
      showTooltip(app, app.options.edgeTooltip(edge));
    }
  });

  app.sg.events.on('edge:pointerleave', () => {
    app.hud.hideTooltip();
  });
}

/** Show the host's context menu at the pointer, when the host offered one. */
function showContextMenu(
  app: SpaceGraphApp,
  event: { clientX: number; clientY: number },
  items: Array<{ label: string; action: () => void }> | undefined
): void {
  if (!items || items.length === 0) return;
  app.hud.showContextMenu(event.clientX, event.clientY, items);
}

/** Show the host's tooltip over the canvas, when the host offered one. */
function showTooltip(app: SpaceGraphApp, content: string | HTMLElement | undefined): void {
  if (!content) return;
  app.hud.showTooltip(app.sg.renderer.renderer.domElement, content as string);
}

export function setupHotkeys(app: SpaceGraphApp) {
  if (typeof document === 'undefined') return;

  document.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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
  });
}
