import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from '../nodes/Node';
import { InstancedNodeRenderer } from '../rendering/InstancedNodeRenderer';
import type { SpaceGraph } from '../SpaceGraph';
import type { CameraViewport, CardFacing, Projection, RenderOptions } from '../types';
import { parseColor } from '../utils/color';
import {
  fitOrthoFrustum,
  setOrthoFrustum,
  visibleWorldExtent,
} from '../utils/CameraUtils';
import { declutterLabels, type LabelRect } from '../utils/labelDeclutter';
import { RenderContext } from './RenderContext';
import { clamp, denormalizeZoom, normalizeZoom, type ZoomRange } from './zoom';

const CSS_STYLES = {
  position: 'absolute',
  top: '0px',
  left: '0px',
  pointerEvents: 'none',
} as const;
const OPT_INTERVAL_MS = 250;
const LABEL_DECLUTTER_CAP = 200;
const FOV = 75;
const NEAR = 0.1;
const FAR = 10000;
const ORTHO_FAR = 100000;
const DEFAULT_DISTANCE = 500;
const PERSPECTIVE_DISTANCE: ZoomRange = { min: 10, max: 10000, closerIsLarger: false };
const ORTHO_ZOOM: ZoomRange = { min: 0.01, max: 100, closerIsLarger: true };

export class WebGLRenderer {
  public scene: THREE.Scene;
  public perspectiveCamera: THREE.PerspectiveCamera;
  public orthographicCamera: THREE.OrthographicCamera;
  public renderer: THREE.WebGLRenderer;
  public cssRenderer: CSS3DRenderer;
  public css2dRenderer: CSS2DRenderer;
  public instancedRenderer: InstancedNodeRenderer;
  public renderContext: RenderContext;

  private _projection: Projection;
  private _cardFacing: CardFacing = 'plane';
  private _bgColor: number;
  private _depthFade = 0;
  private _resizeObserver: ResizeObserver | null = null;
  /**
   * The surface size, as last measured. Reading `clientWidth` forces the browser to lay the page
   * out, and the viewport is asked for it every frame; the size only changes when the surface
   * does, so it is measured on the resize instead.
   */
  #size = { width: 1, height: 1 };
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
    const bgColor = parseColor(options.backgroundColor ?? 0x1a1a2e);
    this._bgColor = bgColor;

