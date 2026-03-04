import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';
import * as THREE from 'three';
import { ObjectPoolManager } from '../utils/ObjectPoolManager';

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
        fixedStep: 1 / 60,   // physics timestep in seconds
        springStiffness: 0.1, // Hooke's Law k constant
        springRestLength: 100,
        collide: true,       // whether nodes push each other apart
        collisionRadius: 20, // uniform minimum distance apart
        repulsion: 100,      // electrical repulsion force for non-connected nodes
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
            const cur = node.position;

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

            prev.copy(cur);
            node.updatePosition(nx, ny, nz);
        }

        // --- Constraints Resolution Phase ---
        // (Iterate multiple times for stability if desired, though 1 pass is okay for basic visual FX)

        // 1. Edge Springs (Hooke's Law)
        if (this.settings.springStiffness > 0) {
            for (const edge of this.sg.graph.edges) {
                const n1 = edge.source;
                const n2 = edge.target;
                if (!n1 || !n2) continue;

                const diff = ObjectPoolManager.getInstance().acquireVector3().subVectors(n2.position, n1.position);
                const dist = diff.length() || 0.0001;

                // F = -k * x
                const displacement = dist - this.settings.springRestLength;
                const force = displacement * this.settings.springStiffness;

                diff.normalize().multiplyScalar(force * 0.5); // 0.5 because distributed over two nodes

                if (!n1.data?.pinned && !n1.data?.physicsStatic) {
                    n1.position.add(diff);
                }
                if (!n2.data?.pinned && !n2.data?.physicsStatic) {
                    n2.position.sub(diff);
                }

                ObjectPoolManager.getInstance().releaseVector3(diff);
            }
        }

        // 2. Node Collisions / Repulsion
        if (this.settings.collide || this.settings.repulsion > 0) {
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const n1 = nodes[i];
                    const n2 = nodes[j];

                    const diff = ObjectPoolManager.getInstance().acquireVector3().subVectors(n1.position, n2.position);
                    const distSq = diff.lengthSq() || 0.0001;
                    const dist = Math.sqrt(distSq);

                    const diffNormalized = diff.clone().divideScalar(dist);

                    // Hard collision constraint
                    if (this.settings.collide && dist < this.settings.collisionRadius * 2) {
                        const overlap = (this.settings.collisionRadius * 2) - dist;
                        const push = diffNormalized.clone().multiplyScalar(overlap * 0.5);

                        if (!n1.data?.pinned && !n1.data?.physicsStatic) n1.position.add(push);
                        if (!n2.data?.pinned && !n2.data?.physicsStatic) n2.position.sub(push);
                    }

                    // Soft electrical repulsion
                    if (this.settings.repulsion > 0 && distSq < 100000) {
                        const repForce = this.settings.repulsion / distSq;
                        const repPush = diffNormalized.clone().multiplyScalar(repForce);

                        if (!n1.data?.pinned && !n1.data?.physicsStatic) n1.position.add(repPush);
                        if (!n2.data?.pinned && !n2.data?.physicsStatic) n2.position.sub(repPush);
                    }

                    ObjectPoolManager.getInstance().releaseVector3(diff);
                }
            }
        }

        // Update ThreeJS objects & visual edges
        for (const node of nodes) {
            node.updatePosition(node.position.x, node.position.y, node.position.z);
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
