import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import type { SpaceGraph } from '../SpaceGraph';
import { CullingManager } from '../utils/CullingManager';
import { LODManager } from '../utils/LODManager';

export class Renderer {
  public sg: SpaceGraph;
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cssRenderer: CSS3DRenderer;

  public cullingManager: CullingManager;
  public lodManager: LODManager;

  constructor(sg: SpaceGraph, container: HTMLElement) {
    this.sg = sg;
    this.container = container;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Camera setup
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
    this.camera.position.set(0, 0, 500);

    // WebGL Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // CSS3D Renderer setup
    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0px';
    this.cssRenderer.domElement.style.pointerEvents = 'none'; // let WebGL handle primary pointer events initially
    this.container.appendChild(this.cssRenderer.domElement);

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Initialize Performance Systems
    this.cullingManager = new CullingManager();
    this.cullingManager.setCamera(this.camera);

    this.lodManager = new LODManager();
    this.lodManager.setCamera(this.camera);
  }

  public init() {
    console.log('[SpaceGraph Renderer] Initialized');

    // Wire up global accelerated raycasting
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
    this.cullingManager.update();
    this.lodManager.update();

    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);
  }
}
