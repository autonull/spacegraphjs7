import * as THREE from 'three';
import { MathPool } from '../utils/MathPool';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import type { Node } from '../nodes/Node';

export class ForceLayout implements ISpaceGraphPlugin {
    readonly id = 'force-layout';
    readonly name = 'Force Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        attraction: 0.01,
        repulsion: 10000,
        damping: 0.9,
        enabled: true,
    };

    private velocity: Map<string, THREE.Vector3> = new Map();

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    onPreRender(_delta: number): void {
        if (!this.settings.enabled) return;
        this.update();
    }

    update(): void {
        const nodes = Array.from(this.sg.graph.nodes.values()) as Node[];
        const edges = this.sg.graph.edges;

        for (const node of nodes) {
            if (!this.velocity.has(node.id)) {
                this.velocity.set(node.id, new THREE.Vector3(0, 0, 0));
            }
        }

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];

                const diff = MathPool.getInstance().acquireVector3();
                diff.subVectors(n1.position, n2.position);
                const distSq = diff.lengthSq() || 1;

                if (distSq < 100000) {
                    const force = this.settings.repulsion / distSq;
                    const dir = MathPool.getInstance().acquireVector3();
                    dir.copy(diff).normalize().multiplyScalar(force);

                    this.velocity.get(n1.id)?.add(dir);
                    this.velocity.get(n2.id)?.sub(dir);
                    MathPool.getInstance().releaseVector3(dir);
                }
                MathPool.getInstance().releaseVector3(diff);
            }
        }

        for (const edge of edges) {
            const n1 = edge.source;
            const n2 = edge.target;

            const diff = MathPool.getInstance().acquireVector3();
            diff.subVectors(n2.position, n1.position);

            const dist = diff.length();
            const force = dist * this.settings.attraction;

            const dir = MathPool.getInstance().acquireVector3();
            dir.copy(diff).normalize().multiplyScalar(force);

            this.velocity.get(n1.id)?.add(dir);
            this.velocity.get(n2.id)?.sub(dir);

            MathPool.getInstance().releaseVector3(dir);
            MathPool.getInstance().releaseVector3(diff);
        }

        for (const node of nodes) {
            if (node.data.pinned) continue;

            const vel = this.velocity.get(node.id);
            if (vel) {
                vel.multiplyScalar(this.settings.damping);

                if (vel.lengthSq() > 0.01) {
                    node.updatePosition(
                        node.position.x + vel.x,
                        node.position.y + vel.y,
                        node.position.z + vel.z,
                    );
                }
            }
        }

        for (const edge of edges) {
            edge.update();
        }
    }
}
