import { HUDElement, type HUDElementSpec } from './HUDElement';
import { HUD_STYLES, HUD_ZINDEX } from './HUDStyles';

export class HUDStatusBar extends HUDElement {
    protected spec(): HUDElementSpec {
        return {
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
                zIndex: HUD_ZINDEX.HUD,
            },
            html: `
                <span id="sg-status-selection" style="display: none">Selection: 0 nodes</span>
                <span id="sg-status-nodes" style="display: none">Nodes: 0</span>
                <span id="sg-status-edges" style="display: none">Edges: 0</span>
                <span id="sg-status-camera">Camera: 2D</span>
            `,
        };
    }

    private field(id: string): HTMLElement | null {
        return this.element?.querySelector<HTMLElement>(`#${id}`) ?? null;
    }

    updateSelection(nodeCount: number, _edgeCount: number): void {
        const el = this.field('sg-status-selection');
        if (el) {
            el.textContent = `Selection: ${nodeCount} node${nodeCount !== 1 ? 's' : ''}`;
            el.style.display = nodeCount > 0 ? 'inline' : 'none';
        }
    }

    updateNodeCount(nodes: number, edges: number): void {
        const nodesEl = this.field('sg-status-nodes');
        const edgesEl = this.field('sg-status-edges');

        if (nodesEl) {
            nodesEl.textContent = `Nodes: ${nodes}`;
            nodesEl.style.display = nodes > 0 ? 'inline' : 'none';
        }
        if (edgesEl) {
            edgesEl.textContent = `Edges: ${edges}`;
            edgesEl.style.display = edges > 0 ? 'inline' : 'none';
        }

        if (this.element) this.element.style.display = nodes === 0 && edges === 0 ? 'none' : 'flex';
    }

    updateCamera(is3D: boolean): void {
        const el = this.field('sg-status-camera');
        if (el) el.textContent = `Camera: ${is3D ? '3D' : '2D'}`;
    }
}
