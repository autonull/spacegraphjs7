import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';

export class GridLayout extends BaseLayout {
    readonly id = 'grid-layout';
    readonly name = 'Grid Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return { columns: 0, spacingX: 200, spacingY: 200, offsetX: 0, offsetY: 0, animate: true, duration: 1.0 };
    }

    apply(options?: LayoutOptions): void {
        const { columns = 0, spacingX = 200, spacingY = 200, offsetX = 0, offsetY = 0, animate = true, duration = 1.0, skipPinned = true } = { ...this.config, ...options } as any;
        const nodes = Array.from(this.graph.getNodes()).filter(n => !skipPinned || !n.data.pinned);
        if (!nodes.length) return;

        const cols = columns > 0 ? columns : Math.ceil(Math.sqrt(nodes.length));

        nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const targetPos = new THREE.Vector3(offsetX + col * spacingX, offsetY - row * spacingY, node.position.z);
            this.applyPosition(node, targetPos, { animate, duration });
        });

        this.updateEdges();
        this.emitLayoutApplied({ duration });
    }
}