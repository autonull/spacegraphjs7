// SpaceGraphJS - PanelNode
// Draggable window panel with move/resize fingerings, inspired by SGJ's Windo

import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class PanelNode extends HtmlNode {
    fixed = false;
    resizeBorder = 0.1;
    private isDragging = false;
    private isResizing = false;
    private resizeDirection: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null = null;
    private dragStartPos = { x: 0, y: 0 };
    private resizeStartSize = { width: 0, height: 0 };

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        if (spec?.data) {
            const d = spec.data as Record<string, unknown>;
            if (typeof d.fixed === 'boolean') this.fixed = d.fixed;
            if (typeof d.resizeBorder === 'number') this.resizeBorder = d.resizeBorder;
        }
    }

    getDragMode(localPos: { x: number; y: number }): 'move' | 'resize' | null {
        if (this.fixed) return null;
        const { width = 300, height = 200 } = this.data as Record<string, number>;
        const border = this.resizeBorder;
        const nearEdge =
            localPos.x < width * border ||
            localPos.x > width * (1 - border) ||
            localPos.y < height * border ||
            localPos.y > height * (1 - border);
        return nearEdge ? 'resize' : 'move';
    }

    getResizeDirection(localPos: {
        x: number;
        y: number;
    }): 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null {
        if (this.fixed) return null;
        const { width = 300, height = 200 } = this.data as Record<string, number>;
        const border = this.resizeBorder;
        const left = localPos.x < width * border;
        const right = localPos.x > width * (1 - border);
        const top = localPos.y < height * border;
        const bottom = localPos.y > height * (1 - border);

        if (top && left) return 'nw';
        if (top && right) return 'ne';
        if (bottom && left) return 'sw';
        if (bottom && right) return 'se';
        if (top) return 'n';
        if (bottom) return 's';
        if (left) return 'w';
        if (right) return 'e';
        return null;
    }

    startDrag(localPos: { x: number; y: number }): boolean {
        if (this.fixed) return false;
        const mode = this.getDragMode(localPos);
        if (mode === 'resize') {
            this.isResizing = true;
            this.resizeDirection = this.getResizeDirection(localPos);
            this.resizeStartSize = { ...this.size };
            this.dragStartPos = { ...localPos };
            this.startResize();
            return true;
        }
        this.isDragging = true;
        this.dragStartPos = { ...localPos };
        this.startDrag();
        return true;
    }

    updateDrag(localPos: { x: number; y: number }): void {
        if (this.isDragging) {
            const dx = localPos.x - this.dragStartPos.x;
            const dy = localPos.y - this.dragStartPos.y;
            this.position.x += dx;
            this.position.y -= dy;
            this.dragStartPos = { ...localPos };
        }
        if (this.isResizing) {
            const dx = localPos.x - this.dragStartPos.x;
            const dy = localPos.y - this.dragStartPos.y;
            let newWidth = this.resizeStartSize.width;
            let newHeight = this.resizeStartSize.height;

            const dir = this.resizeDirection;
            if (dir?.includes('e')) newWidth += dx;
            if (dir?.includes('w')) newWidth -= dx;
            if (dir?.includes('s')) newHeight -= dy;
            if (dir?.includes('n')) newHeight += dy;

            newWidth = Math.max(80, newWidth);
            newHeight = Math.max(40, newHeight);
            this.setSize(newWidth, newHeight);
        }
    }

    endDrag(): void {
        if (this.isDragging) {
            this.endDrag();
            this.isDragging = false;
        }
        if (this.isResizing) {
            this.endResize();
            this.isResizing = false;
            this.resizeDirection = null;
        }
    }
}
