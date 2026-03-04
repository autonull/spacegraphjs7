import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

/**
 * DottedEdge — Dashed / dotted line edge using a custom dash pattern.
 *
 * data options:
 *   color      : hex color (default 0x888888)
 *   dashSize   : world-space dash length  (default 8)
 *   gapSize    : world-space gap length   (default 6)
 *   linewidth  : (browser-limited, usually 1) (default 2)
 */
export class DottedEdge {
    public id: string;
    public sg: SpaceGraph;
    public source: Node;
    public target: Node;
    public data: any;
    public object: THREE.Line;
    public geometry: THREE.BufferGeometry;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        this.sg = sg;
        this.id = spec.id;
        this.source = source;
        this.target = target;
        this.data = spec.data ?? {};

        const dashSize = spec.data?.dashSize ?? 8;
        const gapSize = spec.data?.gapSize ?? 6;
        const color = spec.data?.color ?? 0x888888;

        const points = [source.position.clone(), target.position.clone()];
        this.geometry = new THREE.BufferGeometry().setFromPoints(points);

        // LineDashedMaterial requires computeLineDistances()
        const material = new THREE.LineDashedMaterial({
            color,
            dashSize,
            gapSize,
            linewidth: spec.data?.linewidth ?? 2,
        });

        this.object = new THREE.Line(this.geometry, material);
        this.object.computeLineDistances();
    }

    updateSpec(updates: Partial<EdgeSpec>): void {
        if (updates.data) {
            this.data = { ...this.data, ...updates.data };
            const mat = this.object.material as THREE.LineDashedMaterial;
            if (updates.data.color) mat.color.setHex(updates.data.color);
            if (updates.data.dashSize) mat.dashSize = updates.data.dashSize;
            if (updates.data.gapSize) mat.gapSize = updates.data.gapSize;
        }
    }

    update() {
        const positions = new Float32Array([
            this.source.position.x,
            this.source.position.y,
            this.source.position.z,
            this.target.position.x,
            this.target.position.y,
            this.target.position.z,
        ]);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.attributes.position.needsUpdate = true;
        this.object.computeLineDistances();
    }

    dispose(): void {
        this.object.parent?.remove(this.object);
        this.geometry.dispose();
        (this.object.material as THREE.Material).dispose();
    }
}
