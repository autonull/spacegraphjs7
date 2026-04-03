import * as THREE from 'three';

import { Node } from './Node';
import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

/**
 * CanvasNode — A node backed by a 2D <canvas> rendered as a Three.js texture.
 *
 * data options:
 *   width  : canvas pixel width  (default 256)
 *   height : canvas pixel height (default 256)
 *   draw   : (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void
 *            Custom draw function called on construction and on redraw().
 */
export class CanvasNode extends Node {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private texture: THREE.CanvasTexture;
    private plane: THREE.Mesh;
    private drawFn?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
    private readonly _object: THREE.Group;

    get object(): THREE.Object3D {
        return this._object;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this._object = new THREE.Group();

        const w = (spec.data?.width ?? 256) as number;
        const h = (spec.data?.height ?? 256) as number;
        this.drawFn = spec.data?.draw as
            | ((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void)
            | undefined;

        this.canvas = DOMUtils.createElement('canvas');
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        this._draw();

        this.texture = new THREE.CanvasTexture(this.canvas);
        const geo = new THREE.PlaneGeometry(w * 0.5, h * 0.5);
        const mat = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
        this.plane = new THREE.Mesh(geo, mat);
        this.object.add(this.plane);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
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
    redraw(drawFn?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void): void {
        if (drawFn) this.drawFn = drawFn;
        this._draw();
        this.texture.needsUpdate = true;
    }

    /** Expose the raw 2D context for external drawing. Call redraw() after modifying. */
    get context(): CanvasRenderingContext2D {
        return this.ctx;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.draw) {
            this.drawFn = updates.data.draw as
                | ((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void)
                | undefined;
            this.redraw();
        }
        return this;
    }

    dispose(): void {
        this.texture.dispose();
        this.plane.geometry.dispose();
        (this.plane.material as THREE.Material).dispose();
        super.dispose();
    }
}
