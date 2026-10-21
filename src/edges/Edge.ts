import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Defaults, EdgeColors } from '../core/constants';
import { applyEdgeTheme } from '../core/theme';
import { type Bounds3D, type HitResult, type Rect, Surface, createBounds3D, rectOf } from '../core/Surface';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import { midpoint } from '../utils/vector';

/** The axis an arrowhead points along. */
const ARROWHEAD_AXIS = new THREE.Vector3(0, 1, 0);

const isFiniteVector = (vector: THREE.Vector3): boolean =>
  isFinite(vector.x) && isFinite(vector.y) && isFinite(vector.z);

export const DEFAULT_EDGE_DATA: EdgeData = Object.freeze({
  color: EdgeColors.DEFAULT,
  thickness: Defaults.EDGE_THICKNESS,
  thicknessInstanced: Defaults.INSTANCED_THICKNESS,
  arrowhead: false,
  arrowheadSize: Defaults.ARROWHEAD_SIZE,
  dashed: false,
  dashScale: 1,
  dashSize: Defaults.DASH_SIZE,
  gapSize: Defaults.GAP_SIZE,
});

export class Edge extends Surface {
  static typeName: string = 'Edge';
  static HIGHLIGHT_COLOR = EdgeColors.HIGHLIGHT;
  static DEFAULT_OPACITY = 0.8;
  static HIGHLIGHT_OPACITY = 1.0;
  static HOVER_OPACITY_BOOST = 0.1;
  static HOVER_THICKNESS_MULT = 1.1;

  readonly id: string;
  readonly type: string;
  sg?: SpaceGraph;
  source: Node;
  target: Node;
  data: EdgeData;
  line: Line2;
  geometry: LineGeometry;
  arrowheads: { source: THREE.Mesh | null; target: THREE.Mesh | null } = {
    source: null,
    target: null,
  };
  isHighlighted = false;
  isHovered = false;
  lastActivityTime = 0;
  private _colorStart = new THREE.Color();
  private _colorEnd = new THREE.Color();
  private _gradientKey = '';
  private _direction = new THREE.Vector3();
  private _sourcePos = new THREE.Vector3();
  private _targetPos = new THREE.Vector3();

  constructor(
    sgOrSpec: SpaceGraph | EdgeSpec | undefined,
    specOrSource: EdgeSpec | Node,
    sourceOrTarget?: Node,
    targetOrNothing?: Node
  ) {
    super();
    const isSpecFirst = sgOrSpec && typeof sgOrSpec === 'object' && 'source' in sgOrSpec;
    this.sg = isSpecFirst ? undefined : (sgOrSpec as SpaceGraph);
    const spec = isSpecFirst ? (sgOrSpec as EdgeSpec) : (specOrSource as EdgeSpec);
    const source = isSpecFirst ? (specOrSource as Node) : (sourceOrTarget as Node);
    const target = isSpecFirst ? (sourceOrTarget as Node) : (targetOrNothing as Node);

    this.id = spec.id;
    this.type = spec.type ?? 'Edge';
    this.source = source;
    this.target = target;
    this.data = { ...DEFAULT_EDGE_DATA, ...applyEdgeTheme(spec.data ?? {}, this.sg?.options?.theme) };

    if (!this.data.gradientColors?.length && this.data.color === undefined)
      this.data.color = DEFAULT_EDGE_DATA.color;

    this.geometry = new LineGeometry();
    this.geometry.setPositions([0, 0, 0, 0, 0, 0.001]);

    const { thickness, dashed, dashScale, dashSize, gapSize, gradientColors, color } = this.data;
    const opacity = (this.data.opacity as number | undefined) ?? Edge.DEFAULT_OPACITY;
    const materialConfig: Record<string, unknown> = {
      linewidth: thickness ?? 3,
      transparent: opacity < 1,
      opacity,
      depthTest: false,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      dashed: dashed ?? false,
      dashScale: dashScale ?? 1,
      dashSize: dashSize ?? 3,
      gapSize: gapSize ?? 1,
    };

    if (gradientColors?.length === 2) {
      materialConfig.vertexColors = true;
      this._colorStart.set(gradientColors[0]);
      this._colorEnd.set(gradientColors[1]);
      this.geometry.setColors([
        this._colorStart.r,
        this._colorStart.g,
        this._colorStart.b,
        this._colorEnd.r,
        this._colorEnd.g,
        this._colorEnd.b,
      ]);
    } else {
      materialConfig.vertexColors = false;
      materialConfig.color = color ?? EdgeColors.DEFAULT;
    }

    const material = new LineMaterial(materialConfig);
    this.line = new Line2(this.geometry, material);

    if (material.dashed) this.line.computeLineDistances();
    this.line.renderOrder = -1;
    this.line.userData = { edgeId: this.id };

    this._createArrowheads();
    this.update();
  }

