import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

/**
 * GridLayout — Arranges nodes in a uniform rectangular grid on the XY plane.
 *
 * data options per node:
 *   pinned : boolean — skip this node during layout
 *
 * Plugin options (pass via settings):
 *   columns  : number of columns (default: ceil(sqrt(n)))
 *   spacingX : horizontal spacing (default 200)
 *   spacingY : vertical spacing   (default 200)
 *   offsetX  : world X origin     (default 0)
 *   offsetY  : world Y origin     (default 0)
 */
export class GridLayout implements ISpaceGraphPlugin {
    readonly id = 'grid-layout';
    readonly name = 'Grid Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        columns: 0,
        spacingX: 200,
        spacingY: 200,
        offsetX: 0,
        offsetY: 0,
        animate: true,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    /** Call explicitly or triggered externally. Does NOT run every frame. */
    apply(): void {
        const nodes = [];
        for (const n of this.sg.graph.nodes.values()) {
            if (!n.data?.pinned) nodes.push(n);
        }
        if (!nodes.length) return;

        const cols =
            this.settings.columns > 0 ? this.settings.columns : Math.ceil(Math.sqrt(nodes.length));

        let i = 0;
        const targetPos = new THREE.Vector3();
        for (const node of nodes) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = this.settings.offsetX + col * this.settings.spacingX;
            const y = this.settings.offsetY - row * this.settings.spacingY;
            targetPos.set(x, y, node.position.z);
            node.applyPosition(targetPos, this.settings.animate ?? true);
            i++;
        }

        // Refresh all edge geometries
        for (const edge of this.sg.graph.edges) edge.update?.();
    }

    // GridLayout is on-demand, not per-frame
    onPreRender(_delta: number): void {}
}
