import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import type { SpaceGraph } from '../SpaceGraph';
import { InstancedNodeRenderer } from '../rendering/InstancedNodeRenderer';
import { DOMNode } from '../nodes/DOMNode';

const CSS_STYLES = { position: 'absolute', top: '0px', left: '0px', pointerEvents: 'none' } as const;
const OPT_INTERVAL_MS = 250;

export interface RenderOptions {
  antialias?: boolean;
  alpha?: boolean;
  backgroundColor?: string | number;
  pixelRatio?: number;
}

export class Renderer {
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
  private lastOptTime = 0;
  private optFrames = 0;
  private fps = 60;
  private timeSinceLastOptCheck = 0;

  constructor(
    public sg: SpaceGraph,
    public container: HTMLElement,
    options: RenderOptions = {},
  ) {
    const pixelRatio = options.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    const bgColor = options.backgroundColor ?? 0x1a1a2e;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bgColor);

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
    this.renderer.setClearColor(bgColor, (options.alpha ?? true) ? 0 : 1);
    container.appendChild(this.renderer.domElement);
    container.style.position = 'relative';

    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(this.cssRenderer.domElement.style, CSS_STYLES);
    container.appendChild(this.cssRenderer.domElement);

    this.instancedRenderer = new InstancedNodeRenderer(sg, this.scene);
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();

    this._resizeObserver = new ResizeObserver(() => this.onResize());
    this._resizeObserver.observe(container);
  }

  init(): void {
    if (this._threePatched) return;
    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree as any;
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree as any;
    THREE.Mesh.prototype.raycast = acceleratedRaycast as any;
    this._threePatched = true;
  }

  private onResize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
  }

  scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.render();
    });
  }

  render(): void {
    this.instancedRenderer.update();
    for (const edge of this.sg.graph.edges.values()) edge.update?.();
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

    if (this.timeSinceLastOptCheck >= OPT_INTERVAL_MS) {
      this.fps = (this.optFrames * 1000) / this.timeSinceLastOptCheck;
      this.optFrames = 0;
      this.timeSinceLastOptCheck = 0;
    }
  }

  getFPS(): number { return this.fps; }

  updateCulling(): void {
    this.camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    for (const node of this.sg.graph.nodes.values()) {
      const visible = this.frustum.containsPoint(node.position);
      if (node instanceof DOMNode) node.setVisibility(visible);
      else node.object.visible = visible;
    }
  }

  async exportPNG(scale = 1): Promise<Blob> {
    this.render();
    return new Promise<Blob>((resolve, reject) => {
      this.renderer.domElement.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
        'image/png',
        scale,
      );
    });
  }

  dispose(): void {
    this._resizeObserver?.disconnect();
    this.instancedRenderer.dispose();
    this.renderer.dispose();
    this.cssRenderer.domElement.remove();
    this.renderer.domElement.remove();
  }
}