  get object(): Line2 {
    return this.line;
  }

  /** CSS label element for labelled edges; undefined for plain edges (used for label decluttering). */
  get labelElement(): HTMLElement | undefined {
    return undefined;
  }

  get isValid(): boolean {
    return !!(this.source?.position && this.target?.position);
  }

  /** The point halfway between the edge's two ends. */
  get midpoint(): THREE.Vector3 {
    return this.position;
  }

  get length(): number {
    return this.isValid ? this.source.position.distanceTo(this.target.position) : 0;
  }

  get position(): THREE.Vector3 {
    if (!this.source || !this.target) return new THREE.Vector3();
    return midpoint(this.source.position, this.target.position);
  }

  get rotation(): THREE.Euler {
    return new THREE.Euler();
  }

  get scale(): THREE.Vector3 {
    return new THREE.Vector3(1, 1, 1);
  }

  get worldMatrix(): THREE.Matrix4 {
    return new THREE.Matrix4();
  }

  get bounds(): Rect {
    return rectOf(new THREE.Box3().setFromObject(this.line));
  }

  get bounds3D(): Bounds3D {
    const { sourcePos, targetPos } = this.endpointPositions();
    const box = new THREE.Box3().setFromPoints([sourcePos, targetPos]);

    return createBounds3D(box.min, box.max);
  }

  protected get surfaceKind(): string {
    return 'Edge';
  }

  /**
   * The world positions of the edge's two ends. The vectors are reused, so a caller that keeps one
   * has to copy it.
   */
  protected endpointPositions(): { sourcePos: THREE.Vector3; targetPos: THREE.Vector3 } {
    this.source.getWorldPosition(this._sourcePos);
    this.target.getWorldPosition(this._targetPos);
    return { sourcePos: this._sourcePos, targetPos: this._targetPos };
  }

  updateSpec(updates: Partial<EdgeSpec>): this {
    if (!updates.data) return this;

    this.data = { ...this.data, ...updates.data };
    const { color, thickness, gradientColors, dashed, dashSize, gapSize, opacity } = updates.data;
    const material = this.line.material;

    if (typeof color === 'number') material.color.setHex(color);
    if (typeof thickness === 'number') material.linewidth = thickness;
    if (gradientColors) this._setGradientColors();
    if (typeof dashed === 'boolean') {
      material.dashed = dashed;
      if (dashed) this.line.computeLineDistances();
    }
    if (typeof dashSize === 'number') material.dashSize = dashSize;
    if (typeof gapSize === 'number') material.gapSize = gapSize;
    if (typeof opacity === 'number') {
      material.opacity = opacity;
      material.transparent = opacity < 1;
    }
    if (dashSize !== undefined || gapSize !== undefined) this.line.computeLineDistances();

    return this;
  }

  // Ergonomic convenience methods
  highlight(): this {
    this.setHighlight(true);
    return this;
  }

  unhighlight(): this {
    this.setHighlight(false);
    return this;
  }

  setThickness(thickness: number): this {
    this.data.thickness = thickness;
    this.line.material.linewidth = thickness;
    return this;
  }

  setColor(color: number | string): this {
    this.data.color = color as any;
    this.line.material.color.set(color as any);
    return this;
  }

  setDashed(dashed: boolean): this {
    this.data.dashed = dashed;
    this.line.material.dashed = dashed;
    if (dashed) this.line.computeLineDistances();
    return this;
  }

  setArrowhead(arrowhead: boolean | 'source' | 'target' | 'both'): this {
    this.data.arrowhead = arrowhead;
    return this;
  }

  getOtherNode(node: Node): Node | undefined {
    if (node.id === this.source.id) return this.target;
    if (node.id === this.target.id) return this.source;
    return undefined;
  }

  isConnectedTo(nodeId: string): boolean {
    return this.source.id === nodeId || this.target.id === nodeId;
  }

