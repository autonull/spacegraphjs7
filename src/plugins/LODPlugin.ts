import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { HtmlNode } from '../nodes/HtmlNode';

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
            if (node instanceof HtmlNode) {
                const distance = cameraPosition.distanceTo(node.position);

                if (distance > this.maxDistance) {
                    // Toggle off
                    node.cssObject.visible = false;
                    node.domElement.style.display = 'none';
                } else {
                    // Toggle on
                    node.cssObject.visible = true;
                    node.domElement.style.display = 'flex';
                }
            }
        }
    }
}
