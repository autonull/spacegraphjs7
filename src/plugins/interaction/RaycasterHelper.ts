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

  /**
   * The node under the pointer. Every surface answers a ray with its own `hitTest`, so the pick
   * follows the node's own shape instead of a second, looser rule kept beside it.
   */
  raycastNode(): { node: Node; point: Vector3 } | null {
    this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);

    let closest: { node: Node; point: Vector3; distance: number } | null = null;

    for (const node of this.sg.graph.nodes.values()) {
      const hit = node.hitTest(this.raycaster);
      if (!hit) continue;
      if (closest && hit.distance >= closest.distance) continue;
      closest = { node, point: hit.point, distance: hit.distance };
    }

    return closest ? { node: closest.node, point: closest.point } : null;
  }

  /** The edge under the pointer, by the same rule the nodes answer with. */
  raycastEdge(): { edge: Edge; point: Vector3 } | null {
    this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);

    let closest: { edge: Edge; point: Vector3; distance: number } | null = null;

    for (const edge of this.sg.graph.edges.values()) {
      const hit = edge.hitTest(this.raycaster);
      if (!hit) continue;
      if (closest && hit.distance >= closest.distance) continue;
      closest = { edge, point: hit.point, distance: hit.distance };
    }

    return closest ? { edge: closest.edge, point: closest.point } : null;
  }

  raycastPlane(plane: Plane): Vector3 | null {
    const intersection = new Vector3();
    return this.raycaster.ray.intersectPlane(plane, intersection) ? intersection : null;
  }

  getRaycaster(): Raycaster {
    return this.raycaster;
  }
}
