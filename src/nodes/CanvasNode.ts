import * as THREE from 'three';
import { TexturedMeshNode } from './TexturedMeshNode';
import { createElement } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

type DrawFn = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;

/**
 * CanvasNode — A node backed by a 2D <canvas> rendered as a Three.js texture.
 *
 * data options:
 *   width  : canvas pixel width  (default 256)
 *   height : canvas pixel height (default 256)
 *   draw   : (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void
 *            Custom draw function called on construction and on redraw().
 */
export class CanvasNode extends TexturedMeshNode {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private canvasTexture!: THREE.CanvasTexture;
    private drawFn?: DrawFn;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = (spec.data?.width ?? 256) as number;
        const h = (spec.data?.height ?? 256) as number;
        super(sg, spec, w * 0.5, h * 0.5);

        this.drawFn = spec.data?.draw as DrawFn | undefined;

        this.canvas = createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        this._draw();

        this.canvasTexture = new THREE.CanvasTexture(this.canvas);
        this.setTexture(this.canvasTexture);
    }

    private _draw() {
        const { ctx, canvas } = this;
        if (!ctx) return;
        if (this.drawFn) {
            this.drawFn(ctx, canvas);
            return;
        }
        const bg = (this.data?.bgColor as string) ?? '#1e293b';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (this.label) {
            ctx.fillStyle = '#f8fafc';
            ctx.font = `bold ${Math.floor(canvas.height / 10)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, canvas.width / 2, canvas.height / 2);
        }
    }

    /** Redraw the canvas using the draw function (or default renderer) and mark the texture as needing an update. */
    redraw(drawFn?: DrawFn): void {
        if (drawFn) this.drawFn = drawFn;
        this._draw();
        this.canvasTexture.needsUpdate = true;
    }

    /** Expose the raw 2D context for external drawing. Call redraw() after modifying. */
    get context(): CanvasRenderingContext2D {
        return this.ctx;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.draw) {
            this.drawFn = updates.data.draw as DrawFn | undefined;
            this.redraw();
        }
        return this;
    }
}
