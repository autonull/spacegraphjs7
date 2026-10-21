import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface RadialLayoutOptions extends LayoutOptions {
  rootId: string;
  baseRadius: number;
  radiusStep: number;
  z: number;
  startAngle: number;
}

export class RadialLayout extends BaseLayout<RadialLayoutOptions> {
  readonly id = 'radial-layout';
  readonly name = 'Radial Layout';
  readonly version = '1.0.0';

  /** The radial tree owns every node: it places the pinned ones too. */
  protected override ownedNodes(): Node[] {
    return Array.from(this.graph.getNodes());
  }

  protected place(_nodes: Node[], config: RadialLayoutOptions): void {
    const { nodes } = this.graph;
    if (!nodes.size) return;

    const { children, rootId: resolvedRootId } = this.buildTree(config.rootId);
    const root = nodes.get(resolvedRootId) as Node;
    this.applyPosition(root, new THREE.Vector3(0, 0, config.z));

    const queue: Array<{ id: string; depth: number; minAngle: number; maxAngle: number }> = [
      {
        id: resolvedRootId,
        depth: 0,
        minAngle: config.startAngle,
        maxAngle: config.startAngle + 2 * Math.PI,
      },
    ];
    const visited = new Set<string>([resolvedRootId]);

    while (queue.length) {
      const { id, depth, minAngle, maxAngle } = queue.shift()!;
      const nodeChildren = (children.get(id) ?? []).filter((child) => !visited.has(child));
      if (!nodeChildren.length) continue;

      const angleStep = (maxAngle - minAngle) / nodeChildren.length;
      const radius = config.baseRadius + depth * config.radiusStep;

      for (const [i, childId] of nodeChildren.entries()) {
        visited.add(childId);
        const angle = minAngle + (i + 0.5) * angleStep;
        const node = nodes.get(childId);
        if (node) {
          this.applyPosition(
            node,
            new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, config.z)
          );
        }
        queue.push({
          id: childId,
          depth: depth + 1,
          minAngle: minAngle + i * angleStep,
          maxAngle: minAngle + (i + 1) * angleStep,
        });
      }
    }

    const orphans = [...nodes.keys()].filter((id) => !visited.has(id));
    if (orphans.length) {
      const outerRadius = config.baseRadius + nodes.size * config.radiusStep;
      for (const [i, id] of orphans.entries()) {
        const angle = ((2 * Math.PI) / orphans.length) * i;
        this.applyPosition(
          nodes.get(id) as Node,
          new THREE.Vector3(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, config.z)
        );
      }
    }
  }

  protected defaultConfig(): RadialLayoutOptions {
    return {
      rootId: '',
      baseRadius: 200,
      radiusStep: 180,
      z: 0,
      startAngle: 0,
      animate: true,
      duration: 1.0,
    };
  }
}
