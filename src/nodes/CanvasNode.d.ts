import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * CanvasNode — A node backed by a 2D <canvas> rendered as a Three.js texture.
 *
 * data options:
 *   width  : canvas pixel width  (default 256)
 *   height : canvas pixel height (default 256)
 *   draw   : (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void
 *            Custom draw function called on construction and on redraw().
 */
export declare class CanvasNode extends Node {
    private canvas;
    private ctx;
    private texture;
    private plane;
    private drawFn?;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    private _draw;
    /**
     * Redraw the canvas using the draw function (or default renderer)
     * and mark the texture as needing an update.
     */
    redraw(drawFn?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void): void;
    /** Expose the raw 2D context for external drawing. Call redraw() after modifying. */
    get context(): CanvasRenderingContext2D;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
