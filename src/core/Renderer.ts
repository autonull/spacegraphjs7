import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import type { SpaceGraph } from '../SpaceGraph';
import { InstancedNodeRenderer } from '../rendering/InstancedNodeRenderer';
import { DOMNode } from '../nodes/DOMNode';

const CSS_RENDERER_STYLES = {
    position: 'absolute',
    top: '0px',
    left: '0px',
    pointerEvents: 'none',
} as const;

const OPTIMIZER_CHECK_INTERVAL_MS = 250;

export interface RenderOptions {
    antialias?: boolean;
    alpha?: boolean;
    backgroundColor?: string | number;
    pixelRatio?: number;
}

export class Renderer {
    public sg: SpaceGraph;
    public container: HTMLElement;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public cssRenderer: CSS3DRenderer;
    public instancedRenderer: InstancedNodeRenderer;

    private _resizeObserver: ResizeObserver | null = null;
    private _threePatched = false;
    private renderScheduled = false;

    private frustum: THREE.Frustum;
    private projScreenMatrix: THREE.Matrix4;

    private lastOptTime: number = 0;
    private optFrames: number = 0;
    private fps: number = 60;
    private timeSinceLastOptCheck: number = 0;

    constructor(sg: SpaceGraph, container: HTMLElement, options: RenderOptions = {}) {
        this.sg = sg;
        this.container = container;

        const pixelRatio = options.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
        const backgroundColor = options.backgroundColor ?? 0x1a1a2e;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(backgroundColor);

        const aspect = container.clientWidth / (container.clientHeight || 1);
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 0, 500);

        this.renderer = new THREE.WebGLRenderer({
            antialias: options.antialias ?? true,
            alpha: options.alpha ?? true,
            preserveDrawingBuffer: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setClearColor(backgroundColor, (options.alpha ?? true) ? 0 : 1);
        container.appendChild(this.renderer.domElement);
        container.style.position = 'relative';

        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(container.clientWidth, container.clientHeight);
        Object.assign(this.cssRenderer.domElement.style, CSS_RENDERER_STYLES);
        container.appendChild(this.cssRenderer.domElement);

        this.instancedRenderer = new InstancedNodeRenderer(sg, this.scene);

        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();

        this._resizeObserver = new ResizeObserver(() => this.onResize());
        this._resizeObserver.observe(container);
    }

    public init() {
        if (this._threePatched) return;
        THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        THREE.Mesh.prototype.raycast = acceleratedRaycast;
        this._threePatched = true;
    }

    private onResize() {
        if (!this.container) return;
        const { clientWidth: width, clientHeight: height } = this.container;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.cssRenderer.setSize(width, height);
    }

    scheduleRender(): void {
        if (this.renderScheduled) return;
        this.renderScheduled = true;
        requestAnimationFrame(() => {
            this.renderScheduled = false;
            this.render();
        });
    }

    public render() {
        this.instancedRenderer.update();
        for (const [, edge] of this.sg.graph.edges) {
            edge.update?.();
        }
        this.cssRenderer.render(this.scene, this.camera);
        this.renderer.render(this.scene, this.camera);
    }

    beginFrameOptimization(timestamp: number): void {
        if (this.lastOptTime === 0) {
            this.lastOptTime = timestamp;
            return;
        }
        const delta = timestamp - this.lastOptTime;
        this.lastOptTime = timestamp;
        this.optFrames++;
        this.timeSinceLastOptCheck += delta;
        if (this.timeSinceLastOptCheck >= OPTIMIZER_CHECK_INTERVAL_MS) {
            this.fps = (this.optFrames * 1000) / this.timeSinceLastOptCheck;
            this.optFrames = 0;
            this.timeSinceLastOptCheck = 0;
        }
    }

    getFPS(): number {
        return this.fps;
    }

    updateCulling(): void {
        this.camera.updateMatrixWorld();
        this.projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse,
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
        for (const node of this.sg.graph.nodes.values()) {
            const inFrustum = this.frustum.containsPoint(node.position);
            if (node instanceof DOMNode) {
                node.setVisibility(inFrustum);
            } else {
                node.object.visible = inFrustum;
            }
        }
    }

    async exportPNG(scale = 1): Promise<Blob> {
        this.render();
        return new Promise((resolve, reject) => {
            this.renderer.domElement.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('toBlob failed'));
                },
                'image/png',
                scale,
            );
        });
    }

    public dispose() {
        this._resizeObserver?.disconnect();
        this.instancedRenderer.dispose();
        this.renderer.dispose();
        this.cssRenderer.domElement.remove();
        this.renderer.domElement.remove();
    }
}
