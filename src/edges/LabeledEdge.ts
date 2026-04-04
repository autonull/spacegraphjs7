import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Edge } from './Edge';
import { DOMUtils } from '../utils/DOMUtils';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec, LabelLodLevel } from '../types';
import type { Node } from '../nodes/Node';

/**
 * LabeledEdge — Straight edge with a mid-point text label rendered via CSS2D.
 *
 * data options:
 *   label     : string (falls back to spec.id)
 *   color     : line hex color (default 0x888888)
 *   labelColor: CSS color string (default '#ffffff')
 *   fontSize  : CSS font-size (default '12px')
 *   labelLod  : Array of { distance, scale, style } for LOD-based visibility/scaling
 */
export class LabeledEdge extends Edge {
    private labelEl: HTMLElement;
    private labelObject: CSS2DObject;
    public labelLod: LabelLodLevel[] = [];

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        const data = spec.data as EdgeData & {
            labelColor?: string;
            fontSize?: string;
            labelLod?: LabelLodLevel[];
        };
        const color = spec.data?.color ?? 0x888888;
        (this.object.material as LineMaterial).color.setHex(color);

        this.labelEl = DOMUtils.createElement('div');
        this.labelEl.className = 'sg-edge-label';
        Object.assign(this.labelEl.style, {
            color: data?.labelColor ?? '#ffffff',
            fontSize: data?.fontSize ?? '12px',
            fontFamily: 'sans-serif',
            background: 'rgba(0,0,0,0.55)',
            padding: '1px 5px',
            borderRadius: '3px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
        });
        this.labelEl.textContent = spec.data?.label ?? spec.id;

        this.labelObject = new CSS2DObject(this.labelEl);
        this.object.add(this.labelObject);

        if (data?.labelLod) {
            this.labelLod = data.labelLod;
        }

        this._positionLabel();
    }

    private _positionLabel() {
        const mid = new THREE.Vector3()
            .addVectors(this.source.position, this.target.position)
            .multiplyScalar(0.5);
        this.labelObject.position.copy(mid).sub(this.object.position);
    }

    updateLod(_distance: number): void {
        if (!this.labelLod || this.labelLod.length === 0) {
            this.labelEl.style.visibility = '';
            this.labelEl.style.transform = '';
            return;
        }

        const sortedLodLevels = [...this.labelLod].sort(
            (a, b) => (b.distance ?? 0) - (a.distance ?? 0),
        );
        const camera = this.sg?.renderer?.camera;
        if (!camera) return;

        const midPoint = new THREE.Vector3()
            .addVectors(this.source.position, this.target.position)
            .multiplyScalar(0.5);
        const distanceToCamera = midPoint.distanceTo(camera.position);

        let ruleApplied = false;
        for (const level of sortedLodLevels) {
            if (distanceToCamera >= (level.distance ?? 0)) {
                this.labelEl.style.visibility = level.style?.includes('visibility:hidden')
                    ? 'hidden'
                    : '';
                this.labelEl.style.transform =
                    level.scale !== undefined ? `scale(${level.scale})` : '';
                ruleApplied = true;
                break;
            }
        }

        if (!ruleApplied) {
            this.labelEl.style.visibility = '';
            this.labelEl.style.transform = '';
        }
    }

    update(): void {
        super.update();
        this._positionLabel();
        this.updateLod(0);
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);
        const data = updates.data as EdgeData & { labelColor?: string; labelLod?: LabelLodLevel[] };
        if (updates.data?.label !== undefined) {
            this.labelEl.textContent = updates.data.label;
        }
        if (data?.labelColor) {
            this.labelEl.style.color = data.labelColor;
        }
        if (data?.color) {
            (this.object.material as LineMaterial).color.setHex(data.color);
        }
        if (data?.labelLod !== undefined) {
            this.labelLod = data.labelLod;
        }
        return this;
    }

    dispose(): void {
        this.labelEl.parentNode?.removeChild(this.labelEl);
        super.dispose();
    }
}
