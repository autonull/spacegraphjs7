import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FocusManager');

export interface FocusableNode extends Node {
    focusable: boolean;
    focused: boolean;
    focus(): void;
    blur(): void;
}

export class FocusManager {
    private readonly sg: SpaceGraph;
    private focusStack: FocusableNode[] = [];
    private focusedNode: FocusableNode | null = null;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    getFocusedNode(): FocusableNode | null {
        return this.focusedNode;
    }

    focus(node: FocusableNode): void {
        if (!node.focusable) {
            logger.warn(`Cannot focus non-focusable node: ${node.id}`);
            return;
        }

        if (this.focusedNode === node) return;

        this.blur();

        this.focusedNode = node;
        node.focus();
        this.focusStack.push(node);

        this.sg.events.emit('focus:changed', { node, focused: true });
        logger.debug(`Focused node: ${node.id}`);
    }

    blur(): void {
        if (!this.focusedNode) return;

        const node = this.focusedNode;
        this.focusedNode = null;
        node.blur();

        this.sg.events.emit('focus:changed', { node, focused: false });
        logger.debug(`Blurred node: ${node.id}`);
    }

    focusNext(): void {
        const focusableNodes = this.getFocusableNodes();
        if (focusableNodes.length === 0) return;

        const currentIndex = this.focusedNode
            ? focusableNodes.indexOf(this.focusedNode)
            : -1;
        const nextIndex = (currentIndex + 1) % focusableNodes.length;
        this.focus(focusableNodes[nextIndex]);
    }

    focusPrevious(): void {
        const focusableNodes = this.getFocusableNodes();
        if (focusableNodes.length === 0) return;

        const currentIndex = this.focusedNode
            ? focusableNodes.indexOf(this.focusedNode)
            : 0;
        const prevIndex = (currentIndex - 1 + focusableNodes.length) % focusableNodes.length;
        this.focus(focusableNodes[prevIndex]);
    }

    private getFocusableNodes(): FocusableNode[] {
        const allNodes = Array.from(this.sg.graph.nodes.values());
        return allNodes.filter(
            (n): n is FocusableNode =>
                'focusable' in n && (n as FocusableNode).focusable,
        ) as FocusableNode[];
    }

    dispose(): void {
        this.blur();
        this.focusStack = [];
    }
}