import { MathPool, withPooledVectors } from '../core';
import type * as THREE from 'three';
import type { Node } from '../nodes/Node';
import { BaseSystemPlugin } from './BaseSystemPlugin';

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
export class PhysicsPlugin extends BaseSystemPlugin {
    readonly id = 'physics';
    readonly name = 'Physics Plugin';
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
    private prev = new Map<string, THREE.Vector3>();

    onPreRender(delta: number): void {
        if (!this.settings.enabled) return;
        this._step(Math.min(delta, 0.05));
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

    private movable(node: Node): boolean {
        return !node.data?.pinned && !node.data?.physicsStatic;
    }

    private _step(dt: number): void {
        const nodes = Array.from(this.sg.graph.nodes.values()) as Node[];
        this._integrate(nodes, dt);
        this._applySprings();
        this._applyCollisions(nodes);
        this._sync(nodes);
    }

    private _integrate(nodes: readonly Node[], dt: number): void {
        const grav = this.settings.gravity;

        for (const node of nodes) {
            if (!this.movable(node)) continue;

            if (!this.prev.has(node.id)) this.prev.set(node.id, node.position.clone());

            const prev = this.prev.get(node.id)!;
            const cur = node.position;

            const vx = (cur.x - prev.x) * this.settings.damping;
            const vy = (cur.y - prev.y) * this.settings.damping;
            const vz = (cur.z - prev.z) * this.settings.damping;

            const nx = cur.x + vx;
            let ny = cur.y + vy + grav * dt * dt;
            const nz = cur.z + vz;

            if (this.settings.groundY !== null && ny < this.settings.groundY) {
                ny = this.settings.groundY;
                prev.y = ny;
            }

            prev.copy(cur);
            node.updatePosition(nx, ny, nz);
        }
    }

    private _applySprings(): void {
        if (this.settings.springStiffness <= 0) return;
        const pool = MathPool.getInstance();

        for (const [, edge] of this.sg.graph.edges) {
            const n1 = edge.source;
            const n2 = edge.target;
            if (!n1 || !n2) continue;

            withPooledVectors(pool, 1, (diff) => {
                diff.subVectors(n2.position, n1.position);
                const dist = diff.length() || 0.0001;
                const force = (dist - this.settings.springRestLength) * this.settings.springStiffness;
                diff.normalize().multiplyScalar(force * 0.5);

                if (this.movable(n1)) n1.position.add(diff);
                if (this.movable(n2)) n2.position.sub(diff);
            });
        }
    }

    private _applyCollisions(nodes: readonly Node[]): void {
        if (!this.settings.collide && this.settings.repulsion <= 0) return;
        const pool = MathPool.getInstance();

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i]!;
                const n2 = nodes[j]!;

                withPooledVectors(pool, 3, (diff, diffNormalized, push) => {
                    diff.subVectors(n1.position, n2.position);
                    const distSq = diff.lengthSq() || 0.0001;
                    const dist = Math.sqrt(distSq);
                    diffNormalized.copy(diff).divideScalar(dist);

                    if (this.settings.collide && dist < this.settings.collisionRadius * 2) {
                        push.copy(diffNormalized).multiplyScalar((this.settings.collisionRadius * 2 - dist) * 0.5);
                        if (this.movable(n1)) n1.position.add(push);
                        if (this.movable(n2)) n2.position.sub(push);
                    }

                    if (this.settings.repulsion > 0 && distSq < 100000) {
                        push.copy(diffNormalized).multiplyScalar(this.settings.repulsion / distSq);
                        if (this.movable(n1)) n1.position.add(push);
                        if (this.movable(n2)) n2.position.sub(push);
                    }
                });
            }
        }
    }

    private _sync(nodes: readonly Node[]): void {
        for (const node of nodes)
            node.updatePosition(node.position.x, node.position.y, node.position.z);
        for (const [, edge] of this.sg.graph.edges) edge.update?.();
    }
}
