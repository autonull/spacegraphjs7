import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

/**
 * CircularLayout — Places nodes evenly around a circle (or ellipse) on the XY plane.
 *
 * Plugin settings:
 *   radiusX : horizontal radius (default 300)
 *   radiusY : vertical radius   (default 300, = radiusX for a circle)
 *   startAngle : starting angle in radians (default 0 = right)
 *   z          : constant Z for all placed nodes (default 0)
 */
export class CircularLayout implements ISpaceGraphPlugin {
    readonly id = 'circular-layout';
    readonly name = 'Circular Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        radiusX: 300,
        radiusY: 300,
        startAngle: 0,
        z: 0,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values()).filter((n) => !n.data?.pinned);
        if (!nodes.length) return;

        const step = (2 * Math.PI) / nodes.length;

        nodes.forEach((node, i) => {
            const angle = this.settings.startAngle + i * step;
            const x = this.settings.radiusX * Math.cos(angle);
            const y = this.settings.radiusY * Math.sin(angle);
            node.updatePosition(x, y, this.settings.z);
        });

        for (const edge of this.sg.graph.edges) edge.update?.();
    }

    onPreRender(_delta: number): void {}
}
