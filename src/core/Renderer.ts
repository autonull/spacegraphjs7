import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from '../nodes/Node';
import { InstancedNodeRenderer } from '../rendering/InstancedNodeRenderer';
import type { SpaceGraph } from '../SpaceGraph';
import type { CameraViewport, Projection, RenderOptions } from '../types';
import { RenderContext } from './RenderContext';
import { clamp, denormalizeZoom, normalizeZoom, type ZoomRange } from './zoom';

const CSS_STYLES = {
  position: 'absolute',
  top: '0px',
  left: '0px',
  pointerEvents: 'none',
} as const;
const OPT_INTERVAL_MS = 250;
const FOV = 75;
const NEAR = 0.1;
const FAR = 10000;
const ORTHO_FAR = 100000;
const DEFAULT_DISTANCE = 500;
const PERSPECTIVE_DISTANCE: ZoomRange = { min: 10, max: 10000, closerIsLarger: false };
const ORTHO_ZOOM: ZoomRange = { min: 0.01, max: 100, closerIsLarger: true };

export class Renderer {
  public scene: THREE.Scene;
  public perspectiveCamera: THREE.PerspectiveCamera;
  public orthographicCamera: THREE.OrthographicCamera;
  public renderer: THREE.WebGLRenderer;
  public cssRenderer: CSS3DRenderer;
  public css2dRenderer: CSS2DRenderer;
  public instancedRenderer: InstancedNodeRenderer;
  public renderContext: RenderContext;

  private _projection: Projection;
  private _resizeObserver: ResizeObserver | null = null;
  private renderScheduled = false;
  readonly projScreenMatrix: THREE.Matrix4;
  private lastOptTime = 0;
  private optFrames = 0;
  private fps = 60;
  private timeSinceLastOptCheck = 0;

  constructor(
    public sg: SpaceGraph,
    public container: HTMLElement,
    options: RenderOptions = {}
  ) {
    const pixelRatio = options.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    const transparent = options.transparent ?? false;
    const alpha = options.alpha ?? true;
    const bgColor = options.backgroundColor ?? 0x1a1a2e;

    this.scene = new THREE.Scene();
    this.scene.background = transparent ? null : new THREE.Color(bgColor);

    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.perspectiveCamera = new THREE.PerspectiveCamera(FOV, aspect, NEAR, FAR);
    this.perspectiveCamera.position.set(0, 0, DEFAULT_DISTANCE);
    this.orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, ORTHO_FAR);
    this.orthographicCamera.position.copy(this.perspectiveCamera.position);
    this._projection = options.projection ?? 'perspective';
    this.#fitOrthoFrustum(DEFAULT_DISTANCE, aspect);

    this.renderer = new THREE.WebGLRenderer({
      antialias: options.antialias ?? true,
      alpha: alpha || transparent,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setClearColor(bgColor, transparent ? 0 : alpha ? 0 : 1);
    Object.assign(this.renderer.domElement.style, {
      position: 'absolute',
      top: '0px',
      left: '0px',
      zIndex: '0',
    });
    container.appendChild(this.renderer.domElement);
    container.style.position = 'relative';

    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(this.cssRenderer.domElement.style, CSS_STYLES);
    this.cssRenderer.domElement.style.zIndex = '1';
    container.appendChild(this.cssRenderer.domElement);

    // CSS2D layer for edge labels; keeps text at a constant screen size across zoom.
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(this.css2dRenderer.domElement.style, CSS_STYLES);
    this.css2dRenderer.domElement.style.zIndex = '2';
    container.appendChild(this.css2dRenderer.domElement);

    this.instancedRenderer = new InstancedNodeRenderer(sg, this.scene);
    this.projScreenMatrix = new THREE.Matrix4();

    this.renderContext = new RenderContext(
      this.camera,
      { width: container.clientWidth, height: container.clientHeight },
      0.5
    );

    this._resizeObserver = new ResizeObserver(() => this.onResize());
    this._resizeObserver.observe(container);
  }

  get projection(): Projection {
    return this._projection;
  }

  // The active camera. Both stay in sync; hosts switch with setProjection.
  get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this._projection === 'orthographic' ? this.orthographicCamera : this.perspectiveCamera;
  }

  setProjection(projection: Projection, target?: THREE.Vector3): this {
    if (projection === this._projection) return this;
    const from = this.camera;
    this._projection = projection;
    const to = this.camera;
    to.position.copy(from.position);
    to.quaternion.copy(from.quaternion);
    if (projection === 'orthographic') {
      const distance = target
        ? this.perspectiveCamera.position.distanceTo(target)
        : this.perspectiveCamera.position.length();
      this.orthographicCamera.zoom = 1;
      this.#fitOrthoFrustum(distance, this.container.clientWidth / (this.container.clientHeight || 1));
    }
    this.renderContext?.setCamera(to);
    this.onResize();
    return this;
  }

