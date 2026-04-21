import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';

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

        const nodes = this.getNonPinnedNodes();
        if (!nodes.length) return;

        const step = (2 * Math.PI) / nodes.length;
        const targetPos = new THREE.Vector3();

for (const [i, node] of nodes.entries()) {
      const angle = startAngle + i * step;
      targetPos.set(radiusX * Math.cos(angle), radiusY * Math.sin(angle), z);
      this.applyPosition(node, targetPos, { animate, duration });
    }

        this.updateEdges();
        this.emitLayoutApplied({ duration });
    }
}
