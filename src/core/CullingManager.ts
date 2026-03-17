import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import { DOMNode } from '../nodes/DOMNode';

export class CullingManager {
    private sg: SpaceGraph;
    private frustum: THREE.Frustum;
    private projScreenMatrix: THREE.Matrix4;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
    }

    public update(): void {
        const camera = this.sg.renderer.camera;
        camera.updateMatrixWorld();
        this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

        for (const node of this.sg.graph.nodes.values()) {
            // Check bounding sphere (approximated based on position)
            // A more exact implementation would use the node's actual bounding box
            const inFrustum = this.frustum.containsPoint(node.position);

            if (node instanceof DOMNode) {
                node.setVisibility(inFrustum);
            } else {
                node.object.visible = inFrustum;
            }
        }
    }
}
