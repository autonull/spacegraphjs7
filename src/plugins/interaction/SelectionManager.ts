import { DOMUtils } from '../../utils';
import type * as THREE from 'three';
import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import type { SpaceGraph } from '../../SpaceGraph';
import { worldToScreen } from '../../utils/projection';

// Visual + box-select adapter over the single core Selection. Owns no membership state.
// Node interaction outlines are applied by the nodes themselves (Node.setControlState).
export class SelectionManager {
  private selectionBoxEl: HTMLElement | null = null;
  private isBoxSelecting = false;
  /** The box's origin, in the canvas' own pixels. */
  private boxStart = { x: 0, y: 0 };

  constructor(readonly sg: SpaceGraph) {
    this.createSelectionBoxElement();
  }

  startBoxSelection(clientX: number, clientY: number): void {
    this.isBoxSelecting = true;
    this.boxStart = this.#canvasPoint(clientX, clientY);

    if (this.selectionBoxEl) {
      Object.assign(this.selectionBoxEl.style, {
        display: 'block',
        left: `${this.boxStart.x}px`,
        top: `${this.boxStart.y}px`,
        width: '0px',
        height: '0px',
      });
    }
  }

  updateBoxSelection(clientX: number, clientY: number): void {
    if (!this.isBoxSelecting || !this.selectionBoxEl) return;

    const current = this.#canvasPoint(clientX, clientY);
    const left = Math.min(this.boxStart.x, current.x);
    const top = Math.min(this.boxStart.y, current.y);
    const width = Math.abs(current.x - this.boxStart.x);
    const height = Math.abs(current.y - this.boxStart.y);

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
    return worldToScreen(position, this.sg.renderer.camera, this.sg.renderer.renderer.domElement);
  }

  /** A client position in the canvas' own pixels. */
  #canvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.sg.renderer.renderer.domElement.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
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
