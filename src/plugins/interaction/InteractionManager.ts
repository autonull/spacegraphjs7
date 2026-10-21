// InteractionManager.ts - Unified interaction management
//
// A façade over the two managers that own the state: hover lives in HoverManager, focus lives in
// FocusManager. The façade keeps one place to read the whole interaction state from, without a
// second copy of the rules.

import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import type { SpaceGraph } from '../../SpaceGraph';
import { FocusManager, type FocusableNode } from './FocusManager';
import { HoverManager } from './HoverManager';

interface Focusable {
  focusable: boolean;
  focused: boolean;

  focus(): void;

  blur(): void;
}

export interface InteractionState {
  focused: Focusable | null;
  hoveredNode: Node | null;
  hoveredEdge: Edge | null;
  pressed: Node | null;
}

export class InteractionManager {
  private readonly hoverManager: HoverManager;
  private readonly focusManager: FocusManager;
  private _pressed: Node | null = null;

  constructor(readonly sg: SpaceGraph) {
    this.hoverManager = new HoverManager(sg);
    this.focusManager = new FocusManager(sg);
  }

  get focused(): Focusable | null {
    return this.focusManager.getFocusedNode();
  }

  get hoveredNode(): Node | null {
    return this.hoverManager.getHoveredNode();
  }

  get hoveredEdge(): Edge | null {
    return this.hoverManager.getHoveredEdge();
  }

  get pressed(): Node | null {
    return this._pressed;
  }

  // ============= State Access =============
  get state(): InteractionState {
    return {
      focused: this.focused,
      hoveredNode: this.hoveredNode,
      hoveredEdge: this.hoveredEdge,
      pressed: this.pressed,
    };
  }

  // ============= Hover Management =============
  hover(node: Node | null, edge: Edge | null): void {
    this.hoverManager.updateHover(node, edge);
  }

  hoverNode(node: Node | null): void {
    this.hoverManager.updateNodeHover(node);
  }

  hoverEdge(edge: Edge | null): void {
    this.hoverManager.updateEdgeHover(edge);
  }

  clearHover(): void {
    this.hoverManager.clear();
  }

  // ============= Focus Management =============
  focus(node: Focusable): void {
    this.focusManager.focus(node as FocusableNode);
  }

  blur(): void {
    this.focusManager.blur();
  }

  focusNext(): void {
    this.focusManager.focusNext();
  }

  focusPrevious(): void {
    this.focusManager.focusPrevious();
  }

  // ============= Press Management =============
  press(node: Node | null): void {
    if (this._pressed === node) return;
    this._pressed = node;
    if (node) this.sg.events.emit('node:pressed', { node });
  }

  release(): void {
    if (this._pressed) {
      this.sg.events.emit('node:released', { node: this._pressed });
      this._pressed = null;
    }
  }

  // ============= Selection =============
  select(node: Node): void {
    if ('focus' in node) this.focus(node as Focusable);
  }

  deselect(node: Node): void {
    if ('blur' in node && node.focused) (node as Focusable).blur();
  }

  selectAll(): void {
    for (const node of this.sg.graph.nodes.values()) {
      if ('focus' in node) (node as Focusable).focus();
    }
  }

  deselectAll(): void {
    for (const node of this.sg.graph.nodes.values()) {
      if ('blur' in node && node.focused) (node as Focusable).blur();
    }
  }

  // ============= Utility =============
  getFocusableNodes(): Focusable[] {
    return this.focusManager.getFocusableNodes();
  }

  getHovered(): Node | Edge | null {
    return this.hoveredNode ?? this.hoveredEdge;
  }

  clear(): void {
    this.blur();
    this.clearHover();
    this.release();
  }
}

export type { Focusable as FocusableNode };
