import type * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';
import { DOMUtils } from '../../utils/DOMUtils';
import { applyControlStateStyles } from './ControlStateBorder';

export class SelectionManager {
    private selectedNodes = new Set<Node>();
    private selectedEdges = new Set<Edge>();
    private selectionBoxEl: HTMLElement | null = null;
    private isBoxSelecting = false;

    constructor(private readonly sg: SpaceGraph) { this.createSelectionBoxElement(); }

    private createSelectionBoxElement(): void {
        if (typeof document === 'undefined') return;
        this.selectionBoxEl = DOMUtils.createElement('div');
        Object.assign(this.selectionBoxEl.style, {
            position: 'absolute', border: '1px solid rgba(139, 92, 246, 0.8)',
            backgroundColor: 'rgba(139, 92, 246, 0.2)', pointerEvents: 'none', display: 'none', zIndex: '9999',
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
            Object.assign(this.selectionBoxEl.style, { display: 'block', left: `${startX}px`, top: `${startY}px`, width: '0px', height: '0px' });
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
        Object.assign(this.selectionBoxEl.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
        this.updateSelectionInBox(left, top, width, height);
    }

    private updateSelectionInBox(left: number, top: number, width: number, height: number): void {
        const box = { left, top, right: left + width, bottom: top + height };
        for (const node of this.sg.graph.nodes.values()) {
            if (!node.object) continue;
            const pos = this.getProjectedPosition(node.object.position);
            const isInBox = pos.x >= box.left && pos.x <= box.right && pos.y >= box.top && pos.y <= box.bottom;
            if (isInBox) this.selectedNodes.add(node);
            else this.selectedNodes.delete(node);
        }
        this.emitSelectionChange();
    }

    private getProjectedPosition(position: THREE.Vector3): { x: number; y: number } {
        const vector = position.clone().project(this.sg.renderer.camera);
        const { clientWidth: width, clientHeight: height } = this.sg.renderer.renderer.domElement;
        return { x: (vector.x * 0.5 + 0.5) * width, y: (-vector.y * 0.5 + 0.5) * height };
    }

    endBoxSelection(): void {
        this.isBoxSelecting = false;
        if (this.selectionBoxEl) this.selectionBoxEl.style.display = 'none';
    }

    addNode(node: Node): void { this.selectedNodes.add(node); node.controlState = 'selected'; this.updateNodeVisual(node, 'selected'); this.emitSelectionChange(); }
    removeNode(node: Node): void { this.selectedNodes.delete(node); node.controlState = 'normal'; this.updateNodeVisual(node, 'normal'); this.emitSelectionChange(); }

    clear(): void {
        this.selectedNodes.forEach((n) => { n.controlState = 'normal'; this.updateNodeVisual(n, 'normal'); });
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.emitSelectionChange();
    }

    private updateNodeVisual(node: Node, state: 'selected' | 'normal'): void {
        const el = node.object?.userData?.domElement;
        if (el) applyControlStateStyles(el as HTMLElement, state);
    }

    private emitSelectionChange(): void {
        this.sg.events.emit('selection:changed', { nodes: [...this.selectedNodes].map((n) => n.id), edges: [...this.selectedEdges].map((e) => e.id), timestamp: Date.now() });
    }

    getSelectedNodes(): Set<Node> { return this.selectedNodes; }
    getSelectedEdges(): Set<Edge> { return this.selectedEdges; }
    isBoxSelectingActive(): boolean { return this.isBoxSelecting; }
    getSelectionBoxElement(): HTMLElement | null { return this.selectionBoxEl; }
    dispose(): void { this.selectionBoxEl?.parentElement?.removeChild(this.selectionBoxEl); }
}