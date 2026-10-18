import { DOMUtils } from '../../utils';
import type * as THREE from 'three';
import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import type { SpaceGraph } from '../../SpaceGraph';

// Visual + box-select adapter over the single core Selection. Owns no membership state.
// Node interaction outlines are applied by the nodes themselves (Node.setControlState).
export class SelectionManager {
  private selectionBoxEl: HTMLElement | null = null;
  private isBoxSelecting = false;

  constructor(readonly sg: SpaceGraph) {
    this.createSelectionBoxElement();
  }

  startBoxSelection(startX: number, startY: number): void {
    this.isBoxSelecting = true;
    if (this.selectionBoxEl) {
      Object.assign(this.selectionBoxEl.style, {
        display: 'block',
        left: `${startX}px`,
        top: `${startY}px`,
        width: '0px',
        height: '0px',
      });
    }
  }

  updateBoxSelection(currentX: number, currentY: number): void {
    if (!this.isBoxSelecting || !this.selectionBoxEl) return;
    const rect = this.sg.renderer.renderer.domElement.getBoundingClientRect();
    const startX = Number.parseFloat(this.selectionBoxEl.style.left);
    const startY = Number.parseFloat(this.selectionBoxEl.style.top);
    const left = Math.min(startX, currentX - rect.left);
    const top = Math.min(startY, currentY - rect.top);
    const width = Math.abs(currentX - rect.left - startX);
    const height = Math.abs(currentY - rect.top - startY);
    Object.assign(this.selectionBoxEl.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    this.updateSelectionInBox(left, top, width, height);
  }

  endBoxSelection(): void {
    this.isBoxSelecting = false;
    if (this.selectionBoxEl) this.selectionBoxEl.style.display = 'none';
  }

  addNode(node: Node): void {
    this.sg.selection.select([...this.sg.selection.list, node.id]);
  }

  removeNode(node: Node): void {
    this.sg.selection.deselect(node.id);
  }

  clear(): void {
    this.sg.selection.clear();
  }

  getSelectedNodes(): Set<Node> {
    return new Set(
      this.sg.selection.list
        .map((id) => this.sg.graph.getNode(id))
        .filter((node): node is Node => node !== undefined)
    );
  }

  getSelectedEdges(): Set<Edge> {
    return new Set();
  }

  isBoxSelectingActive(): boolean {
    return this.isBoxSelecting;
  }

  getSelectionBoxElement(): HTMLElement | null {
    return this.selectionBoxEl;
  }

  dispose(): void {
    this.selectionBoxEl?.parentElement?.removeChild(this.selectionBoxEl);
  }

  private updateSelectionInBox(left: number, top: number, width: number, height: number): void {
    const box = { left, top, right: left + width, bottom: top + height };
    const ids: string[] = [];
    for (const node of this.sg.graph.nodes.values()) {
      if (!node.object) continue;
      const pos = this.getProjectedPosition(node.object.position);
      if (pos.x >= box.left && pos.x <= box.right && pos.y >= box.top && pos.y <= box.bottom) {
        ids.push(node.id);
      }
    }
    this.sg.selection.select(ids);
  }

  private getProjectedPosition(position: THREE.Vector3): { x: number; y: number } {
    const vector = position.clone().project(this.sg.renderer.camera);
    const { clientWidth: width, clientHeight: height } = this.sg.renderer.renderer.domElement;
    return { x: (vector.x * 0.5 + 0.5) * width, y: (-vector.y * 0.5 + 0.5) * height };
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
}
