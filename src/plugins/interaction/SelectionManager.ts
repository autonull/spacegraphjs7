import type { SpaceGraph } from '../SpaceGraph';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import { DOMUtils } from '../../utils/DOMUtils';

/**
 * Selection manager for InteractionPlugin
 * Handles box selection and multi-selection state
 */
export class SelectionManager {
    private selectedNodes: Set<Node> = new Set();
    private selectedEdges: Set<Edge> = new Set();
    private selectionBoxEl: HTMLElement | null = null;
    private isBoxSelecting = false;
    private readonly sg: SpaceGraph;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
        this.createSelectionBoxElement();
    }

    private createSelectionBoxElement(): void {
        if (typeof document === 'undefined') return;

        this.selectionBoxEl = DOMUtils.createElement('div');
        Object.assign(this.selectionBoxEl.style, {
            position: 'absolute',
            border: '1px solid rgba(139, 92, 246, 0.8)',
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '9999',
        });

        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.style.position = 'relative';
            domElement.parentElement.appendChild(this.selectionBoxEl);
        }
    }

    startBoxSelection(startX: number, startY: number): void {
        this.isBoxSelecting = true;
        if (this.selectionBoxEl) {
            this.selectionBoxEl.style.display = 'block';
            this.selectionBoxEl.style.left = `${startX}px`;
            this.selectionBoxEl.style.top = `${startY}px`;
            this.selectionBoxEl.style.width = '0px';
            this.selectionBoxEl.style.height = '0px';
        }
    }

    updateBoxSelection(currentX: number, currentY: number): void {
        if (!this.isBoxSelecting || !this.selectionBoxEl) return;

        const rect = this.sg.renderer.renderer.domElement.getBoundingClientRect();
        const startX = parseFloat(this.selectionBoxEl.style.left);
        const startY = parseFloat(this.selectionBoxEl.style.top);

        const left = Math.min(startX, currentX - rect.left);
        const top = Math.min(startY, currentY - rect.top);
        const width = Math.abs(currentX - rect.left - startX);
        const height = Math.abs(currentY - rect.top - startY);

        this.selectionBoxEl.style.left = `${left}px`;
        this.selectionBoxEl.style.top = `${top}px`;
        this.selectionBoxEl.style.width = `${width}px`;
        this.selectionBoxEl.style.height = `${height}px`;

        this.updateSelectionInBox(left, top, width, height);
    }

    private updateSelectionInBox(left: number, top: number, width: number, height: number): void {
        const selectionBox = { left, top, right: left + width, bottom: top + height };

        for (const node of this.sg.graph.nodes.values()) {
            if (!node.object) continue;

            const pos = this.getProjectedPosition(node.object.position);
            const isInBox =
                pos.x >= selectionBox.left &&
                pos.x <= selectionBox.right &&
                pos.y >= selectionBox.top &&
                pos.y <= selectionBox.bottom;

            if (isInBox) {
                this.selectedNodes.add(node);
            } else {
                this.selectedNodes.delete(node);
            }
        }

        this.sg.events.emit('selection:changed', {
            nodes: this.selectedNodes,
            edges: this.selectedEdges,
        });
    }

    private getProjectedPosition(position: THREE.Vector3): { x: number; y: number } {
        const vector = position.clone();
        vector.project(this.sg.renderer.camera);

        const canvas = this.sg.renderer.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        return {
            x: (vector.x * 0.5 + 0.5) * width,
            y: (-vector.y * 0.5 + 0.5) * height,
        };
    }

    endBoxSelection(): void {
        this.isBoxSelecting = false;
        if (this.selectionBoxEl) {
            this.selectionBoxEl.style.display = 'none';
        }
    }

    addNode(node: Node): void {
        this.selectedNodes.add(node);
        this.emitSelectionChange();
    }

    removeNode(node: Node): void {
        this.selectedNodes.delete(node);
        this.emitSelectionChange();
    }

    clear(): void {
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.emitSelectionChange();
    }

    private emitSelectionChange(): void {
        this.sg.events.emit('selection:changed', {
            nodes: this.selectedNodes,
            edges: this.selectedEdges,
        });
    }

    getSelectedNodes(): Set<Node> {
        return this.selectedNodes;
    }

    getSelectedEdges(): Set<Edge> {
        return this.selectedEdges;
    }

    isBoxSelectingActive(): boolean {
        return this.isBoxSelecting;
    }

    getSelectionBoxElement(): HTMLElement | null {
        return this.selectionBoxEl;
    }

    dispose(): void {
        if (this.selectionBoxEl?.parentElement) {
            this.selectionBoxEl.parentElement.removeChild(this.selectionBoxEl);
        }
    }
}
