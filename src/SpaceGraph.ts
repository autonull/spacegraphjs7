import {
  CameraControls,
  MathPool,
  ObjectPoolManager,
  PluginManager,
  VisionManager,
} from './core';
import { InputManager } from './input';
import { FingeringPriority, Performance } from './core/constants';
import {
  createQuickGraphSpec,
  DEFAULT_CHROME_PLUGINS,
  DEFAULT_EDGE_TYPES,
  DEFAULT_LAYOUT_PLUGINS,
  DEFAULT_NODE_TYPES,
  DEFAULT_SYSTEM_PLUGINS,
  nodeTypeName,
  type PluginCtor,
} from './core/defaults';

import { ErgonomicsAPI } from './core/Ergonomics';
import { EventSystem } from './core/events/EventSystem';
// SpaceGraph.ts - Core graph visualization engine
import { forwardGraphEvents } from './core/forwardEvents';
import { Graph } from './core/Graph';
import { WebGLRenderer } from './core/WebGLRenderer';
import { Selection } from './core/Selection';
import { Edge } from './edges/Edge';
import { applyDefaultInputConfig } from './input/DefaultInputConfig';
import { zoomCameraOnWheel } from './input/CameraWheel';
import { createCameraFingering, PinchZoomFingering } from './input/fingerings';
import type { WheelEventData } from './input/InputManager';
import { Node } from './nodes/Node';
import type {
  CameraViewport,
  DepthMode,
  EdgeSpec,
  FitInsets,
  FitOptions,
  GraphImportData,
  GraphSpec,
  NodeSpec,
  Projection,
  SpaceGraphEvents,
  SpaceGraphOptions,
  SpecUpdate,
  ZuiManifest,
} from './types';
import { depthTreatment, sceneFadeDensity } from './depth/DepthCues';
import { calculateFitView, createLogger, DOMUtils, safeClone, wrapError } from './utils';
import { clamp01 } from './utils/math';
import type { CardFacing } from '@spacegraphjs/renderer';
import type { OrthographicCamera } from 'three';

const logger = createLogger('SpaceGraph');

export const VERSION = '8.5.0';

export class SpaceGraph {
  public static instances = new Set<SpaceGraph>();

  public readonly container: HTMLElement;
  public readonly options: SpaceGraphOptions;

  public renderer!: WebGLRenderer;
  public graph!: Graph;
  public pluginManager!: PluginManager;
  public cameraControls!: CameraControls;
  public events!: EventSystem;
  public vision!: VisionManager;
  public poolManager!: ObjectPoolManager<unknown>;
  public input!: InputManager;
  public ergo!: ErgonomicsAPI;
  public selection!: Selection;
  #animationFrameId?: number;
  #lastTimestamp = 0;
  #animating = false;
  #initialized = false;
  #disposed = false;
  #depth: DepthMode = 'flat';
  #cardFacing: CardFacing = 'auto';
  #scheduled = false;
  #continuousMode = false;
  #lastZoom = -1;
  #lastCenter: [number, number, number] = [Number.NaN, Number.NaN, Number.NaN];