  swap(): void {
    const temp = this.source;
    this.source = this.target;
    this.target = temp;
    this.update();
  }

  reverse(): this {
    this.swap();
    return this;
  }

  update(): void {
    if (!this.line || !this.source || !this.target) return;

    const { sourcePos, targetPos } = this.endpointPositions();

    if (!isFiniteVector(sourcePos) || !isFiniteVector(targetPos)) return;

    this.geometry.setPositions([
      sourcePos.x,
      sourcePos.y,
      sourcePos.z,
      targetPos.x,
      targetPos.y,
      targetPos.z,
    ]);

    if (this.geometry.attributes.position.count === 0) return;

    this._setGradientColors();
    if (this.line.material.dashed) this.line.computeLineDistances();
    this.geometry.computeBoundingSphere();
    this._updateArrowheads();
  }

  setHighlight(highlight: boolean): void {
    this.isHighlighted = highlight;
    const mat = this.line?.material;
    if (!mat) return;

    mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;
    const thicknessMultiplier =
      this.data.gradientColors?.length === 2 && mat.vertexColors ? 2.0 : 1.5;
    mat.linewidth = highlight
      ? (this.data.thickness ?? Defaults.EDGE_THICKNESS) * thicknessMultiplier
      : (this.data.thickness ?? Defaults.EDGE_THICKNESS);

    if (!mat.vertexColors)
      mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : (this.data.color ?? EdgeColors.DEFAULT));
    mat.needsUpdate = true;

    const arrowheadColor = highlight
      ? Edge.HIGHLIGHT_COLOR
      : (this.data.arrowheadColor ?? this.data.color ?? EdgeColors.DEFAULT);
    this._setArrowheadStyle(this.arrowheads.source, Edge.HIGHLIGHT_OPACITY, arrowheadColor);
    this._setArrowheadStyle(this.arrowheads.target, Edge.HIGHLIGHT_OPACITY, arrowheadColor);

