import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import type { SpaceGraph } from '../SpaceGraph';
export declare class Renderer {
    sg: SpaceGraph;
    container: HTMLElement;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    cssRenderer: CSS3DRenderer;
    constructor(sg: SpaceGraph, container: HTMLElement);
    init(): void;
    private onResize;
    render(): void;
}
