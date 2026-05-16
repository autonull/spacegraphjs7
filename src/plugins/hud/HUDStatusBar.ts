import type { SpaceGraph } from '../../SpaceGraph';
import { DOMUtils } from '../../utils/DOMUtils';
import { HUD_STYLES, HUD_ZINDEX } from './HUDStyles';
import { HUDDOMFactory } from './HUDDOMFactory';

export class HUDStatusBar {
    private statusBar: HTMLElement | null = null;
    private sg: SpaceGraph;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    create(): void {
        this.statusBar = DOMUtils.createElement('div', {
            className: 'spacegraph-status-bar',
            style: {
                ...HUD_STYLES.base,
                ...HUD_STYLES.statusBar,
                bottom: '0',
                left: '0',
                right: '0',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: '24px',
                fontSize: '12px',
                color: HUD_STYLES.base.color,
            },
        });

        this.statusBar.innerHTML = `
            <span id="sg-status-selection" style="display: none">Selection: 0 nodes</span>
            <span id="sg-status-nodes" style="display: none">Nodes: 0</span>
            <span id="sg-status-edges" style="display: none">Edges: 0</span>
            <span id="sg-status-camera">Camera: 2D</span>
            <span id="sg-status-layout" style="display: none">Layout: Idle</span>
        `;

        this.statusBar.style.zIndex = HUD_ZINDEX.HUD;
        HUDDOMFactory.appendToRenderer(this.sg, this.statusBar);
    }

    updateSelection(nodeCount: number, _edgeCount: number): void {
        const el = HUDDOMFactory.getElementById('sg-status-selection');
        if (el) {
            el.textContent = `Selection: ${nodeCount} node${nodeCount !== 1 ? 's' : ''}`;
            el.style.display = nodeCount > 0 ? 'inline' : 'none';
        }
    }

    updateNodeCount(nodes: number, edges: number): void {
        const nodesEl = HUDDOMFactory.getElementById('sg-status-nodes');
        const edgesEl = HUDDOMFactory.getElementById('sg-status-edges');

        if (nodesEl) {
            nodesEl.textContent = `Nodes: ${nodes}`;
            nodesEl.style.display = nodes > 0 ? 'inline' : 'none';
        }
        if (edgesEl) {
            edgesEl.textContent = `Edges: ${edges}`;
            edgesEl.style.display = edges > 0 ? 'inline' : 'none';
        }

        // Hide status bar completely if empty
        if (this.statusBar) {
            this.statusBar.style.display = (nodes === 0 && edges === 0) ? 'none' : 'flex';
        }
    }

    updateCamera(is3D: boolean): void {
        const el = HUDDOMFactory.getElementById('sg-status-camera');
        if (el) {
            el.textContent = `Camera: ${is3D ? '3D' : '2D'}`;
        }
    }

    updateLayout(isActive: boolean): void {
        const el = HUDDOMFactory.getElementById('sg-status-layout');
        if (el) {
            el.textContent = `Layout: ${isActive ? 'Running' : 'Idle'}`;
            el.style.display = isActive ? 'inline' : 'none';
        }
    }

    dispose(): void {
        if (this.statusBar?.parentElement) {
            this.statusBar.parentElement.removeChild(this.statusBar);
        }
        this.statusBar = null;
    }
}
