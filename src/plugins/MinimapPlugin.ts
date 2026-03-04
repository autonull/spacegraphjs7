import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

/**
 * MinimapPlugin — Renders a thumbnail overview of the graph in a corner overlay.
 *
 * Scaffold: creates a secondary ortho camera and renders into a small viewport
 * region each frame.  Full implementation would add interactive panning (click
 * on minimap to fly the main camera there).
 *
 * Plugin settings:
 *   position : 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 *   size     : pixel size of the square minimap (default 160)
 *   margin   : px from the edge of the screen (default 12)
 *   bgColor  : minimap background (default 0x0a0a0a)
 *   alpha    : minimap opacity 0–1 (default 0.8)
 *   zoom     : orthographic half-size (default 1500; larger = more of graph visible)
 */
export class MinimapPlugin implements ISpaceGraphPlugin {
    readonly id = 'minimap-plugin';
    readonly name = 'Minimap';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private orthoCamera!: THREE.OrthographicCamera;

    public settings = {
        position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
        size: 160,
        margin: 12,
        bgColor: 0x0a0a0a,
        alpha: 0.8,
        zoom: 1500,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this._buildCamera();

        const dom = this.sg.renderer.renderer.domElement;
        dom.addEventListener('pointerdown', this._onPointerDown);
        dom.addEventListener('pointermove', this._onPointerMove);
        if (typeof window !== 'undefined') {
            window.addEventListener('pointerup', this._onPointerUp);
        }
    }

    private _buildCamera() {
        const z = this.settings.zoom;
        this.orthoCamera = new THREE.OrthographicCamera(-z, z, z, -z, 1, 10000);
        this.orthoCamera.position.set(0, 0, 1000);
        this.orthoCamera.lookAt(0, 0, 0);
    }

    private isDragging = false;

    private _getBounds() {
        const canvas = this.sg.renderer.renderer.domElement;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        const { size, margin } = this.settings;

        let left: number, bottom: number;
        switch (this.settings.position) {
            case 'bottom-left':
                left = margin;
                bottom = margin;
                break;
            case 'top-right':
                left = cw - size - margin;
                bottom = ch - size - margin;
                break;
            case 'top-left':
                left = margin;
                bottom = ch - size - margin;
                break;
            default:
                left = cw - size - margin;
                bottom = margin;
        }
        const top = ch - bottom - size;
        return { left, top, size };
    }

    private _pointerToWorld(px: number, py: number) {
        const { left, top, size } = this._getBounds();
        const nx = ((px - left) / size) * 2 - 1;
        const ny = -(((py - top) / size) * 2 - 1);
        const z = this.settings.zoom;
        return {
            x: this.orthoCamera.position.x + nx * z,
            y: this.orthoCamera.position.y + ny * z,
        };
    }

    private _onPointerDown = (e: PointerEvent) => {
        const { left, top, size } = this._getBounds();
        if (
            e.clientX >= left &&
            e.clientX <= left + size &&
            e.clientY >= top &&
            e.clientY <= top + size
        ) {
            this.isDragging = true;
            const pt = this._pointerToWorld(e.clientX, e.clientY);
            this.sg.cameraControls.flyTo(
                new THREE.Vector3(pt.x, pt.y, 0),
                this.sg.cameraControls.spherical.radius,
            );
            e.stopPropagation();
        }
    };

    private _onPointerMove = (e: PointerEvent) => {
        if (!this.isDragging) return;
        const pt = this._pointerToWorld(e.clientX, e.clientY);
        this.sg.cameraControls.target.set(pt.x, pt.y, 0);
        e.stopPropagation();
    };

    private _onPointerUp = () => {
        this.isDragging = false;
    };

    onPostRender(_delta: number): void {
        this._renderMinimap();
    }

    private _renderMinimap() {
        const renderer = this.sg.renderer.renderer;
        if (!renderer) return;

        const canvas = renderer.domElement;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        const pr = renderer.getPixelRatio();

        const { left, top, size } = this._getBounds();
        const bottom = ch - top - size;

        // Update ortho camera to centre on graph
        const nodes = Array.from(this.sg.graph.nodes.values());
        if (nodes.length) {
            const cx = nodes.reduce((s, n) => s + n.position.x, 0) / nodes.length;
            const cy = nodes.reduce((s, n) => s + n.position.y, 0) / nodes.length;
            this.orthoCamera.position.set(cx, cy, 1000);
            this.orthoCamera.lookAt(cx, cy, 0);
        }

        renderer.setViewport(left * pr, bottom * pr, size * pr, size * pr);
        renderer.setScissor(left * pr, bottom * pr, size * pr, size * pr);
        renderer.setScissorTest(true);
        renderer.setClearColor(this.settings.bgColor, this.settings.alpha);
        renderer.clearColor();
        renderer.render(this.sg.renderer.scene, this.orthoCamera);
        renderer.setScissorTest(false);

        // Restore main viewport
        renderer.setViewport(0, 0, cw * pr, ch * pr);
    }

    dispose(): void {
        const dom = this.sg.renderer.renderer?.domElement;
        if (dom) {
            dom.removeEventListener('pointerdown', this._onPointerDown);
            dom.removeEventListener('pointermove', this._onPointerMove);
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('pointerup', this._onPointerUp);
        }
    }
}
