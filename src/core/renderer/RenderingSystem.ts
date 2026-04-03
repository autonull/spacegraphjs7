// SpaceGraphJS v7.0 - Rendering System
// Three.js rendering abstraction with WebGL and CSS3D support

import * as THREE from 'three';
import { WebGLRenderer } from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

/**
 * Rendering options
 */
export interface RenderOptions {
    antialias?: boolean;
    alpha?: boolean;
    backgroundColor?: string | number;
    pixelRatio?: number;
}

/**
 * Rendering System
 * Manages WebGL and CSS3D renderers
 */
export class RenderingSystem {
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    private webglRenderer: WebGLRenderer;
    private cssRenderer: CSS3DRenderer;
    private container: HTMLElement;
    private options: RenderOptions;
    private renderScheduled = false;

    constructor(container: HTMLElement, options: RenderOptions = {}) {
        this.container = container;
        this.options = {
            antialias: options.antialias ?? true,
            alpha: options.alpha ?? true,
            backgroundColor: options.backgroundColor ?? 0x1a1a2e,
            pixelRatio: options.pixelRatio ?? Math.min(window.devicePixelRatio, 2),
        };

        // Create scene
        this.scene = new THREE.Scene();

        // Create camera
        this.camera = this.createCamera();

        // Create renderers
        this.webglRenderer = this.createWebGLRenderer();
        this.cssRenderer = this.createCSSRenderer();

        // Setup container
        this.setupContainer();

        // Handle resize
        this.setupResizeHandler();
    }

    private createCamera(): THREE.PerspectiveCamera {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        camera.position.set(0, 0, 500);
        return camera;
    }

    private createWebGLRenderer(): WebGLRenderer {
        const renderer = new WebGLRenderer({
            antialias: this.options.antialias,
            alpha: this.options.alpha,
            preserveDrawingBuffer: true, // For exportPNG
        });

        renderer.setPixelRatio(this.options.pixelRatio!);
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        renderer.setClearColor(this.options.backgroundColor as number, this.options.alpha ? 0 : 1);

        return renderer;
    }

    private createCSSRenderer(): CSS3DRenderer {
        const renderer = new CSS3DRenderer();
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        return renderer;
    }

    private setupContainer(): void {
        // Append renderers to container
        this.container.appendChild(this.webglRenderer.domElement);
        this.container.appendChild(this.cssRenderer.domElement);

        // Position CSS renderer on top
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0';
        this.cssRenderer.domElement.style.left = '0';
        this.cssRenderer.domElement.style.pointerEvents = 'none';

        // Allow pointer events on CSS3D objects
        const cssObjects = this.cssRenderer.domElement.querySelectorAll('.spacegraph-html-node');
        cssObjects.forEach((el) => {
            if (el instanceof HTMLElement) {
                el.style.pointerEvents = 'auto';
            }
        });
    }

    private setupResizeHandler(): void {
        const resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });
        resizeObserver.observe(this.container);
    }

    private handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.webglRenderer.setSize(width, height);
        this.cssRenderer.setSize(width, height);
    }

    /**
     * Add object to scene
     */
    add(object: THREE.Object3D): void {
        this.scene.add(object);
        this.scheduleRender();
    }

    /**
     * Remove object from scene
     */
    remove(object: THREE.Object3D): void {
        this.scene.remove(object);
        this.scheduleRender();
    }

    /**
     * Schedule a render
     */
    scheduleRender(): void {
        if (this.renderScheduled) return;

        this.renderScheduled = true;
        requestAnimationFrame(() => {
            this.renderScheduled = false;
            this.render();
        });
    }

    /**
     * Render the scene
     */
    render(): void {
        this.webglRenderer.render(this.scene, this.camera);
        this.cssRenderer.render(this.scene, this.camera);
    }

    /**
     * Export current frame as PNG
     */
    async exportPNG(scale: number = 1): Promise<Blob> {
        // Ensure rendered
        this.render();

        return new Promise((resolve, reject) => {
            this.webglRenderer.domElement.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('toBlob failed'));
                    }
                },
                'image/png',
                scale,
            );
        });
    }

    /**
     * Get WebGL renderer
     */
    getWebGLRenderer(): WebGLRenderer {
        return this.webglRenderer;
    }

    /**
     * Get CSS3D renderer
     */
    getCSSRenderer(): CSS3DRenderer {
        return this.cssRenderer;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.webglRenderer.dispose();
        this.cssRenderer.domElement.remove();
        this.webglRenderer.domElement.remove();
    }
}
