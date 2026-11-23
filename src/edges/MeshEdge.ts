import * as THREE from 'three';
import { MathPool, withPooledVectors } from '../core/pooling/ObjectPool';
import type { EdgeSpec } from '../types';
import { dataColor } from '../utils/color';
import { ribbonWidth } from '../utils/ribbon';
import { ThreeDisposer } from '../utils';
import { directionBetween, midpoint } from '../utils/vector';
import { Edge } from './Edge';

/** Shared geometry lifecycle for ribbon edges drawn as a single three.js mesh. */
export abstract class MeshEdge extends Edge {
    protected initialized = false;
    abstract readonly mesh: THREE.Mesh;

    /** Orients and scales the mesh over the source→target span. */
    protected abstract place(
        direction: THREE.Vector3,
        target: THREE.Vector3,
        width: number,
        length: number,
    ): void;

    update(): void {
        if (!this.initialized) return;
        super.update();
        const pool = MathPool.getInstance();
        const { source, target, data } = this;
        const width = ribbonWidth(data);

        withPooledVectors(pool, 2, (direction, midPoint) => {
            const length = directionBetween(source.position, target.position, direction).length();
            midpoint(source.position, target.position, midPoint);
            this.mesh.position.copy(midPoint);
            this.place(direction, target.position, width, length);
        });
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);
        const color = dataColor(updates.data?.color);
        if (color) (this.mesh.material as THREE.MeshBasicMaterial).color.set(color);
        return this;
    }

    dispose(): void {
        ThreeDisposer.disposeAndDetach(this.mesh);
        super.dispose();
    }
}
