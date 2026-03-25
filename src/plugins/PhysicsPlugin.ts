import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';
import * as THREE from 'three';
import { MathPool } from '../utils/MathPool';

/**
 * PhysicsPlugin — Verlet-based 2-D physics simulation.
 *
 * Provides force-directed graph layout with:
 *   - Gravity (optional)
 *   - Spring forces (Hooke's Law)
 *   - Electrical repulsion
 *   - Simple damping
 *   - Ground plane collision
 *   - Node-to-node collision
 */
export class PhysicsPlugin implements ISpaceGraphPlugin {
    readonly id = 'physics-plugin';
    readonly name = 'Physics Plugin';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private prev = new Map<string, THREE.Vector3>();

    public settings = {
        enabled: false,
        gravity: -9.8,
        damping: 0.98,
        groundY: -500,
        fixedStep: 1 / 60,
        springStiffness: 0.1,
        springRestLength: 100,
        collide: true,
        collisionRadius: 20,
        repulsion: 100,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    onPreRender(delta: number): void {
        if (!this.settings.enabled) return;
        this._step(Math.min(delta, 0.05));
    }

    private _step(dt: number) {
        const nodes = Array.from(this.sg.graph.nodes.values()) as Node[];
        const grav = this.settings.gravity;

        for (const node of nodes) {
            if (node.data?.pinned || node.data?.physicsStatic) continue;

            if (!this.prev.has(node.id)) {
                this.prev.set(node.id, node.position.clone());
            }

            const prev = this.prev.get(node.id)!;
            const cur = node.position;

            const vx = (cur.x - prev.x) * this.settings.damping;
            const vy = (cur.y - prev.y) * this.settings.damping;
            const vz = (cur.z - prev.z) * this.settings.damping;

            const nx = cur.x + vx;
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

                const diff = MathPool.getInstance()
                    .acquireVector3()
                    .subVectors(n2.position, n1.position);
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

                MathPool.getInstance().releaseVector3(diff);
            }
        }

        // 2. Node Collisions / Repulsion
        if (this.settings.collide || this.settings.repulsion > 0) {
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const n1 = nodes[i];
                    const n2 = nodes[j];

                    const diff = MathPool.getInstance()
                        .acquireVector3()
                        .subVectors(n1.position, n2.position);
                    const distSq = diff.lengthSq() || 0.0001;
                    const dist = Math.sqrt(distSq);

                    // Avoid instantiating clones in a hot double-nested loop
                    const diffNormalized = MathPool.getInstance()
                        .acquireVector3()
                        .copy(diff)
                        .divideScalar(dist);
                    const push = MathPool.getInstance().acquireVector3();

                    // Hard collision constraint
                    if (this.settings.collide && dist < this.settings.collisionRadius * 2) {
                        const overlap = this.settings.collisionRadius * 2 - dist;
                        push.copy(diffNormalized).multiplyScalar(overlap * 0.5);

                        if (!n1.data?.pinned && !n1.data?.physicsStatic) n1.position.add(push);
                        if (!n2.data?.pinned && !n2.data?.physicsStatic) n2.position.sub(push);
                    }

                    // Soft electrical repulsion
                    if (this.settings.repulsion > 0 && distSq < 100000) {
                        const repForce = this.settings.repulsion / distSq;
                        push.copy(diffNormalized).multiplyScalar(repForce);

                        if (!n1.data?.pinned && !n1.data?.physicsStatic) n1.position.add(push);
                        if (!n2.data?.pinned && !n2.data?.physicsStatic) n2.position.sub(push);
                    }

                    MathPool.getInstance().releaseVector3(push);
                    MathPool.getInstance().releaseVector3(diffNormalized);
                    MathPool.getInstance().releaseVector3(diff);
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
