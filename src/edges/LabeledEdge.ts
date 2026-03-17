import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';
import { Edge } from './Edge';
import { DOMUtils } from '../utils/DOMUtils';

/**
 * LabeledEdge — Straight edge with a mid-point text label rendered via CSS2D.
 *
 * data options:
 *   label     : string (falls back to spec.id)
 *   color     : line hex color (default 0x888888)
 *   labelColor: CSS color string (default '#ffffff')
 *   fontSize  : CSS font-size (default '12px')
 */
export class LabeledEdge extends Edge {
    private labelEl: HTMLElement;
    private labelObject: CSS2DObject;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        // Style the line
        const color = spec.data?.color ?? 0x888888;
        (this.object.material as THREE.LineBasicMaterial).color.setHex(color);

        // Build DOM label
        this.labelEl = DOMUtils.createElement('div');
        this.labelEl.className = 'sg-edge-label';
        Object.assign(this.labelEl.style, {
            color: spec.data?.labelColor ?? '#ffffff',
            fontSize: spec.data?.fontSize ?? '12px',
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

        this._positionLabel();
    }

    private _positionLabel() {
        const mid = new THREE.Vector3()
            .addVectors(this.source.position, this.target.position)
            .multiplyScalar(0.5);
        this.labelObject.position.copy(mid).sub(this.object.position);
    }

    update(): void {
        super.update();
        this._positionLabel();
    }

    updateSpec(updates: Partial<EdgeSpec>): void {
        super.updateSpec(updates);
        if (updates.data?.label !== undefined) {
            this.labelEl.textContent = updates.data.label;
        }
        if (updates.data?.labelColor) {
            this.labelEl.style.color = updates.data.labelColor;
        }
        if (updates.data?.color) {
            (this.object.material as THREE.LineBasicMaterial).color.setHex(updates.data.color);
        }
    }

    dispose(): void {
        this.labelEl.parentNode?.removeChild(this.labelEl);
        super.dispose();
    }
}
