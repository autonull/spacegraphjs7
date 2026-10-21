import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeData, EdgeSpec } from '../types';
import { Edge, withEdgeData } from './Edge';

/**
 * FlowEdge — A dashed line whose dashes march along the edge.
 *
 * The base Edge already builds a dashed material, so this is a preset over it: the flow only
 * animates the dash offset.
 *
 * data options:
 *   flowSpeed : number  the dash offset travelled per frame (default 2)
 *   dashSize  : number  world-space dash length (default 5)
 *   gapSize   : number  world-space gap length (default 5)
 *   color     : hex color (default 0x00ff00)
 *   opacity   : number  line opacity (default 1)
 */
export class FlowEdge extends Edge {
  static readonly typeName: string = 'FlowEdge';
  private dashOffset = 0;
  private flowSpeed = 1.0;
  private isFlowing = true;
  private baseSpeed = 1.0;

  constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
    const data = spec.data as EdgeData & { flowSpeed?: number; lineWidth?: number };
    const opacity = (data?.opacity as number | undefined) ?? 1.0;

    super(
      sg,
      withEdgeData(spec, {
        dashed: true,
        dashSize: 5,
        gapSize: 5,
        color: 0x00ff00,
        thickness: data?.lineWidth ?? 2,
        opacity,
      }),
      source,
      target
    );

    this.baseSpeed = data?.flowSpeed ?? 2.0;
    this.flowSpeed = this.baseSpeed;
  }

  updateSpec(updates: Partial<EdgeSpec>): this {
    super.updateSpec(updates);

    const flowSpeed = updates.data?.flowSpeed as number | undefined;
    if (flowSpeed !== undefined) {
      this.baseSpeed = flowSpeed;
      if (this.isFlowing) this.flowSpeed = this.baseSpeed;
    }

    if (updates.data?.dashSize !== undefined || updates.data?.gapSize !== undefined) {
      this.dashOffset = 0;
    }

    return this;
  }

  startDataFlow(rate = 1): void {
    this.isFlowing = true;
    this.flowSpeed = this.baseSpeed * rate;
  }

  stopDataFlow(): void {
    this.isFlowing = false;
    this.flowSpeed = 0;
  }

  update() {
    super.update();

    if (!this.isFlowing) return;

    this.dashOffset -= this.flowSpeed;
    this.object.computeLineDistances();

    const distances = this.geometry.attributes.lineDistance;
    if (distances) {
      for (let i = 0; i < distances.count; i++) {
        distances.setX(i, distances.getX(i) + this.dashOffset);
      }
      distances.needsUpdate = true;
    }
  }
}
