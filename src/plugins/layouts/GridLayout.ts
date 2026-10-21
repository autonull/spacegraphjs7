import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface GridLayoutOptions extends LayoutOptions {
  columns: number;
  spacingX: number;
  spacingY: number;
  offsetX: number;
  offsetY: number;
}

export class GridLayout extends BaseLayout<GridLayoutOptions> {
  readonly id = 'grid-layout';
  readonly name = 'Grid Layout';
  readonly version = '1.0.0';

  protected place(nodes: Node[], config: GridLayoutOptions): void {
    const cols = config.columns > 0 ? config.columns : Math.ceil(Math.sqrt(nodes.length));

    this.positionAll(
      nodes,
      (node, index) =>
        new THREE.Vector3(
          config.offsetX + (index % cols) * config.spacingX,
          config.offsetY - Math.floor(index / cols) * config.spacingY,
          node.position.z
        )
    );
  }

  protected defaultConfig(): GridLayoutOptions {
    return {
      columns: 0,
      spacingX: 200,
      spacingY: 200,
      offsetX: 0,
      offsetY: 0,
      animate: true,
      duration: 1.0,
    };
  }
}
