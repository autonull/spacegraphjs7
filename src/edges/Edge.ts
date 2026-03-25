import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec, SpaceGraphNodeData } from '../types';
import type { Node } from '../nodes/Node';

export interface EdgeData {
    color?: number;
    gradientColors?: [string, string];
    thickness?: number;
    thicknessInstanced?: number;
    arrowhead?: boolean | 'source' | 'target' | 'both';
    arrowheadSize?: number;
    arrowheadColor?: number;
    dashed?: boolean;
    dashScale?: number;
    dashSize?: number;
    gapSize?: number;
    label?: string;
    labelColor?: string;
    fontSize?: string;
    labelLod?: {
        distance: number;
        scale?: number;
        style?: string;
    }[];
    [key: string]: unknown;
}

export class Edge {
    public static HIGHLIGHT_COLOR = 0x00ffff;
    public static DEFAULT_OPACITY = 0.8;
    public static HIGHLIGHT_OPACITY = 1.0;
    public static DEFAULT_HOVER_OPACITY_BOOST = 0.1;
    public static DEFAULT_HOVER_THICKNESS_MULTIPLIER = 1.1;

    public id: string;
    public sg: SpaceGraph;
    public source: Node;
    public target: Node;
    public data: EdgeData;
    public line: Line2;
    public geometry: LineGeometry;

    public get object(): Line2 {
        return this.line;
    }

    public arrowheads: { source: THREE.Mesh | null; target: THREE.Mesh | null } = {
        source: null,
        target: null,
    };
    public isHighlighted = false;
    public isHovered = false;

    private _colorStart = new THREE.Color();
    private _colorEnd = new THREE.Color();

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        this.sg = sg;
        this.id = spec.id;
        this.source = source;
        this.target = target;

        const defaultData: EdgeData = {
            color: 0x00d0ff,
            gradientColors: undefined,
            thickness: 3,
            thicknessInstanced: 0.5,
            arrowhead: false,
            arrowheadSize: 10,
            arrowheadColor: undefined,
            dashed: false,
            dashScale: 1,
            dashSize: 3,
            gapSize: 1,
        };

        this.data = { ...defaultData, ...spec.data } as EdgeData;

        if (this.data.gradientColors?.length === 2) {
            this.data.color = undefined;
        } else if (this.data.color === undefined) {
            this.data.color = defaultData.color;
        }

        this.geometry = new LineGeometry();
        this.geometry.setPositions([0, 0, 0, 0, 0, 0.001]);

        const materialConfig: Record<string, unknown> = {
            linewidth: (this.data.thickness as number) || 3,
            transparent: true,
            opacity: Edge.DEFAULT_OPACITY,
            depthTest: false,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            dashed: (this.data.dashed as boolean) || false,
            dashScale: (this.data.dashScale as number) ?? 1,
            dashSize: (this.data.dashSize as number) ?? 3,
            gapSize: (this.data.gapSize as number) ?? 1,
        };

        if (this.data.gradientColors?.length === 2) {
            materialConfig.vertexColors = true;
            this._colorStart.set(this.data.gradientColors[0]);
            this._colorEnd.set(this.data.gradientColors[1]);
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
            materialConfig.color = (this.data.color as number) || 0x00d0ff;
        }

        const material = new LineMaterial(materialConfig);
        this.line = new Line2(this.geometry, material);

        if (material.dashed) this.line.computeLineDistances();
        this.line.renderOrder = -1;
        this.line.userData = { edgeId: this.id };

