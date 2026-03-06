import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { DOMNode } from '../nodes/DOMNode';

export class LODPlugin implements ISpaceGraphPlugin {
    readonly id = 'lod';
    readonly name = 'Level of Detail';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private maxDistance = 3000;

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    onPreRender(_delta: number): void {
        const cameraPosition = this.sg.renderer.camera.position;

        const nodes = Array.from(this.sg.graph.nodes.values());
        for (const node of nodes) {
            if (node instanceof DOMNode) {
                const distance = cameraPosition.distanceTo(node.position);
                node.setVisibility(distance <= this.maxDistance);
            }
        }
    }
}
