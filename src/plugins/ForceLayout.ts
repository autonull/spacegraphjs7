import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import { BaseLayout, LayoutOptions } from '../core/plugins/BaseLayout';

export interface ForceLayoutConfig {
    repulsion: number;
    attraction: number;
    damping: number;
    gravity: number;
    minDistance: number;
    maxDistance: number;
    iterations: number;
    temperature: number;
    animate?: boolean;
    duration?: number;
    [key: string]: unknown;
}

export class ForceLayout extends BaseLayout {
    readonly id = 'force-layout';
    readonly name = 'Force Directed';

    private velocities = new Map<string, THREE.Vector3>();

    protected defaultConfig(): ForceLayoutConfig {
        return {
            repulsion: 10000,
            attraction: 0.01,
            damping: 0.9,
            gravity: 0.1,
            minDistance: 50,
            maxDistance: 1000,
            iterations: 50,
            temperature: 100,
            animate: true,
            duration: 1.0,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const { animate = this.config.animate ?? true, duration = this.config.duration ?? 1.0 } =
            options ?? {};

        const nodes = Array.from(this.graph.getNodes()) as Node[];
        if (!nodes.length) return;

        this.velocities.clear();
        for (const node of nodes) {
            this.velocities.set(node.id, new THREE.Vector3());
        }

        for (let i = 0; i < (this.config as ForceLayoutConfig).iterations; i++) {
            this.simulateStep(nodes);
        }

        for (const node of nodes) {
            if ((node.data as Record<string, unknown>)?.pinned) continue;
            this.applyPosition(node, node.position.clone(), { animate, duration });
        }

        for (const edge of this.graph.getEdges()) (edge as Edge).update?.();

        this.events.emit('layout:applied', {
            layout: this.id,
            duration,
            timestamp: Date.now(),
        });
    }

    private simulateStep(nodes: Node[]): void {
        const config = this.config as ForceLayoutConfig;
        const forces = new Map<string, THREE.Vector3>();
        for (const node of nodes) forces.set(node.id, new THREE.Vector3());

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const diff = new THREE.Vector3().subVectors(a.position, b.position);
                const distSq = diff.lengthSq();
                const dist = Math.sqrt(distSq);
                if (dist < 0.1) continue;

                const force = config.repulsion / distSq;
                const direction = diff.normalize();
                forces.get(a.id)!.add(direction.clone().multiplyScalar(force));
                forces.get(b.id)!.sub(direction.clone().multiplyScalar(force));
            }
        }

        for (const edge of this.graph.getEdges()) {
            const e = edge as Edge;
            const source = this.graph.getNode(e.source.id);
            const target = this.graph.getNode(e.target.id);
            if (!source || !target) continue;

            const diff = new THREE.Vector3().subVectors(target.position, source.position);
            const dist = diff.length();
            if (dist < config.minDistance) continue;

            const force = config.attraction * (dist - config.minDistance);
            const direction = diff.normalize();
            forces.get(source.id)!.add(direction.clone().multiplyScalar(force));
            forces.get(target.id)!.sub(direction.clone().multiplyScalar(force));
        }

        for (const node of nodes) {
            const force = forces.get(node.id)!;
            const dist = node.position.length();
            if (dist > 0) {
                force.add(
                    node.position
                        .clone()
                        .normalize()
                        .negate()
                        .multiplyScalar(config.gravity * dist),
                );
            }
        }

        for (const node of nodes) {
            if ((node.data as Record<string, unknown>)?.pinned) continue;

            const velocity = this.velocities.get(node.id)!;
            velocity.add(forces.get(node.id)!).multiplyScalar(config.damping);
            node.position.add(velocity);

            const maxMove = config.temperature * (1 - this.simulationProgress);
            if (node.position.length() > maxMove) {
                node.position.clampLength(0, maxMove);
            }
        }
    }

    private get simulationProgress(): number {
        return 0.5;
    }

    dispose(): void {
        this.velocities.forEach((v) => v.set(0, 0, 0));
        this.velocities.clear();
    }
}
