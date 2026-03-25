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
            <span id="sg-status-selection">Selection: 0 nodes</span>
            <span id="sg-status-nodes">Nodes: 0</span>
            <span id="sg-status-edges">Edges: 0</span>
            <span id="sg-status-camera">Camera: 2D</span>
            <span id="sg-status-layout">Layout: Idle</span>
        `;

        this.statusBar.style.zIndex = HUD_ZINDEX.HUD;
        HUDDOMFactory.appendToRenderer(this.sg, this.statusBar);
    }

    updateSelection(nodeCount: number, edgeCount: number): void {
        const el = HUDDOMFactory.getElementById('sg-status-selection');
        if (el) {
            el.textContent = `Selection: ${nodeCount} node${nodeCount !== 1 ? 's' : ''}`;
        }
    }

    updateNodeCount(nodes: number, edges: number): void {
        const nodesEl = HUDDOMFactory.getElementById('sg-status-nodes');
        const edgesEl = HUDDOMFactory.getElementById('sg-status-edges');

        if (nodesEl) nodesEl.textContent = `Nodes: ${nodes}`;
        if (edgesEl) edgesEl.textContent = `Edges: ${edges}`;
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
        }
    }

    dispose(): void {
        if (this.statusBar?.parentElement) {
            this.statusBar.parentElement.removeChild(this.statusBar);
        }
        this.statusBar = null;
    }
}