    if (highlight && this.isHovered) this.setHoverStyle(false, true);
  }

  setHoverStyle(hovered: boolean, force = false): void {
    if (!force && this.isHighlighted) return;
    const mat = this.line?.material;
    if (!mat) return;

    this.isHovered = hovered;
    const baseThickness = this.data.thickness ?? 3;
    const opacity = hovered
      ? Math.min(1.0, Edge.DEFAULT_OPACITY + Edge.HOVER_OPACITY_BOOST)
      : Edge.DEFAULT_OPACITY;

    mat.opacity = opacity;
    mat.linewidth = hovered ? baseThickness * Edge.HOVER_THICKNESS_MULT : baseThickness;
    mat.needsUpdate = true;

    if (!this.isHighlighted) {
      this._setArrowheadStyle(this.arrowheads.source, opacity);
      this._setArrowheadStyle(this.arrowheads.target, opacity);
    }
  }

  hitTest(raycaster: THREE.Raycaster): HitResult | null {
    if (!this.visible || !this.isTouchable) return null;

    const originalThreshold = raycaster.params.Line?.threshold ?? 1;
    raycaster.params.Line = { threshold: this.data.hitWidth ?? 5 };

    const intersects = raycaster.intersectObject(this.line, true);
    raycaster.params.Line = { threshold: originalThreshold };

    return intersects.length > 0
      ? {
          surface: this,
          point: intersects[0].point,
          localPoint: intersects[0].point.clone(),
          distance: intersects[0].distance,
        }
      : null;
  }

  start(): void {
    this.lastActivityTime = performance.now();
    this.pulse(0.3);
  }

  stop(): void {}

  delete(): void {
    this.dispose();
  }

  onPreRender(dt: number): void {
    super.onPreRender(dt);
    this.update();
  }

  activityDecay(now: number, window = 2000): number {
    const dt = now - this.lastActivityTime;
    return dt > 0 ? 1 / (1 + dt / window) : 0;
  }

  toJSON(): EdgeSpec {
    return {
      id: this.id,
      source: this.source.id,
      target: this.target.id,
      type: this.type,
      data: { ...this.data },
    };
  }

  dispose(): void {
    this.emit('surface:destroying', { surface: this, timestamp: Date.now() });
    this.emit('edge:destroying', { edge: this, timestamp: Date.now() });
    this.line?.geometry?.dispose();
    this.line?.material?.dispose();
    this.line?.parent?.remove(this.line);

    const disposeArrowhead = (arrowhead: THREE.Mesh | null) => {
      arrowhead?.geometry?.dispose();
      (arrowhead?.material as THREE.Material)?.dispose();
      arrowhead?.parent?.remove(arrowhead);
    };
    disposeArrowhead(this.arrowheads.source);
    disposeArrowhead(this.arrowheads.target);
    this.arrowheads.source = null;
    this.arrowheads.target = null;
    this.removeAllListeners();
  }

  private _createArrowheads(): void {
    const { arrowhead } = this.data;
    if (arrowhead === true || arrowhead === 'target' || arrowhead === 'both')
      this.arrowheads.target = this._createSingleArrowhead();
    if (arrowhead === 'source' || arrowhead === 'both')
      this.arrowheads.source = this._createSingleArrowhead();
  }

  private _createSingleArrowhead(): THREE.Mesh {
    const size = this.data.arrowheadSize ?? Defaults.ARROWHEAD_SIZE;
    const geometry = new THREE.ConeGeometry(size / 2, size, 8);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.arrowheadColor ?? this.data.color ?? EdgeColors.DEFAULT,
      opacity: Edge.DEFAULT_OPACITY,
      transparent: true,
      depthTest: false,
    });
    const arrowhead = new THREE.Mesh(geometry, material);
    arrowhead.renderOrder = this.line.renderOrder + 1;
    arrowhead.userData = { edgeId: this.id, type: 'edge-arrowhead' };
    return arrowhead;
  }

  private _setGradientColors(): void {
    if (!this.line?.material) return;

    const gradient = this.data.gradientColors;
    if (gradient?.length === 2) {
      if (!this.line.material.vertexColors) {
        this.line.material.vertexColors = true;
        this.line.material.needsUpdate = true;
      }

      // The gradient only changes when its colours do; rewriting the buffer every frame would
      // re-upload it for every edge on every frame.
      const key = `${gradient[0]}|${gradient[1]}`;
      if (key === this._gradientKey) return;
      this._gradientKey = key;

      this._colorStart.set(gradient[0]);
      this._colorEnd.set(gradient[1]);

      const position = this.line.geometry.attributes.position;
      if (!position) return;
      const numPoints = position.count;
      const newColors = new Float32Array(numPoints * 3);
      for (let i = 0; i < numPoints; i++) {
        const t = numPoints > 1 ? i / (numPoints - 1) : 0;
        const interpolatedColor = this._colorStart.clone().lerp(this._colorEnd, t);
        newColors[i * 3] = interpolatedColor.r;
        newColors[i * 3 + 1] = interpolatedColor.g;
        newColors[i * 3 + 2] = interpolatedColor.b;
      }
      this.geometry.setColors(newColors);
      return;
    }

    this._gradientKey = '';
    if (this.line.material.vertexColors) {
      this.line.material.vertexColors = false;
      this.line.material.needsUpdate = true;
      this.line.material.color.set(this.data.color ?? EdgeColors.DEFAULT);
    }
  }

  private _updateArrowheads(): void {
    if (!this.sg?.renderer?.scene) return;
    if (!this.source || !this.target) return;

    const { sourcePos, targetPos } = this.endpointPositions();

    const scene = this.sg.renderer.scene;

    const updateArrowhead = (
      arrowhead: THREE.Mesh | null,
      endPos: THREE.Vector3,
      startPos: THREE.Vector3
    ) => {
      if (!arrowhead) return;
      arrowhead.position.copy(endPos);
      this._direction.subVectors(endPos, startPos).normalize();
      arrowhead.quaternion.setFromUnitVectors(ARROWHEAD_AXIS, this._direction);
      if (scene && arrowhead.parent !== scene) scene.add(arrowhead);
    };

    updateArrowhead(this.arrowheads.target, targetPos, sourcePos);
    updateArrowhead(this.arrowheads.source, sourcePos, targetPos);
  }

  private _setArrowheadStyle(arrowhead: THREE.Mesh | null, opacity: number, color?: number): void {
    if (arrowhead?.material instanceof THREE.MeshBasicMaterial) {
      if (color !== undefined) arrowhead.material.color.setHex(color);
      arrowhead.material.opacity = opacity;
    }
  }
}
