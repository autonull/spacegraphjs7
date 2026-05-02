import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';

export class CircularLayout extends BaseLayout {
    readonly id = 'circular-layout';
    readonly name = 'Circular Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return { radiusX: 300, radiusY: 300, startAngle: 0, z: 0, animate: true, duration: 1.0 };
    }

    apply(options?: LayoutOptions): void {
        const { radiusX = 300, radiusY = 300, startAngle = 0, z = 0, animate = true, duration = 1.0, skipPinned = true } = { ...this.config, ...options } as any;
        const nodes = Array.from(this.graph.getNodes()).filter(n => !skipPinned || !n.data.pinned);
        if (!nodes.length) return;

        nodes.forEach((node, i) => {
            const angle = startAngle + (i / nodes.length) * (2 * Math.PI);
            const targetPos = new THREE.Vector3(radiusX * Math.cos(angle), radiusY * Math.sin(angle), z);
            this.applyPosition(node, targetPos, { animate, duration });
        });

        this.updateEdges();
        this.emitLayoutApplied({ duration });
    }
}