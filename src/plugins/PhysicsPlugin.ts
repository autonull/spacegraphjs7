import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';
import * as THREE from 'three';

/**
 * PhysicsPlugin — Verlet-based 2-D physics stub.
 *
 * Provides a foundation for constraint-based or particle physics.
 * Each node gets a position, previous-position (for Verlet integration),
 * and optional mass from node.data.mass.
 *
 * Current behaviours:
 *   - Gravity (optional, disabled by default)
 *   - Simple position damping
 *   - Ground plane collision (y = 0, disabled by default)
 *
 * Extend by adding constraints, springs, or collision detection.
 */
export class PhysicsPlugin implements ISpaceGraphPlugin {
    readonly id = 'physics-plugin';
    readonly name = 'Physics Plugin';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    /** Previous positions for Verlet integration (keyed by node.id) */
    private prev: Map<string, THREE.Vector3> = new Map();

    public settings = {
        enabled: false,      // opt-in; won't interfere unless activated
        gravity: -9.8,       // units/s² in Y direction; 0 to disable
        damping: 0.98,       // velocity multiplier each step (0–1)
        groundY: -500,       // Y below which nodes are reflected; null to disable
        fixedStep: 1 / 60,     // physics timestep in seconds
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    onPreRender(delta: number): void {
        if (!this.settings.enabled) return;
        this._step(Math.min(delta, 0.05)); // cap to avoid explosion on large deltas
    }

    private _step(dt: number) {
        const nodes = Array.from(this.sg.graph.nodes.values()) as Node[];
        const grav = this.settings.gravity;

        for (const node of nodes) {
            if (node.data?.pinned || node.data?.physicsStatic) continue;

            // Initialise previous position on first encounter
            if (!this.prev.has(node.id)) {
                this.prev.set(node.id, node.position.clone());
            }

            const prev = this.prev.get(node.id)!;
            const cur = node.position.clone();

            // Verlet: newPos = 2*cur - prev + accel * dt²
            const vx = (cur.x - prev.x) * this.settings.damping;
            const vy = (cur.y - prev.y) * this.settings.damping;
            const vz = (cur.z - prev.z) * this.settings.damping;

            let nx = cur.x + vx;
            let ny = cur.y + vy + grav * dt * dt;
            const nz = cur.z + vz;

            // Ground plane
            if (this.settings.groundY !== null && ny < this.settings.groundY) {
                ny = this.settings.groundY;
                prev.y = ny; // absorb bounce (simple inelastic)
            }

            this.prev.set(node.id, cur);
            node.updatePosition(nx, ny, nz);
        }

        for (const edge of this.sg.graph.edges) edge.update?.();
    }

    /** Pin a node so physics won't move it. */
    pin(nodeId: string): void {
        const node = this.sg.graph.nodes.get(nodeId);
        if (node) node.data.physicsStatic = true;
    }

    /** Unpin a node. */
    unpin(nodeId: string): void {
        const node = this.sg.graph.nodes.get(nodeId);
        if (node) delete node.data.physicsStatic;
    }

    dispose(): void {
        this.prev.clear();
    }
}
