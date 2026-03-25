import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';

/**
 * Raycasting helper for InteractionPlugin
 * Consolidates all raycasting logic into a single reusable class
 */
export class InteractionRaycaster {
    private readonly raycaster = new THREE.Raycaster();
    private readonly mouse = new THREE.Vector2();
    private readonly sg: SpaceGraph;

    private static NODE_THRESHOLD = 5;
    private static LINE_THRESHOLD = 5;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    updateMousePosition(x: number, y: number): void {
        const canvas = this.sg.renderer.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        this.mouse.copy(
            new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1),
        );
    }

    getMouseNDC(): THREE.Vector2 {
        return this.mouse.clone();
    }

    raycastNode(): { node: Node; point: THREE.Vector3 } | null {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        this.raycaster.params.Line = { threshold: InteractionRaycaster.NODE_THRESHOLD };

        const meshes = this.getAllNodeMeshes();
        const intersects = this.raycaster.intersectObjects(meshes, false);

        if (intersects.length === 0) return null;

        const node = this.getNodeFromMesh(intersects[0].object);
        return node ? { node, point: intersects[0].point } : null;
    }

    raycastEdge(): { edge: Edge; point: THREE.Vector3 } | null {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        this.raycaster.params.Line = { threshold: InteractionRaycaster.LINE_THRESHOLD };

        const lineObjects = this.getEdgeObjects();
        const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

        if (edgeIntersects.length === 0) return null;

        const edge = this.sg.graph.edges.find((e) => e.object === edgeIntersects[0].object);
        return edge ? { edge, point: edgeIntersects[0].point } : null;
    }

    raycastPlane(plane: THREE.Plane): THREE.Vector3 | null {
        const intersection = new THREE.Vector3();
        return this.raycaster.ray.intersectPlane(plane, intersection) ? intersection : null;
    }

    private getAllNodeMeshes(): THREE.Object3D[] {
        const meshes: THREE.Object3D[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if (node.object) {
                node.object.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) meshes.push(child);
                });
            }
        }
        return meshes;
    }

    private getEdgeObjects(): THREE.Object3D[] {
        const lineObjects: THREE.Object3D[] = [];
        for (const edge of this.sg.graph.edges) {
            if (edge.object) lineObjects.push(edge.object);
        }
        return lineObjects;
    }

    private getNodeFromMesh(mesh: THREE.Object3D): Node | null {
        let current: THREE.Object3D | null = mesh;
        while (current) {
            const node = (current as any).userData?.node;
            if (node) return node;
            current = current.parent;
        }
        return null;
    }

    getRaycaster(): THREE.Raycaster {
        return this.raycaster;
    }
}
