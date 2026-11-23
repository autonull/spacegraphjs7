import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import type { SpaceGraph } from '../../SpaceGraph';
import { clientToNdc } from '../../utils/projection';

/**
 * Raycasting helper for InteractionPlugin
 * Consolidates all raycasting logic into a single reusable class
 */
export class InteractionRaycaster {
    readonly raycaster = new Raycaster();
    readonly mouse = new Vector2();
    readonly sg: SpaceGraph;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    /**
     * Point the ray at a client position. The ray follows the pointer, so a drag that asks where the
     * pointer is gets the pointer's own ray and not the one left over from the last pick.
     */
    updateMousePosition(x: number, y: number): void {
        const canvas = this.sg.renderer.renderer.domElement;
        const ndc = clientToNdc(x, y, canvas.getBoundingClientRect());
        this.mouse.set(ndc.x, ndc.y);
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
    }

    getMouseNDC(): Vector2 {
        return this.mouse.clone();
    }

    /** The closest surface that answers the ray, using each surface's own hit rule. */
    private closestHit<T>(
        surfaces: Iterable<T>,
        hitTest: (surface: T) => { point: Vector3; distance: number } | null,
    ): { surface: T; point: Vector3 } | null {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        let closest: { surface: T; point: Vector3; distance: number } | null = null;
        for (const surface of surfaces) {
            const hit = hitTest(surface);
            if (!hit || (closest && hit.distance >= closest.distance)) continue;
            closest = { surface, point: hit.point, distance: hit.distance };
        }
        return closest && { surface: closest.surface, point: closest.point };
    }

    /** The node under the pointer. */
    raycastNode(): { node: Node; point: Vector3 } | null {
        const hit = this.closestHit(this.sg.graph.nodes.values(), (node) =>
            node.hitTest(this.raycaster),
        );
        return hit && { node: hit.surface, point: hit.point };
    }

    /** The edge under the pointer, by the same rule the nodes answer with. */
    raycastEdge(): { edge: Edge; point: Vector3 } | null {
        const hit = this.closestHit(this.sg.graph.edges.values(), (edge) =>
            edge.hitTest(this.raycaster),
        );
        return hit && { edge: hit.surface, point: hit.point };
    }

    raycastPlane(plane: Plane): Vector3 | null {
        const intersection = new Vector3();
        return this.raycaster.ray.intersectPlane(plane, intersection) ? intersection : null;
    }

    getRaycaster(): Raycaster {
        return this.raycaster;
    }
}
