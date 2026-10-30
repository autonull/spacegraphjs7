import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface CircularLayoutOptions extends LayoutOptions {
  radiusX: number;
  radiusY: number;
  startAngle: number;
  z: number;
}

export class CircularLayout extends BaseLayout<CircularLayoutOptions> {
  readonly id = 'circular-layout';
  readonly name = 'Circular Layout';
  readonly version = '1.0.0';

  protected place(nodes: Node[], config: CircularLayoutOptions): void {
    this.positionAll(nodes, (_node, index, total) => {
      const angle = config.startAngle + (index / total) * (2 * Math.PI);
      return new Vector3(
        config.radiusX * Math.cos(angle),
        config.radiusY * Math.sin(angle),
        config.z
      );
    });
  }

  protected defaultConfig(): CircularLayoutOptions {
    return { radiusX: 300, radiusY: 300, startAngle: 0, z: 0, animate: true, duration: 1.0 };
  }
}
