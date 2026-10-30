import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface TreeLayoutOptions extends LayoutOptions {
  levelHeight: number;
  nodeSpacing: number;
  orientation: string;
}

export class TreeLayout extends BaseLayout<TreeLayoutOptions> {
  readonly id = 'tree-layout';
  readonly name = 'Tree Layout';
  readonly version = '1.0.0';

  /** The tree owns every node: it places the pinned ones too. */
  protected override readonly ownsEveryNode = true;

  protected place(nodes: Node[], config: TreeLayoutOptions): void {
    const children = new Map<string, Node[]>();
    const inDegree = new Map<string, number>();
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      children.set(node.id, []);
    }
    for (const edge of this.graph.getEdges()) {
      inDegree.set(edge.target.id, (inDegree.get(edge.target.id) ?? 0) + 1);
      children.get(edge.source.id)?.push(edge.target);
    }

    const roots = nodes.filter((node) => inDegree.get(node.id) === 0);
    if (!roots.length) roots.push(nodes[0]);

    const positions = new Map<string, Vector3>();
    let cursor = 0;

    const assignPositions = (node: Node, depth: number): void => {
      const nodeChildren = children.get(node.id) ?? [];
      if (!nodeChildren.length) {
        positions.set(node.id, new Vector3(cursor, -depth * config.levelHeight, 0));
        cursor += config.nodeSpacing;
        return;
      }
      const childXs = nodeChildren.map((child) => {
        assignPositions(child, depth + 1);
        return positions.get(child.id)?.x ?? 0;
      });
      const minX = Math.min(...childXs);
      const maxX = Math.max(...childXs);
      positions.set(
        node.id,
        new Vector3((minX + maxX) / 2, -depth * config.levelHeight, 0)
      );
    };

    for (const root of roots) {
      assignPositions(root, 0);
      cursor += config.nodeSpacing * 2;
    }

    const centre = average(positions);
    const finalPos = new Vector3();
    for (const [id, position] of positions) {
      finalPos.set(position.x - centre.x, position.y - centre.y, 0);
      if (config.orientation === 'horizontal') finalPos.set(-finalPos.y, -finalPos.x, 0);
      this.applyPosition(this.graph.getNode(id) as Node, finalPos);
    }
  }

  protected defaultConfig(): TreeLayoutOptions {
    return {
      levelHeight: 150,
      nodeSpacing: 100,
      orientation: 'vertical',
      animate: true,
      duration: 1.0,
    };
  }
}

function average(positions: Map<string, Vector3>): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;
  for (const position of positions.values()) {
    sumX += position.x;
    sumY += position.y;
  }
  const count = positions.size || 1;
  return { x: sumX / count, y: sumY / count };
}
