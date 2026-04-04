import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import type { SpaceGraph } from '../SpaceGraph';
import { InstancedNodeRenderer } from '../rendering/InstancedNodeRenderer';

const CSS_RENDERER_STYLES = {
    position: 'absolute',
    top: '0px',
    left: '0px',
    pointerEvents: 'none',
} as const;

export class Renderer {
    public sg: SpaceGraph;
    public container: HTMLElement;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public cssRenderer: CSS3DRenderer;
    public instancedRenderer: InstancedNodeRenderer;

    constructor(sg: SpaceGraph, container: HTMLElement) {
        this.sg = sg;
        this.container = container;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        const aspect = container.clientWidth / (container.clientHeight || 1);
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 0, 500);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);
        container.style.position = 'relative';

        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(container.clientWidth, container.clientHeight);
        Object.assign(this.cssRenderer.domElement.style, CSS_RENDERER_STYLES);
        container.appendChild(this.cssRenderer.domElement);

        this.instancedRenderer = new InstancedNodeRenderer(sg, this.scene);

        this._resizeHandler = () => this.onResize();
        window.addEventListener('resize', this._resizeHandler);
    }

    private _resizeHandler: (() => void) | null = null;
    private _threePatched = false;

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

    public render() {
        this.instancedRenderer.update();
        for (const [, edge] of this.sg.graph.edges) {
            edge.update?.();
        }
        this.cssRenderer.render(this.scene, this.camera);
        this.renderer.render(this.scene, this.camera);
    }

    public dispose() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        this.instancedRenderer.dispose();
        this.renderer.dispose();
        this.cssRenderer.domElement.parentNode?.removeChild(this.cssRenderer.domElement);
    }
}
