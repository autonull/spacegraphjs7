// InteractionManager.ts - Unified interaction management
import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { Edge } from '../../edges/Edge';
import { applyControlStateStyles, type ControlState } from './ControlStateBorder';

interface Focusable {
    focusable: boolean;
    focused: boolean;
    focus(): void;
    blur(): void;
}

interface Interactable {
    onPointerEnter?(node: Node): void;
    onPointerLeave?(node: Node): void;
}

export interface InteractionState {
    focused: Focusable | null;
    hoveredNode: Node | null;
    hoveredEdge: Edge | null;
    pressed: Node | null;
}

const HOVER_SCALE = 1.1;

export class InteractionManager {
    private _focused: Focusable | null = null;
    private _hoveredNode: Node | null = null;
    private _hoveredEdge: Edge | null = null;
    private _pressed: Node | null = null;

    constructor(private readonly sg: SpaceGraph) {}

    // ============= State Access =============
    get state(): InteractionState {
        return {
            focused: this._focused,
            hoveredNode: this._hoveredNode,
            hoveredEdge: this._hoveredEdge,
            pressed: this._pressed,
        };
    }

    get focused(): Focusable | null { return this._focused; }
    get hoveredNode(): Node | null { return this._hoveredNode; }
    get hoveredEdge(): Edge | null { return this._hoveredEdge; }
    get pressed(): Node | null { return this._pressed; }

    // ============= Hover Management =============
    hover(node: Node | null, edge: Edge | null): void {
        this.hoverNode(node);
        this.hoverEdge(edge);
    }

    hoverNode(node: Node | null): void {
        if (node === this._hoveredNode) return;

        if (this._hoveredNode?.object) {
            this.sg.events.emit('node:pointerleave', { node: this._hoveredNode });
            this._hoveredNode.object.scale.divideScalar(HOVER_SCALE);
            this.setNodeState(this._hoveredNode, 'normal');
            (this._hoveredNode as Interactable)?.onPointerLeave?.(this._hoveredNode);
        }

        this._hoveredNode = node;

        if (this._hoveredNode?.object) {
            this.sg.events.emit('node:pointerenter', { node: this._hoveredNode });
            this._hoveredNode.object.scale.multiplyScalar(HOVER_SCALE);
            this.setNodeState(this._hoveredNode, 'hovered');
            (this._hoveredNode as Interactable)?.onPointerEnter?.(this._hoveredNode);
        }
    }

    hoverEdge(edge: Edge | null): void {
        if (edge === this._hoveredEdge) return;
        if (this._hoveredEdge) this.sg.events.emit('edge:pointerleave', { edge: this._hoveredEdge });
        this._hoveredEdge = edge;
        if (this._hoveredEdge) this.sg.events.emit('edge:pointerenter', { edge: this._hoveredEdge });
    }

    clearHover(): void {
        this.hoverNode(null);
        this.hoverEdge(null);
    }

    // ============= Focus Management =============
    focus(node: Focusable): void {
        if (!node.focusable) return;
        if (this._focused === node) return;

        this.blur();
        this._focused = node;
        node.focus();
        this.sg.events.emit('focus:changed', { node, focused: true });
    }

    blur(): void {
        if (!this._focused) return;
        const node = this._focused;
        this._focused = null;
        node.blur();
        this.sg.events.emit('focus:changed', { node, focused: false });
    }

    focusNext(): void {
        const nodes = this.getFocusableNodes();
        if (nodes.length === 0) return;
        const current = this._focused ? nodes.indexOf(this._focused) : -1;
        this.focus(nodes[(current + 1) % nodes.length]);
    }

    focusPrevious(): void {
        const nodes = this.getFocusableNodes();
        if (nodes.length === 0) return;
        const current = this._focused ? nodes.indexOf(this._focused) : 0;
        this.focus(nodes[(current - 1 + nodes.length) % nodes.length]);
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
        if ('blur' in node && node.focused) (node as any).blur();
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
        return [...this.sg.graph.nodes.values()]
            .filter((n): n is Focusable => 'focusable' in n && (n as Focusable).focusable);
    }

    getHovered(): Node | Edge | null {
        return this._hoveredNode ?? this._hoveredEdge;
    }

    clear(): void {
        this.blur();
        this.clearHover();
        this.release();
    }

    // ============= Private =============
    private setNodeState(node: Node, state: ControlState): void {
        const prev = node.controlState;
        node.controlState = state;
        const el = node.object?.userData?.domElement;
        if (el) applyControlStateStyles(el as HTMLElement, state, prev);
    }
}

export type { Focusable as FocusableNode };