import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';

export class GridLayout extends BaseLayout {
    readonly id = 'grid-layout';
    readonly name = 'Grid Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return {
            columns: 0,
            spacingX: 200,
            spacingY: 200,
            offsetX: 0,
            offsetY: 0,
            animate: true,
            duration: 1.0,
        };
    }

    async apply(options?: LayoutOptions): Promise<void> {
        const {
            columns = this.config.columns as number,
            spacingX = this.config.spacingX as number,
            spacingY = this.config.spacingY as number,
            offsetX = this.config.offsetX as number,
            offsetY = this.config.offsetY as number,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.0,
        } = options ?? {};

        const nodes = this.getNonPinnedNodes();
        if (!nodes.length) return;

        const cols = columns > 0 ? columns : Math.ceil(Math.sqrt(nodes.length));
        const targetPos = new THREE.Vector3();

for (const [i, node] of nodes.entries()) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      targetPos.set(offsetX + col * spacingX, offsetY - row * spacingY, node.position.z);
      this.applyPosition(node, targetPos, { animate, duration });
    }

        this.updateEdges();
        this.emitLayoutApplied({ duration });
    }
}
