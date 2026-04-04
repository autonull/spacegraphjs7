import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

/**
 * MinimapPlugin — Renders a thumbnail overview of the graph in a corner overlay.
 *
 * Plugin settings:
 *   position : 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 *   size     : pixel size of the square minimap (default 160)
 *   margin   : px from the edge of the screen (default 12)
 *   bgColor  : minimap background (default 0x0a0a0a)
 *   alpha    : minimap opacity 0–1 (default 0.8)
 *   zoom     : orthographic half-size (default 1500)
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

    private container!: HTMLElement;
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private indicatorColor = 'rgba(139, 92, 246, 0.8)';
    private borderColor = 'rgba(255, 255, 255, 0.1)';

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
        return { left, top, bottom, size, cw, ch };
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
            (this.sg.cameraControls as any).enabled = false;

            const pt = this._pointerToWorld(e.clientX, e.clientY);
            (this.sg.cameraControls as any).setTarget(pt.x, pt.y, 0);

            // Re-render minimap immediately to update indicator
            this._renderMinimap();

            e.stopPropagation();
            e.preventDefault();
        }
    };

    private _onPointerUp = () => {
        if (this.isDragging) {
            this.isDragging = false;
            (this.sg.cameraControls as any).enabled = true;
            this.sg.renderer.renderer.domElement.style.cursor = 'auto';
        }
    };

    private _onPointerMove = (e: PointerEvent) => {
        if (!this.isDragging) return;
        const pt = this._pointerToWorld(e.clientX, e.clientY);
        (this.sg.cameraControls as any).setTarget(pt.x, pt.y, 0);
        this._renderMinimap();
        e.stopPropagation();
    };

    onPostRender(_delta: number): void {
        if (!this.sg || !this.sg.renderer || !this.sg.renderer.renderer) return;
        this._renderMinimap();
    }

    private _renderMinimap() {
        const renderer = this.sg.renderer.renderer;
        if (!renderer) return;

        const canvas = renderer.domElement;
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        const pr = renderer.getPixelRatio();

        const { left, top, bottom, size } = this._getBounds();

        // 1. Center ortho camera around the main scene nodes
        const nodes = Array.from(this.sg.graph.nodes.values());
        if (nodes.length) {
            const box = new THREE.Box3();
            for (const n of nodes) {
                box.expandByPoint(n.position);
            }
            const center = new THREE.Vector3();
            box.getCenter(center);

            this.orthoCamera.position.set(center.x, center.y, 1000);
            this.orthoCamera.lookAt(center.x, center.y, 0);

            // Adjust zoom dynamically based on graph size if needed, or stick to setting
            const graphSize = new THREE.Vector3();
            box.getSize(graphSize);

            // Base zoom on max dim + padding, or user setting if larger
            this.orthoCamera.left = -this.settings.zoom;
            this.orthoCamera.right = this.settings.zoom;
            this.orthoCamera.top = this.settings.zoom;
            this.orthoCamera.bottom = -this.settings.zoom;
            this.orthoCamera.updateProjectionMatrix();
        }

        // 2. Render 3D Scene to Minimap Viewport
        renderer.setViewport(left * pr, bottom * pr, size * pr, size * pr);
        renderer.setScissor(left * pr, bottom * pr, size * pr, size * pr);
        renderer.setScissorTest(true);
        renderer.setClearColor(this.settings.bgColor, this.settings.alpha);
        renderer.clearColor();
        renderer.render(this.sg.renderer.scene, this.orthoCamera);
        renderer.setScissorTest(false);

        // 3. Draw Overlay (Border + Viewport Indicator) using an explicit overlay div or context
        // Instead of managing a separate 2D canvas context every frame, we can use CSS3DRenderer DOM manipulation
        // or just calculate the rect and let the user know. The simplest and most robust way in this WebGL loop
        // is to add an explicit HTML element overlay matching the viewport over the canvas, but since we are drawing
        // straight to WebGL viewport, we'll initialize a dedicated DOM container for the minimap borders/indicator.

        this._updateOverlay(left, top, size, cw, ch);

        // Restore main viewport
        renderer.setViewport(0, 0, cw * pr, ch * pr);
    }

    private _updateOverlay(left: number, top: number, size: number, _cw: number, _ch: number) {
        if (typeof document === 'undefined') return;

        if (!this.container) {
            this.container = DOMUtils.createElement('div');
            this.container.style.position = 'absolute';
            this.container.style.pointerEvents = 'none'; // let pointer events pass through to webgl canvas handler
            this.container.style.border = `2px solid ${this.borderColor}`;
            this.container.style.borderRadius = '8px';
            this.container.style.boxSizing = 'border-box';
            this.container.style.overflow = 'hidden';
            this.container.style.zIndex = '9997'; // Below HUD but above WebGL

            const indicator = DOMUtils.createElement('div');
            indicator.id = 'sg-minimap-indicator';
            indicator.style.position = 'absolute';
            indicator.style.border = `1px solid ${this.indicatorColor}`;
            indicator.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
            indicator.style.boxSizing = 'border-box';

            this.container.appendChild(indicator);
            this.sg.renderer.container.appendChild(this.container);
        }

        // Update container bounds
        this.container.style.left = `${left}px`;
        this.container.style.top = `${top}px`;
        this.container.style.width = `${size}px`;
        this.container.style.height = `${size}px`;

        // Calculate the main camera frustum bounds in world space
        const mainCam = this.sg.renderer.camera;
        // z-plane distance from camera to controls target
        const dist = mainCam.position.distanceTo(this.sg.cameraControls.target);
        const vFov = (mainCam.fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
        const visibleWidth = visibleHeight * mainCam.aspect;

        const target = this.sg.cameraControls.target;

        // Map target to minimap coordinates
        const mapX =
            ((target.x - this.orthoCamera.position.x) / (this.settings.zoom * 2)) * size + size / 2;
        // y is inverted
        const mapY =
            -((target.y - this.orthoCamera.position.y) / (this.settings.zoom * 2)) * size +
            size / 2;

        const mapW = (visibleWidth / (this.settings.zoom * 2)) * size;
        const mapH = (visibleHeight / (this.settings.zoom * 2)) * size;

        const indicator = this.container.querySelector('#sg-minimap-indicator') as HTMLElement;
        if (indicator) {
            indicator.style.left = `${mapX - mapW / 2}px`;
            indicator.style.top = `${mapY - mapH / 2}px`;
            indicator.style.width = `${mapW}px`;
            indicator.style.height = `${mapH}px`;
        }
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
