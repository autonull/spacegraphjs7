import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';

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
export class GridLayout implements Plugin {
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

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
    }

    /** Call explicitly or triggered externally. Does NOT run every frame. */
    apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values()).filter((n) => !n.data?.pinned);
        if (!nodes.length) return;

        const { columns, spacingX, spacingY, offsetX, offsetY, animate } = this.settings;
        const cols = columns > 0 ? columns : Math.ceil(Math.sqrt(nodes.length));

        const targetPos = new THREE.Vector3();
        nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            targetPos.set(offsetX + col * spacingX, offsetY - row * spacingY, node.position.z);
            node.applyPosition(targetPos, { animate });
        });

        for (const edge of this.sg.graph.edges.values()) edge.update?.();
    }
}
