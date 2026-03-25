import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import type { SpaceGraph } from '../SpaceGraph';
import { InstancedNodeRenderer } from '../rendering/InstancedNodeRenderer';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Renderer');

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

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 0, 500);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.container.style.position = 'relative';

        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
        Object.assign(this.cssRenderer.domElement.style, {
            position:      'absolute',
            top:           '0px',
            left:          '0px',
            pointerEvents: 'none',
        });
        this.container.appendChild(this.cssRenderer.domElement);

        this.instancedRenderer = new InstancedNodeRenderer(sg, this.scene);

        window.addEventListener('resize', () => this.onResize());
    }

    public init() {
        logger.info('Initialized');

        THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        THREE.Mesh.prototype.raycast = acceleratedRaycast;
    }

    private onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.cssRenderer.setSize(width, height);
    }

    public render() {
        this.instancedRenderer.update();
        // Sync all edge geometries to current node positions immediately before
        // rendering so they always match the CSS3D layer regardless of when
        // layout plugins or GSAP animations last updated node.position.
        for (const edge of this.sg.graph.edges) {
            if (typeof edge.update === 'function') edge.update();
        }
        this.renderer.render(this.scene, this.camera);
        this.cssRenderer.render(this.scene, this.camera);
    }

    public dispose() {
        this.instancedRenderer.dispose();
        this.renderer.dispose();
        if (this.cssRenderer.domElement.parentNode) {
            this.cssRenderer.domElement.parentNode.removeChild(this.cssRenderer.domElement);
        }
    }
}
