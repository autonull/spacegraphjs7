import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';
import type { Edge } from '../../edges/Edge';

export class CircularLayout extends BaseLayout {
    readonly id = 'circular-layout';
    readonly name = 'Circular Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return {
            radiusX: 300,
            radiusY: 300,
            startAngle: 0,
            z: 0,
            animate: true,
            duration: 1.0,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            radiusX = this.config.radiusX as number,
            radiusY = this.config.radiusY as number,
            startAngle = this.config.startAngle as number,
            z = this.config.z as number,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.0,
        } = options ?? {};

        const nodes = Array.from(this.graph.getNodes()).filter(
            (n) => !(n.data as Record<string, unknown>).pinned,
        );
        if (!nodes.length) return;

        const step = (2 * Math.PI) / nodes.length;
        const targetPos = new THREE.Vector3();

        nodes.forEach((node, i) => {
            const angle = startAngle + i * step;
            targetPos.set(radiusX * Math.cos(angle), radiusY * Math.sin(angle), z);
            this.applyPosition(node, targetPos, { animate, duration });
        });

        for (const edge of this.graph.getEdges()) (edge as Edge).update?.();
    }
}