        this._createArrowheads();
        this.update();
    }

    private _createArrowheads(): void {
        const arrowheadOpt = this.data.arrowhead;

        if (arrowheadOpt === true || arrowheadOpt === 'target' || arrowheadOpt === 'both') {
            this.arrowheads.target = this._createSingleArrowhead('target');
        }
        if (arrowheadOpt === 'source' || arrowheadOpt === 'both') {
            this.arrowheads.source = this._createSingleArrowhead('source');
        }
    }

    private _createSingleArrowhead(_type: string): THREE.Mesh {
        const size = (this.data.arrowheadSize as number) || 10;
        const geometry = new THREE.ConeGeometry(size / 2, size, 8);
        const material = new THREE.MeshBasicMaterial({
            color: (this.data.arrowheadColor as number) || (this.data.color as number) || 0x00d0ff,
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
        if (!this.line || !this.line.material) return;

        if (this.data.gradientColors?.length === 2) {
            if (!this.line.material.vertexColors) {
                this.line.material.vertexColors = true;
                this.line.material.needsUpdate = true;
            }

            this._colorStart.set(this.data.gradientColors[0]);
            this._colorEnd.set(this.data.gradientColors[1]);

            const colors = (this.line.geometry.attributes.color?.array as Float32Array) || [];
            if (colors.length >= 6) {
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
        } else {
            if (this.line.material.vertexColors) {
                this.line.material.vertexColors = false;
                this.line.material.needsUpdate = true;
            }
            this.line.material.color.set((this.data.color as number) || 0x00d0ff);
        }
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        if (updates.data) {
            this.data = { ...this.data, ...updates.data };

            if (updates.data.color && typeof updates.data.color === 'number') {
                this.line.material.color.setHex(updates.data.color);
            }

            if (updates.data.thickness && typeof updates.data.thickness === 'number') {
                this.line.material.linewidth = updates.data.thickness;
            }

            if (updates.data.gradientColors) {
                this._setGradientColors();
            }
        }
        return this;
    }

    update(): void {
        if (!this.line || !this.source || !this.target) return;

        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (
            !isFinite(sourcePos.x) ||
            !isFinite(sourcePos.y) ||
            !isFinite(sourcePos.z) ||
            !isFinite(targetPos.x) ||
            !isFinite(targetPos.y) ||
            !isFinite(targetPos.z)
        ) {
            return;
        }

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
        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (this.arrowheads.target) {
            this.arrowheads.target.position.copy(targetPos);
            const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
            this._orientArrowhead(this.arrowheads.target, direction);

            if (this.arrowheads.target.parent !== this.sg.renderer.scene) {
                this.sg.renderer.scene.add(this.arrowheads.target);
            }
        }

        if (this.arrowheads.source) {
            this.arrowheads.source.position.copy(sourcePos);
            const direction = new THREE.Vector3().subVectors(sourcePos, targetPos).normalize();
            this._orientArrowhead(this.arrowheads.source, direction);

            if (this.arrowheads.source.parent !== this.sg.renderer.scene) {
                this.sg.renderer.scene.add(this.arrowheads.source);
            }
        }
    }

    private _orientArrowhead(arrowhead: THREE.Mesh, direction: THREE.Vector3): void {
        const coneUp = new THREE.Vector3(0, 1, 0);
        arrowhead.quaternion.setFromUnitVectors(coneUp, direction);
    }

    setHighlight(highlight: boolean): void {
        this.isHighlighted = highlight;
        if (!this.line?.material) return;

        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;

        const thicknessMultiplier =
            this.data.gradientColors?.length === 2 && mat.vertexColors ? 2.0 : 1.5;
        mat.linewidth = highlight
            ? (this.data.thickness as number) * thicknessMultiplier
            : (this.data.thickness as number);

        if (!mat.vertexColors)
            mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : (this.data.color as number));
        mat.needsUpdate = true;

        const highlightArrowhead = (arrowhead: THREE.Mesh | null) => {
            if (arrowhead?.material && arrowhead.material instanceof THREE.MeshBasicMaterial) {
                arrowhead.material.color.set(
                    highlight
                        ? Edge.HIGHLIGHT_COLOR
                        : (this.data.arrowheadColor as number) || (this.data.color as number),
                );
                arrowhead.material.opacity = highlight
                    ? Edge.HIGHLIGHT_OPACITY
                    : Edge.DEFAULT_OPACITY;
            }
        };
        highlightArrowhead(this.arrowheads.source);
        highlightArrowhead(this.arrowheads.target);

        if (highlight && this.isHovered) this.setHoverStyle(false, true);
    }

    setHoverStyle(hovered: boolean, force = false): void {
        if (!force && this.isHighlighted) return;
        if (!this.line?.material) return;

        this.isHovered = hovered;

        const mat = this.line.material;
        const baseOpacity = Edge.DEFAULT_OPACITY;
        const baseThickness = (this.data.thickness as number) || 3;

        mat.opacity = hovered
            ? Math.min(1.0, baseOpacity + Edge.DEFAULT_HOVER_OPACITY_BOOST)
            : baseOpacity;
        mat.linewidth = hovered
            ? baseThickness * Edge.DEFAULT_HOVER_THICKNESS_MULTIPLIER
            : baseThickness;
        mat.needsUpdate = true;

        const hoverArrowhead = (arrowhead: THREE.Mesh | null) => {
            if (arrowhead?.material && arrowhead.material instanceof THREE.MeshBasicMaterial) {
                const arrowBaseOpacity = Edge.DEFAULT_OPACITY;
                arrowhead.material.opacity = hovered
                    ? Math.min(1.0, arrowBaseOpacity + Edge.DEFAULT_HOVER_OPACITY_BOOST)
                    : arrowBaseOpacity;
            }
        };
        if (!this.isHighlighted) {
            hoverArrowhead(this.arrowheads.source);
            hoverArrowhead(this.arrowheads.target);
        }
    }

    updateResolution(width: number, height: number): void {
        if (this.line?.material) this.line.material.resolution.set(width, height);
    }

    dispose(): void {
        this.line?.geometry?.dispose();
        this.line?.material?.dispose();
        this.line?.parent?.remove(this.line);

        const disposeArrowhead = (arrowhead: THREE.Mesh | null) => {
            arrowhead?.geometry?.dispose();
            (arrowhead?.material as THREE.Material)?.dispose();
            arrowhead?.parent?.remove(arrowhead);
        };

        disposeArrowhead(this.arrowheads.source);
        this.arrowheads.source = null;
        disposeArrowhead(this.arrowheads.target);
        this.arrowheads.target = null;
    }
}