    this.scene = new THREE.Scene();
    this.scene.background = transparent ? null : new THREE.Color(bgColor);

    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.perspectiveCamera = new THREE.PerspectiveCamera(FOV, aspect, NEAR, FAR);
    this.perspectiveCamera.position.set(0, 0, DEFAULT_DISTANCE);
    this.orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, ORTHO_FAR);
    this.orthographicCamera.position.copy(this.perspectiveCamera.position);
    this._projection = options.projection ?? 'perspective';
    this.#fitOrthographicFrustum(DEFAULT_DISTANCE, aspect);

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
      touchAction: 'none',
      pointerEvents: 'auto',
    });
    container.appendChild(this.renderer.domElement);
    container.style.position = 'relative';

    this.cssRenderer = new CSS3DRenderer();
    this.#mountCssLayer(container, this.cssRenderer, '1');

    // CSS2D layer for edge labels; keeps text at a constant screen size across zoom.
    this.css2dRenderer = new CSS2DRenderer();
    this.#mountCssLayer(container, this.css2dRenderer, '2');

    this.instancedRenderer = new InstancedNodeRenderer(sg, this.scene);
    this.projScreenMatrix = new THREE.Matrix4();

    this.renderContext = new RenderContext(
      this.camera,
      { width: container.clientWidth, height: container.clientHeight },
      0.5
    );
    this.#size = { width: container.clientWidth, height: container.clientHeight };

    this._resizeObserver = new ResizeObserver(() => this.syncSize());
    this._resizeObserver.observe(container);
  }

  get projection(): Projection {
    return this._projection;
  }

  /** The surface size, as last measured. Reading it costs nothing; measuring it costs a layout. */
  get surfaceSize(): { width: number; height: number } {
    return this.#size;
  }

  // The active camera. Both stay in sync; hosts switch with setProjection.
  get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this._projection === 'orthographic' ? this.orthographicCamera : this.perspectiveCamera;
  }

  setProjection(projection: Projection, target?: THREE.Vector3): this {
    if (projection === this._projection) return this;
    this.sg.cameraControls?.cancelTweens();
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
      this.#fitOrthographicFrustum(
        distance,
        this.container.clientWidth / (this.container.clientHeight || 1)
      );
    }
    this.renderContext?.setCamera(to);
    this.syncSize();
    return this;
  }

  // T1.8: the orthographic range follows the last fitted frame, so normalized zoom covers only the
  // useful band and the host's 0..1 control can never reach an empty canvas.
  #orthoRange(): ZoomRange {
    const range = this.sg?.cameraControls?.getOrthoZoomRange?.();
    return range ? { min: range.min, max: range.max, closerIsLarger: true } : ORTHO_ZOOM;
  }

  // Normalized 0..1 zoom; 1 is closest. Perspective uses camera distance, ortho uses frustum zoom.
  getZoom(): number {
    if (this._projection === 'orthographic') {
      return normalizeZoom(this.orthographicCamera.zoom, this.#orthoRange());
    }
    const distance = this.sg.cameraControls?.spherical.radius ?? this.camera.position.length();
    return normalizeZoom(distance, PERSPECTIVE_DISTANCE);
  }

  setZoom(value: number): this {
    const v = clamp(value, 0, 1);
    this.sg.cameraControls?.cancelTweens();
    if (this._projection === 'orthographic') {
      this.orthographicCamera.zoom = denormalizeZoom(v, this.#orthoRange());
      this.orthographicCamera.updateProjectionMatrix();
    } else if (this.sg.cameraControls) {
      this.sg.cameraControls.spherical.radius = denormalizeZoom(v, PERSPECTIVE_DISTANCE);
    }
    return this;
  }

  getViewport(): CameraViewport {
    return { ...this.getCameraState(), extent: this.getWorldExtent() };
  }

  /** The camera's frame without the world extent: cheap enough to ask for every frame. */
  getCameraState(): { zoom: number; center: [number, number, number]; distance: number } {
    const cc = this.sg.cameraControls;
    return {
      zoom: this.getZoom(),
      center: cc ? [cc.target.x, cc.target.y, cc.target.z] : [0, 0, 0],
      distance: cc ? cc.spherical.radius : this.camera.position.length(),
    };
  }

  /** Visible world width/height in the camera's XY plane, for host-side minimaps. */
  getWorldExtent(): { width: number; height: number } {
    if (this._projection === 'orthographic') {
      return visibleWorldExtent(this.orthographicCamera, 0);
    }
    const aspect = (this.#size.width || 1) / (this.#size.height || 1);
    const cam = this.perspectiveCamera;
    const dist = this.sg.cameraControls?.spherical.radius ?? cam.position.length();
    return visibleWorldExtent(cam, dist, aspect);
  }

  /** LE.14: exponential depth attenuation toward the theme background; `density <= 0` clears the fog. */
  setDepthFade(density: number): this {
    if (this._depthFade === density) return this;
    this._depthFade = density;
    this.scene.fog = density > 0 ? new THREE.FogExp2(this._bgColor, density) : null;
    this.sg.requestFrame?.();
    return this;
  }

  /**
   * How the DOM cards face the camera. `plane` leaves a card lying in the content plane; `camera`
   * turns it to face the reader, which is what a tilted depth treatment needs — a flat card is
   * sheared into a quadrilateral and its text stops being readable (T1.19).
   */
  setCardFacing(facing: CardFacing): this {
    this._cardFacing = facing;
    this.sg.requestFrame?.();
    return this;
  }

  get cardFacing(): CardFacing {
    return this._cardFacing;
  }

  init(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);    this.scene.add(ambientLight);
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
    this.#declutterLabels();
    this.renderer.render(this.scene, camera);

    this.renderContext?.endFrame();
  }

  // Hide edge labels that would overlap a higher-priority neighbour or a DOM card this frame. Cheap
  // for small label counts; skipped entirely above the cap so large graphs never pay the cost.
  #declutterLabels(): void {
    const entries: Array<{ el?: HTMLElement; rect: LabelRect }> = [];
    for (const edge of this.sg.graph.edges.values()) {
      const el = edge?.labelElement;
      if (!el) continue;
      const { left, top, width, height } = el.getBoundingClientRect();
      entries.push({ el, rect: { id: `edge:${edge.id}`, left, top, width, height } });
      if (entries.length >= LABEL_DECLUTTER_CAP) break;
    }
    // DOM cards are obstacles, never hidden: a label overlapping a card loses.
    for (const node of this.sg.graph.nodes.values()) {
      const el = (node as { domElement?: HTMLElement } | undefined)?.domElement;
      if (!el || !node.object.visible) continue;
      const { left, top, width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) continue;
      entries.push({ rect: { id: `node:${node.id}`, left, top, width, height, priority: 1 } });
      if (entries.length >= LABEL_DECLUTTER_CAP * 2) break;
    }
    if (entries.length < 2) return;
    const hidden = declutterLabels(entries.map((entry) => entry.rect));
    for (const entry of entries) {
      if (entry.el) entry.el.style.opacity = hidden.has(entry.rect.id) ? '0' : '';
    }
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

  /** Mount a CSS layer over the canvas, behind the chrome the host draws on top. */
  #mountCssLayer(
    container: HTMLElement,
    layer: { domElement: HTMLElement; setSize(width: number, height: number): void },
    zIndex: string
  ): void {
    layer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(layer.domElement.style, CSS_STYLES);
    layer.domElement.style.zIndex = zIndex;
    container.appendChild(layer.domElement);
  }

  #fitOrthographicFrustum(distance: number, aspect: number): void {
    fitOrthoFrustum(
      this.orthographicCamera,
      this.perspectiveCamera.fov,
      Math.max(distance, 1e-3),
      aspect
    );
  }

  /**
   * Re-measure the container and update the camera's frustum, the drawing buffers and the edge
   * resolution to match it.
   *
   * The ResizeObserver calls this, but it delivers its notification asynchronously: a fit that
   * measures before it runs frames the content for a surface that no longer exists, and the frame
   * then changes when the observer arrives. A fit therefore syncs the size first (T6.20).
   */
  syncSize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.#size = { width: w, height: h };
    const aspect = w / (h || 1);
    if (this._projection === 'orthographic') {
      const height = this.orthographicCamera.top - this.orthographicCamera.bottom || 1;
      setOrthoFrustum(this.orthographicCamera, height, aspect);
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

/** @deprecated Renamed to {@link WebGLRenderer}; resolve the contract/adapters via `@spacegraphjs/renderer`. */
export { WebGLRenderer as Renderer };