  /**
   * Whether animations should be instant. Respects the explicit `reducedMotion` option,
   * falling back to the system `prefers-reduced-motion` media query.
   */
  get reducedMotion(): boolean {
    if (this.options.reducedMotion !== undefined) return this.options.reducedMotion;
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  constructor(container: HTMLElement, options: SpaceGraphOptions = {}) {
    this.options = options;
    this.container = container;
    this.#init();
    if (options.global) {
      SpaceGraph.instances.add(this);
      if (typeof window !== 'undefined') window.SpaceGraph = SpaceGraph;
    }
  }

  get nodeCount(): number {
    return this.graph.nodes.size;
  }

  get edgeCount(): number {
    return this.graph.edges.size;
  }

  get selected(): string[] {
    return this.selection.list;
  }

  get selectedNodes(): Node[] {
    return this.selection.list
      .map((id) => this.graph.getNode(id))
      .filter((node): node is Node => node !== undefined);
  }

  // ============= Quick Properties =============
  get isEmpty(): boolean {
    return this.graph.nodes.size === 0;
  }

  // Get stats
  get stats() {
    return {
      nodes: this.graph.nodes.size,
      edges: this.graph.edges.size,
      plugins: this.pluginManager.pluginCount,
    };
  }

  // ============= Static Factory Methods =============
  static getContainerElement(container: string | HTMLElement): HTMLElement | null {
    return typeof container === 'string' ? document.querySelector(container) : container;
  }

  static async create(
    container: string | HTMLElement,
    spec: GraphSpec,
    options: SpaceGraphOptions = {}
  ): Promise<SpaceGraph> {
    const element = SpaceGraph.getContainerElement(container);
    if (!element) {
      const error = new Error(
        `[SpaceGraph] Container not found: "${container}". Please ensure the element exists in the DOM before calling SpaceGraph.create().`
      );
      logger.error(error.message);
      throw error;
    }

    if (!SpaceGraph.checkWebGL()) {
      logger.warn(
        'WebGL is not supported by your browser or hardware. Some features may not work as expected.'
      );
    }

    try {
      const sg = new SpaceGraph(element, options);
      await sg.init();

      if (!spec || (!spec.nodes && !spec.edges)) {
        logger.warn('[SpaceGraph] Loading an empty graph specification.');
      }

      sg.loadSpec(spec).render();
      return sg;
    } catch (err) {
      const wrapped = wrapError(
        err,
        {
          namespace: 'SpaceGraph',
          operation: 'Initialization',
          reason: 'Initialization failed during SpaceGraph.create()',
        },
        logger
      );
      throw wrapped;
    }
  }

  static async load(
    container: string | HTMLElement,
    data: GraphImportData,
    options: SpaceGraphOptions = {}
  ): Promise<SpaceGraph> {
    const element = SpaceGraph.getContainerElement(container);
    if (!element) throw new Error(`[SpaceGraph] Container not found: "${container}"`);

    const sg = new SpaceGraph(element, options);
    try {
      await sg.init();
      sg.import(data);
      sg.render();
    } catch (err) {
      throw wrapError(
        err,
        { namespace: 'SpaceGraph', operation: 'Import', reason: 'Failed to import data' },
        logger
      );
    }
    return sg;
  }

  static async fromURL(
    url: string,
    container: string | HTMLElement,
    options: SpaceGraphOptions = {}
  ): Promise<SpaceGraph> {
    if (!url || typeof url !== 'string') throw new Error(`[SpaceGraph] Invalid URL: "${url}"`);
    if (!container) throw new Error('[SpaceGraph] Container is required');

    const element = SpaceGraph.getContainerElement(container);
    if (!element) throw new Error(`[SpaceGraph] Container not found: "${container}"`);

    const sg = new SpaceGraph(element, options);
    try {
      await sg.init();
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      sg.loadSpec((await response.json()) as GraphSpec).render();
    } catch (err) {
      throw wrapError(
        err,
        {
          namespace: 'SpaceGraph',
          operation: 'fromURL',
          reason: `Failed to load from ${url}`,
        },
        logger
      );
    }
    return sg;
  }

  static async quickGraph(
    container: string | HTMLElement,
    nodes: Array<{
      id: string;
      label?: string;
      position?: [number, number, number];
      data?: Record<string, unknown>;
    }>,
    edges?: Array<{ id: string; source: string; target: string }>,
    options?: SpaceGraphOptions
  ): Promise<SpaceGraph> {
    return SpaceGraph.create(container, createQuickGraphSpec(nodes, edges), options);
  }

  static async fromManifest(
    origin: string,
    container: string | HTMLElement,
    options: SpaceGraphOptions = {}
  ): Promise<SpaceGraph> {
    const manifestUrl = `${origin}/.well-known/zui-manifest.json`;
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    const manifest = (await response.json()) as ZuiManifest;

    let spec: GraphSpec;
    if (manifest.spec) spec = manifest.spec;
    else if (manifest.spec_url) {
      const specResponse = await fetch(manifest.spec_url);
      if (!specResponse.ok) throw new Error(`Failed to fetch spec: ${specResponse.statusText}`);
      spec = await specResponse.json();
    } else throw new Error('Manifest must include spec or spec_url');

    return SpaceGraph.create(container, spec, {
      ...options,
      initialLayout: manifest.initial_layout,
    });
  }

  // ============= Utility =============
  private static checkWebGL(): boolean {
    try {
      const canvas = DOMUtils.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }

  // ============= Instance Methods =============
  async init(): Promise<void> {
    if (this.#initialized || this.#disposed) return;
    this.#initialized = true;
    this.renderer.init();
    this.renderer.syncSize();
    this.#registerDefaults();
    await this.pluginManager.initAll();
    this.events.emit('ready', { timestamp: Date.now() });
  }

  // ============= Graph Manipulation =============
  loadSpec(spec: GraphSpec): this {
    if (spec.nodes) {
      for (const node of spec.nodes) {
        this.graph.addNode(node);
      }
    }
    if (spec.edges) {
      for (const edge of spec.edges) {
        this.graph.addEdge(edge);
      }
    }
    return this;
  }

  update(spec: SpecUpdate): void {
    spec.nodes?.forEach((u) => u.id && this.graph.updateNode(u.id, u));
    spec.edges?.forEach((u) => u.id && this.graph.updateEdge(u.id, u));
  }

  export(): GraphSpec & {
    camera?: { position: [number, number, number]; target: [number, number, number] };
    plugins?: Record<string, unknown>;
  } {
    const spec: GraphSpec & { camera?: { position: [number, number, number]; target: [number, number, number] }; plugins?: Record<string, unknown> } = {
      nodes: [...this.graph.nodes.values()].map((node) => ({
        id: node.id,
        type: node.constructor.name,
        label: node.label,
        position: [node.position.x, node.position.y, node.position.z] as [number, number, number],
        data: safeClone(node.data),
      })),
      edges: Array.from(this.graph.edges.values()).map((edge) => ({
        id: edge.id,
        type: edge.constructor.name,
        source: edge.source.id,
        target: edge.target.id,
        data: safeClone(edge.data),
      })),
    };

    if (this.cameraControls?.target) {
      const { camera } = this.renderer;
      const { target } = this.cameraControls;
      spec.camera = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
      };
    }

    const pluginState = this.pluginManager.export();
    if (pluginState && Object.keys(pluginState).length > 0) spec.plugins = pluginState;
    return spec;
  }

  import(data: GraphImportData): void {
    this.graph.clear();
    this.loadSpec(data as GraphSpec);

    if (data.camera && this.cameraControls?.target) {
      const { camera } = this.renderer;
      const { target } = this.cameraControls;
      camera.position.set(...data.camera.position);
      target.set(...data.camera.target);

      const diff = MathPool.getInstance().acquireVector3().subVectors(camera.position, target);
      this.cameraControls.spherical.radius = diff.length();
      const radius = this.cameraControls.spherical.radius;
      const ratio = radius > 0 ? clamp01(diff.y / radius) : 0;
      this.cameraControls.spherical.phi = Math.acos(ratio);
      this.cameraControls.spherical.theta = Math.atan2(diff.x, diff.z);
      MathPool.getInstance().releaseVector3(diff);
      this.cameraControls.update();
    }

    if (data.plugins) this.pluginManager.import(data.plugins as Record<string, unknown>);
  }

  // ============= Node/Edge Access =============
  getNode(id: string): Node | undefined {
    return this.graph.getNode(id);
  }

  getEdge(id: string): Edge | undefined {
    return this.graph.getEdge(id);
  }

  hasNode(id: string): boolean {
    return this.graph.hasNode(id);
  }

  hasEdge(id: string): boolean {
    return this.graph.hasEdge(id);
  }

  clear(): void {
    this.graph.clear();
  }

  // ============= Camera Controls =============
  /**
   * Frame the given nodes (all of them by default).
   *
   * `padding` is a margin in world units; `options.insets` are screen-space margins, in CSS pixels,
   * that the content must stay clear of — the chrome a host draws over the canvas.
   */
  fitView(
    padding = 100,
    duration = 1.5,
    ids?: readonly string[],
    options?: { minScale?: number; insets?: FitInsets },
  ): this {
    if (!this.graph || !this.renderer?.camera || !this.cameraControls) return this;
    const nodes = ids
      ? ids.flatMap((id) => {
          const node = this.graph.nodes.get(id);
          return node ? [node] : [];
        })
      : Array.from(this.graph.nodes.values());
    if (nodes.length === 0) return this;

    // The frame is measured against the surface as it is *now*. The ResizeObserver that syncs the
    // frustum with the container runs asynchronously, so a fit that measured first would frame the
    // content for the previous surface and the frame would change when the observer arrived (T6.20).
    this.renderer.syncSize();

    // For perspective cameras, pass the target phi from the current depth treatment to account
    // for tilt foreshortening when computing the fit distance.
    const isPerspective = this.renderer.projection === 'perspective';
    const targetPhi = isPerspective ? depthTreatment(this.#depth).phi : undefined;

    const fit = calculateFitView(
      nodes,
      this.renderer.camera,
      padding,
      200,
      targetPhi,
      this.#minZoomFor(options?.minScale),
      { width: this.renderer.container?.clientWidth ?? 0, height: this.renderer.container?.clientHeight ?? 0 },
      options?.insets
        ? { top: options.insets.top ?? 0, right: options.insets.right ?? 0, bottom: options.insets.bottom ?? 0, left: options.insets.left ?? 0 }
        : undefined,
    );
    if (fit) {
      // T1.8: the fitted frame becomes the orthographic zoom reference, so later zoom is bounded
      // relative to content instead of the absolute 0.01..100 frustum range.
      if (fit.zoom !== undefined) this.cameraControls?.setOrthoZoomRange(fit.zoom);
      // Orthographic fit carries a frustum zoom; keep the camera radius (distance does not scale ortho).
      const distance = fit.zoom !== undefined ? this.cameraControls.spherical.radius : fit.cameraZ;
      const effectiveDuration = this.#effectiveDuration(duration);
      this.cameraControls.flyTo(fit.center, distance, effectiveDuration, fit.zoom);
      this.#reportViewport(true);
      this.requestFrame();
    }
    return this;
  }

  /**
   * The frustum zoom at which one world unit is `minScale` CSS pixels tall on screen. A fit uses it
   * as a floor, so a view too large for the frame is panned instead of shrunk past legibility.
   */
  #minZoomFor(minScale: number | undefined): number | undefined {
    if (minScale === undefined) return undefined;

    const camera = this.renderer?.camera as OrthographicCamera | undefined;
    if (!camera?.isOrthographicCamera) return undefined;

    const baseHeight = camera.top - camera.bottom || 1;
    const height = this.renderer.container?.clientHeight || 1;

    return (minScale * baseHeight) / height;
  }

  /** Returns 0 if reduced motion is enabled, otherwise the given duration. */
  #effectiveDuration(duration: number): number {
    return this.reducedMotion ? 0 : duration;
  }

  // ============= Animation Loop =============
  animate(timestamp = 0): void {
    if (this.#disposed) return;
    if (this.#continuousMode) {
      if (!this.#animating) return;
      this.#animationFrameId = requestAnimationFrame((t) => this.animate(t));
    }
    this.renderer.beginFrameOptimization(timestamp);

    const delta =
      this.#lastTimestamp > 0 && timestamp > 0
        ? Math.min(
            (timestamp - this.#lastTimestamp) / Performance.MS_PER_SEC,
            Performance.MAX_DELTA_CLAMP
          )
        : Performance.DEFAULT_DELTA_TIME;
    this.#lastTimestamp = timestamp;

    this.pluginManager.updateAll(delta);
    // The camera moves before the nodes read it: a card that faces the camera must face the one it
    // is drawn with, not the one from the previous frame (T1.19).
    this.cameraControls?.update();
    for (const node of this.graph.nodes.values()) {
      if (node) node.onPreRender?.(delta);
    }
    for (const edge of this.graph.edges.values()) {
      if (edge) edge.onPreRender?.(delta);
    }

    this.#reportViewport();
    this.renderer.render();
  }

  // Paint one frame. Continuous mode already runs a loop; on-demand coalesces into a single frame.
  requestFrame(): void {
    if (this.#disposed || this.#continuousMode || this.#scheduled) return;
    this.#scheduled = true;
    this.#animationFrameId = requestAnimationFrame((t) => {
      this.#scheduled = false;
      this.animate(t);
    });
  }

  // ============= Ergonomic API (delegated to ErgonomicsAPI) =============

  render(): this {
    if (this.#disposed) return this;
    this.#animating = true;
    if (this.#continuousMode) {
      this.#animationFrameId ??= requestAnimationFrame((t) => this.animate(t));
    } else {
      this.requestFrame();
    }
    return this;
  }

  pause(): void {
    this.#animating = false;
    if (this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = undefined;
    }
    this.#scheduled = false;
  }

  resume(): this {
    return this.render();
  }

  // ============= Lifecycle =============
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.pause();
    this.pluginManager?.disposePlugins();
    this.input?.dispose();
    this.cameraControls?.dispose();
    this.vision?.dispose();
    this.graph?.clear();
    this.renderer?.dispose();
    this.events?.clear();
    SpaceGraph.instances.delete(this);
  }

  destroy(): void {
    this.dispose();
  }

  // Fluent API shortcuts for graph manipulation
  addNode(spec: NodeSpec | Node): Node | null {
    return this.graph.addNode(spec);
  }

  addEdge(spec: EdgeSpec | Edge): Edge | null {
    return this.graph.addEdge(spec);
  }

  removeNode(id: string): void {
    this.graph.removeNode(id);
  }

  removeEdge(id: string): void {
    this.graph.removeEdge(id);
  }

  // Selection - core selection API on SpaceGraph
  select = (target: string | readonly string[] | null) => {
    this.selection.select(target);
    return this;
  };

  clearSelection = () => {
    this.selection.clear();
    return this;
  };

  toggleSelection = (id: string) => {
    this.selection.toggle(id);
    return this;
  };

  deselect = (id: string) => {
    this.selection.deselect(id);
    return this;
  };

  // Visibility - used by renderer adapters
  show(id: string, visible = true): this {
    const node = this.graph.getNode(id);
    if (node) node.updateSpec({ data: { ...node.data, visible } });
    return this;
  }

  hide(id: string): this {
    return this.show(id, false);
  }

  // For ergonomic query/manipulation API, use sg.ergo or sg.graph directly

  // Watch for changes - returns unsubscribe
  watch<K extends keyof SpaceGraphEvents>(
    type: K,
    callback: (data: SpaceGraphEvents[K]) => void
  ): () => void {
    const handler = (data: SpaceGraphEvents[K]) => callback(data);
    this.events.on(type, handler);
    return () => this.events.off(type, handler);
  }

  // Quick layout application
  async layout(name: string, options?: Record<string, unknown>): Promise<void> {
    const plugin = this.pluginManager.getPlugin(name);
    if (plugin && 'applyLayout' in plugin) {
      await (
        plugin as { applyLayout: (opts?: Record<string, unknown>) => Promise<void> }
      ).applyLayout(options);
    }
  }

  // Apply absolute positions without animation. Hosts own layout; nothing auto-runs on mutation.
  setPositions(positions: Record<string, [number, number, number]>): this {
    this.graph.setPositions(positions);
    return this;
  }

  // Pin every node so an implicit layout cannot move host-assigned positions.
  pinAll(pinned = true): this {
    this.graph.pinAll(pinned);
    return this;
  }

  // Apply a named layout exactly once. Unlike an auto-layout plugin it never reruns on mutation.
  layoutOnce(name: string, options?: Record<string, unknown>): Promise<void> {
    return this.layout(name, options);
  }

  // ============= Projection and zoom telemetry (L1.12/L1.13) =============
  get projection(): Projection {
    return this.renderer.projection;
  }

  // Switch the active camera between parallel (2D) and perspective (3D) projection.
  setProjection(projection: Projection): this {
    this.renderer.setProjection(projection, this.cameraControls?.target);
    this.cameraControls?.setCamera(this.renderer.camera);
    this.events.emit('projection:change', { projection });
    this.#reportViewport(true);
    this.requestFrame();
    return this;
  }

  // ============= Depth spectrum (LE.14) =============
  get depth(): DepthMode {
    return this.#depth;
  }

  // Apply a depth treatment: it owns the projection, camera pose, orbit gating, and depth fade. `flat`
  // is the orthographic baseline; the perspective modes tilt the camera so Z reads as depth.
  setDepth(depth: DepthMode): this {
    const previous = this.#depth;
    // The depth is stored before the treatment is applied: the treatment reads it (the card facing and
    // the fade resolve against the depth that is coming, not the one that was).
    this.#depth = depth;
    const effectiveDuration = this.#effectiveDuration(previous !== depth ? 0.5 : 0);
    this.#applyDepth(depth, effectiveDuration);
    if (previous !== depth) this.events.emit('depth:change', { depth, previous });
    this.#reportViewport(true);
    this.requestFrame();
    return this;
  }

  #applyDepth(depth: DepthMode, duration: number): void {
    const treatment = depthTreatment(depth);
    this.renderer.setProjection(treatment.projection, this.cameraControls?.target);
    this.cameraControls?.setCamera(this.renderer.camera);
    this.#applyCardFacing();
    this.applySceneFade();
    this.cameraControls?.setOrbitEnabled(treatment.orbit);
    this.cameraControls?.setPolar(treatment.phi, 0, duration);
    this.events.emit('projection:change', { projection: treatment.projection });
  }

  // ============= Card facing (T1.19) =============
  get cardFacing(): CardFacing {
    return this.#cardFacing;
  }

  /**
   * How the DOM cards face the camera. `auto` follows the depth treatment; `plane` lays every card
   * in the content plane, so a tilted camera shears them — the perspective working, not a defect —
   * and `camera` turns them to face the reader.
   */
  setCardFacing(facing: CardFacing): this {
    this.#cardFacing = facing;
    this.#applyCardFacing();
    this.requestFrame();
    return this;
  }

  #applyCardFacing(): void {
    const resolved = this.#cardFacing === 'auto' ? depthTreatment(this.#depth).facing : this.#cardFacing;
    this.renderer.setCardFacing(resolved);
  }

  // T1.3: the fade is relative to the scene, not to an absolute camera distance. The content depth
  // extent sets the span and the current camera radius keeps the curve stable across fits.
  applySceneFade(): this {
    const treatment = depthTreatment(this.#depth);
    const depths = [...this.graph.nodes.values()].map((node) => node.position.z);
    const sceneDepth = depths.length > 0 ? Math.max(...depths) - Math.min(...depths) : 0;
    const cameraDistance = this.cameraControls?.spherical.radius ?? 0;
    this.renderer.setDepthFadeFromScene(treatment.fade, cameraDistance, sceneDepth);
    return this;
  }

  // Enable or disable camera orbit; orthographic projection never orbits regardless of this flag.
  setOrbitEnabled(enabled: boolean): this {
    this.cameraControls?.setOrbitEnabled(enabled);
    return this;
  }

  // Point the camera at a polar (from +Y) and azimuth angle, animating when a duration is given.
  setPolar(phi: number, theta: number, duration = 0): this {
    this.cameraControls?.setPolar(phi, theta, duration);
    return this;
  }

  // Normalized 0..1 zoom where 1 is closest; the host maps it to semantic levels.
  get zoom(): number {
    return this.renderer.getZoom();
  }

  setZoom(value: number): this {
    this.renderer.setZoom(value);
    this.cameraControls?.update();
    this.#reportViewport(true);
    this.requestFrame();
    return this;
  }

  get viewport(): CameraViewport {
    return this.renderer.getViewport();
  }

  #reportViewport(force = false): void {
    if (!this.renderer || !this.events) return;
    if (this.#depth !== 'flat') this.applySceneFade();
    // The camera's frame is cheap; the world extent is only worth measuring when it is reported.
    const camera = this.renderer.getCameraState();
    const zoomChanged = Math.abs(camera.zoom - this.#lastZoom) > 1e-4;
    const moved = camera.center.some((v, i) => Math.abs(v - this.#lastCenter[i]) > 1e-3);
    if (!force && !zoomChanged && !moved) return;
    const viewport = this.renderer.getViewport();
    if (zoomChanged) {
      this.events.emit('zoom:change', { zoom: viewport.zoom, previous: this.#lastZoom });
    }
    this.events.emit('camera:change', viewport);
    this.#lastZoom = viewport.zoom;
    this.#lastCenter = viewport.center;
  }

  // Focus and animate camera to node
  focusNode(id: string, _padding = 100, duration = 1): this {
    const node = this.graph.getNode(id);
    if (node) {
      const pos = node.position;
      const effectiveDuration = this.#effectiveDuration(duration);
      this.cameraControls.flyTo(pos, this.renderer.camera.position.length(), effectiveDuration);
      this.#reportViewport(true);
      this.requestFrame();
    }
    return this;
  }

  // Center camera on point
  center(x: number, y: number, z = 0): this {
    this.cameraControls.target.set(x, y, z);
    return this.#commitCamera();
  }

  // Reset camera to default
  resetCamera(): this {
    this.renderer.camera.position.set(0, 500, 500);
    this.cameraControls.target.set(0, 0, 0);
    return this.#commitCamera();
  }

  // Set camera position
  setCamera(position: [number, number, number], target?: [number, number, number]): this {
    this.renderer.camera.position.set(...position);
    if (target) this.cameraControls.target.set(...target);
    return this.#commitCamera();
  }

  /** Apply a camera change: the controls settle, the host learns the new frame, a frame is asked for. */
  #commitCamera(): this {
    this.cameraControls.update();
    this.#reportViewport(true);
    this.requestFrame();
    return this;
  }

  

  #init(): void {
    this.#continuousMode = (this.options.render?.renderMode ?? 'on-demand') === 'continuous';
    this.poolManager = new ObjectPoolManager();
    this.events = new EventSystem<SpaceGraphEvents>();
    this.vision = new VisionManager(this);
    this.pluginManager = new PluginManager(this);
    this.renderer = new WebGLRenderer(this, this.container, {
      ...this.options.render,
      backgroundColor: this.options.theme?.background ?? this.options.render?.backgroundColor,
    });
    this.graph = new Graph(this);
    this.selection = new Selection(this);
    this.ergo = new ErgonomicsAPI(this);
    this.#setupKeyboard();
    this.cameraControls = new CameraControls(
      this.renderer.camera,
      this.container,
      { keyboard: this.options.keyboard ?? 'container', ...this.options.cameraControls } as Partial<
        import('./core/CameraControls').CameraControlsConfig
      >
    );
    this.cameraControls.sg = this;
    this.#depth = this.options.render?.depth ?? 'flat';
    this.#applyDepth(this.#depth, 0);
    this.input = new InputManager({ sg: this, events: this.events });
    applyDefaultInputConfig(this.input, this);
    forwardGraphEvents(this.graph, this.events);
    this.#subscribeToGraphEvents();
    this.#registerDefaults();
  }

  #setupKeyboard(): void {
    const keyboard = this.options.keyboard ?? 'container';
    if (keyboard === 'container' && !this.container.hasAttribute('tabindex')) {
      this.container.tabIndex = 0;
    }
  }

  #subscribeToGraphEvents(): void {
    const schedule = () => this.requestFrame();
    for (const event of [
      'node:added',
      'node:removed',
      'node:updated',
      'edge:added',
      'edge:removed',
      'edge:updated',
      'graph:cleared',
      'selection:changed',
    ] as const) {
      this.events.on(event, schedule);
    }
  }

  #registerDefaults(): void {
    const registerPlugins = (plugins: [PluginCtor, string][]) => {
      for (const [cls, name] of plugins) this.pluginManager.register(name, new cls());
    };

    for (const cls of DEFAULT_NODE_TYPES) this.pluginManager.registerNodeType(nodeTypeName(cls), cls as any);
    for (const cls of DEFAULT_EDGE_TYPES) this.pluginManager.registerEdgeType((cls as any).typeName || cls.name, cls as import('./core/TypeRegistry').EdgeConstructor);
    registerPlugins(DEFAULT_LAYOUT_PLUGINS);
    registerPlugins(DEFAULT_SYSTEM_PLUGINS);
    if (this.options.chrome) registerPlugins(DEFAULT_CHROME_PLUGINS);
    for (const plugin of this.options.plugins ?? []) this.pluginManager.register(plugin.id, plugin as Parameters<PluginManager['register']>[1]);
    this.#registerFingerings();
  }

  #registerFingerings(): void {
    this.input.registerFingering(createCameraFingering(this.cameraControls), FingeringPriority.CAMERA);
    this.input.registerFingering(new PinchZoomFingering(this), FingeringPriority.PINCH_ZOOM);
    // The wheel is not a pointer gesture, so the camera takes it from the event stream.
    this.events.on('input:camera:wheel', (e) => this.#onCameraWheel(e as WheelEventData));
  }

  /** The wheel zooms the view about the point under the pointer. */
  #onCameraWheel(e: WheelEventData): void {
    const canvas = this.renderer.renderer.domElement;
    zoomCameraOnWheel(this.cameraControls, canvas, e);
    (e as { originalEvent?: { preventDefault?: () => void } }).originalEvent?.preventDefault?.();
  }
}
