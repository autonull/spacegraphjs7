import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { Surface, type HitResult, type Rect, type Bounds3D } from '../core/Surface';
import { Defaults, EdgeColors } from '../core/constants';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec, EdgeData } from '../types';
import type { Node } from '../nodes/Node';

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
    static HIGHLIGHT_COLOR = EdgeColors.HIGHLIGHT;
    static DEFAULT_OPACITY = 0.8;
    static HIGHLIGHT_OPACITY = 1.0;
    static DEFAULT_HOVER_OPACITY_BOOST = 0.1;
    static DEFAULT_HOVER_THICKNESS_MULTIPLIER = 1.1;

    readonly id: string;
    readonly type: string;
    public sg?: SpaceGraph;
    public source: Node;
    public target: Node;
    public data: EdgeData;
    public line: Line2;
    public geometry: LineGeometry;

    public get object(): Line2 {
        return this.line;
    }

    public get position(): THREE.Vector3 {
        if (!this.source || !this.target) return new THREE.Vector3();
        return new THREE.Vector3()
            .addVectors(this.source.position, this.target.position)
            .multiplyScalar(0.5);
    }

    public get rotation(): THREE.Euler {
        return new THREE.Euler();
    }

    public get scale(): THREE.Vector3 {
        return new THREE.Vector3(1, 1, 1);
    }

    public get worldMatrix(): THREE.Matrix4 {
        return new THREE.Matrix4();
    }

    public arrowheads: { source: THREE.Mesh | null; target: THREE.Mesh | null } = {
        source: null,
        target: null,
    };
    public isHighlighted = false;
    public isHovered = false;
    public lastActivityTime = 0;

    private _colorStart = new THREE.Color();
    private _colorEnd = new THREE.Color();
    private _direction = new THREE.Vector3();

    constructor(spec: EdgeSpec, source: Node, target: Node);
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node);
    constructor(
        sgOrSpec: SpaceGraph | EdgeSpec,
        specOrSource: EdgeSpec | Node,
        sourceOrTarget?: Node,
        targetOrNothing?: Node,
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
        this.data = { ...DEFAULT_EDGE_DATA, ...spec.data };

        const hasGradient = this.data.gradientColors?.length === 2;
        if (!hasGradient && this.data.color === undefined) {
            this.data.color = DEFAULT_EDGE_DATA.color;
        }

        this.geometry = new LineGeometry();
        this.geometry.setPositions([0, 0, 0, 0, 0, 0.001]);

        const { thickness, dashed, dashScale, dashSize, gapSize, gradientColors, color } =
            this.data;
        const materialConfig: Record<string, unknown> = {
            linewidth: thickness ?? 3,
            transparent: true,
            opacity: Edge.DEFAULT_OPACITY,
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

    requireSpaceGraph(): SpaceGraph {
        if (!this.sg) {
            throw new Error(`Edge '${this.id}' requires SpaceGraph but sg is not initialized`);
        }
        return this.sg;
    }

    private _createArrowheads(): void {
        const { arrowhead } = this.data;
        if (arrowhead === true || arrowhead === 'target' || arrowhead === 'both') {
            this.arrowheads.target = this._createSingleArrowhead();
        }
        if (arrowhead === 'source' || arrowhead === 'both') {
            this.arrowheads.source = this._createSingleArrowhead();
        }
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

        if (this.data.gradientColors?.length === 2) {
            if (!this.line.material.vertexColors) {
                this.line.material.vertexColors = true;
                this.line.material.needsUpdate = true;
            }

            this._colorStart.set(this.data.gradientColors[0]);
            this._colorEnd.set(this.data.gradientColors[1]);

            const colors = this.line.geometry.attributes.color?.array as Float32Array | undefined;
            if (colors && colors.length >= 6) {
                colors[0] = this._colorStart.r;
                colors[1] = this._colorStart.g;
                colors[2] = this._colorStart.b;
                colors[3] = this._colorEnd.r;
                colors[4] = this._colorEnd.g;
                colors[5] = this._colorEnd.b;
                this.line.geometry.attributes.color.needsUpdate = true;
            } else {
                const posAttribute = this.line.geometry.attributes.position;
                if (posAttribute) {
                    const numPoints = posAttribute.count;
                    const newColors = new Float32Array(numPoints * 3);
                    for (let i = 0; i < numPoints; i++) {
                        const t = numPoints > 1 ? i / (numPoints - 1) : 0;
                        const interpolatedColor = this._colorStart.clone().lerp(this._colorEnd, t);
                        newColors[i * 3] = interpolatedColor.r;
                        newColors[i * 3 + 1] = interpolatedColor.g;
                        newColors[i * 3 + 2] = interpolatedColor.b;
                    }
                    this.geometry.setColors(newColors);
                }
            }
        } else if (this.line.material.vertexColors) {
            this.line.material.vertexColors = false;
            this.line.material.needsUpdate = true;
            this.line.material.color.set(this.data.color ?? EdgeColors.DEFAULT);
        }
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        if (updates.data) {
            this.data = { ...this.data, ...updates.data };
            const { color, thickness, gradientColors } = updates.data;

            if (typeof color === 'number') this.line.material.color.setHex(color);
            if (typeof thickness === 'number') this.line.material.linewidth = thickness;
            if (gradientColors) this._setGradientColors();
        }
        return this;
    }

    update(): void {
        if (!this.line || !this.source || !this.target) return;

        const { position: sourcePos } = this.source;
        const { position: targetPos } = this.target;

        if (![sourcePos, targetPos].every((p) => isFinite(p.x) && isFinite(p.y) && isFinite(p.z)))
            return;

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

    private _updateArrowheads(): void {
        if (!this.sg?.renderer?.scene) return;
        if (!this.source?.position || !this.target?.position) return;

        const { position: sourcePos } = this.source;
        const { position: targetPos } = this.target;
        const scene = this.sg.renderer.scene;

        const updateArrowhead = (
            arrowhead: THREE.Mesh | null,
            endPos: THREE.Vector3,
            startPos: THREE.Vector3,
        ) => {
            if (!arrowhead) return;
            arrowhead.position.copy(endPos);
            this._direction.subVectors(endPos, startPos).normalize();
            arrowhead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this._direction);
            if (scene && arrowhead.parent !== scene) {
                scene.add(arrowhead);
            }
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

mat.opacity = hovered
? Math.min(1.0, Edge.DEFAULT_OPACITY + Edge.DEFAULT_HOVER_OPACITY_BOOST)
: Edge.DEFAULT_OPACITY;
mat.linewidth = hovered
? baseThickness * Edge.DEFAULT_HOVER_THICKNESS_MULTIPLIER
: baseThickness;
mat.needsUpdate = true;

if (!this.isHighlighted) {
const hoverOpacity = hovered
? Math.min(1.0, Edge.DEFAULT_OPACITY + Edge.DEFAULT_HOVER_OPACITY_BOOST)
: Edge.DEFAULT_OPACITY;
this._setArrowheadStyle(this.arrowheads.source, hoverOpacity);
this._setArrowheadStyle(this.arrowheads.target, hoverOpacity);
}
}

    get bounds(): Rect {
        const box = new THREE.Box3().setFromObject(this.line);
        return {
            x: box.min.x,
            y: box.min.y,
            width: box.max.x - box.min.x,
            height: box.max.y - box.min.y,
        };
    }

    get bounds3D(): Bounds3D {
        const min = new THREE.Vector3(
            Math.min(this.source.position.x, this.target.position.x),
            Math.min(this.source.position.y, this.target.position.y),
            Math.min(this.source.position.z, this.target.position.z),
        );
        const max = new THREE.Vector3(
            Math.max(this.source.position.x, this.target.position.x),
            Math.max(this.source.position.y, this.target.position.y),
            Math.max(this.source.position.z, this.target.position.z),
        );
        return {
            min,
            max,
            get center() {
                return new THREE.Vector3().addVectors(this.min, this.max).multiplyScalar(0.5);
            },
            get size() {
                return new THREE.Vector3().subVectors(this.max, this.min);
            },
            containsPoint(_p: THREE.Vector3) {
                return false;
            },
            intersectsRay(_ray: THREE.Ray) {
                return false;
            },
        };
    }

    hitTest(raycaster: THREE.Raycaster): HitResult | null {
        if (!this.visible || !this.isTouchable) return null;

        const originalThreshold = raycaster.params.Line?.threshold ?? 1;
        raycaster.params.Line = { threshold: 5 };

        const intersects = raycaster.intersectObject(this.line, true);
        raycaster.params.Line = { threshold: originalThreshold };

        if (intersects.length > 0) {
            return {
                surface: this,
                point: intersects[0].point,
                localPoint: intersects[0].point.clone(),
                distance: intersects[0].distance,
            };
        }
        return null;
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

    activityDecay(now: number, window: number = 2000): number {
        const dt = now - this.lastActivityTime;
        return dt > 0 ? 1 / (1 + dt / window) : 0;
    }

    dispose(): void {
        this.emit('destroying', { surface: this });
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
}
