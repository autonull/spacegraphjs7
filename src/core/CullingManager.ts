import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import { HtmlNode } from '../nodes/HtmlNode';

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

        const nodes = Array.from(this.sg.graph.nodes.values());
        for (const node of nodes) {
            // Check bounding sphere (approximated based on position)
            // A more exact implementation would use the node's actual bounding box
            const inFrustum = this.frustum.containsPoint(node.position);

            if (node instanceof HtmlNode) {
                if (inFrustum) {
                    node.cssObject.visible = true;
                    // Don't override LOD plugin if it explicitly hides it, but for simple culling we turn it on
                    if (node.domElement.style.display === 'none') {
                        node.domElement.style.display = 'flex';
                    }
                } else {
                    node.cssObject.visible = false;
                    node.domElement.style.display = 'none';
                }
            } else {
                node.object.visible = inFrustum;
            }
        }
    }
}