  // Normalized 0..1 zoom; 1 is closest. Perspective uses camera distance, ortho uses frustum zoom.
  getZoom(): number {
    if (this._projection === 'orthographic') {
      return normalizeZoom(this.orthographicCamera.zoom, ORTHO_ZOOM);
    }
    const distance = this.sg.cameraControls?.spherical.radius ?? this.camera.position.length();
    return normalizeZoom(distance, PERSPECTIVE_DISTANCE);
  }

  setZoom(value: number): this {
    const v = clamp(value, 0, 1);
    if (this._projection === 'orthographic') {
      this.orthographicCamera.zoom = denormalizeZoom(v, ORTHO_ZOOM);
      this.orthographicCamera.updateProjectionMatrix();
    } else if (this.sg.cameraControls) {
      this.sg.cameraControls.spherical.radius = denormalizeZoom(v, PERSPECTIVE_DISTANCE);
    }
    return this;
  }

  getViewport(): CameraViewport {
    const cc = this.sg.cameraControls;
    return {
      zoom: this.getZoom(),
      center: cc ? [cc.target.x, cc.target.y, cc.target.z] : [0, 0, 0],
      distance: cc ? cc.spherical.radius : this.camera.position.length(),
    };
  }

  init(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);
  }

  scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame((ts) => {
      this.renderScheduled = false;
      this.render(ts);
    });
  }

  render(timestamp = 0): void {
    if (timestamp > 0) {
      this.beginFrameOptimization(timestamp);
    }
    this.renderContext?.startFrame(timestamp);

    const camera = this.camera;
    camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.renderContext?.updateFrustum(this.projScreenMatrix);
    this.renderContext?.updateCameraPosition();

    this.instancedRenderer.update();
    for (const edge of this.sg.graph.edges.values()) {
      if (edge) edge.update?.();
    }

    Node.lodFrame++;
    const ctx = this.renderContext;
    if (ctx) {
      for (const node of this.sg.graph.nodes.values()) {
        if (!node) continue;
        node.object.visible = ctx.shouldRender(node) && node.visible;
      }
    }

    this.cssRenderer.render(this.scene, camera);
    this.css2dRenderer.render(this.scene, camera);
    this.renderer.render(this.scene, camera);

    this.renderContext?.endFrame();
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

  getFPS(): number {
    return this.fps;
  }

  async exportPNG(scale = 1): Promise<Blob> {
    this.render();
    return new Promise<Blob>((resolve, reject) => {
      this.renderer.domElement.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/png',
        scale
      );
    });
  }

  dispose(): void {
    this._resizeObserver?.disconnect();
    this.instancedRenderer.dispose();
    this.renderer.dispose();
    this.css2dRenderer.domElement.remove();
    this.cssRenderer.domElement.remove();
    this.renderer.domElement.remove();
  }

  #fitOrthoFrustum(distance: number, aspect: number): void {
    const height = 2 * Math.max(distance, 1e-3) * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const width = height * (aspect || 1);
    this.orthographicCamera.left = -width / 2;
    this.orthographicCamera.right = width / 2;
    this.orthographicCamera.top = height / 2;
    this.orthographicCamera.bottom = -height / 2;
    this.orthographicCamera.updateProjectionMatrix();
  }

  private onResize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    const aspect = w / (h || 1);
    if (this._projection === 'orthographic') {
      const height = this.orthographicCamera.top - this.orthographicCamera.bottom || 1;
      const width = height * aspect;
      this.orthographicCamera.left = -width / 2;
      this.orthographicCamera.right = width / 2;
      this.orthographicCamera.updateProjectionMatrix();
    } else {
      this.perspectiveCamera.aspect = aspect;
      this.perspectiveCamera.updateProjectionMatrix();
    }
    this.renderer.setSize(w, h);
    this.cssRenderer.setSize(w, h);
    this.css2dRenderer.setSize(w, h);
    this.renderContext?.updateViewport({ width: w, height: h });

    const resolution = new THREE.Vector2(w, h);
    for (const edge of this.sg.graph.edges.values()) {
      if (edge.line?.material && (edge.line.material as any).isLineMaterial) {
        (edge.line.material as any).resolution.copy(resolution);
      }
    }
    this.sg.requestFrame?.();
  }
}
