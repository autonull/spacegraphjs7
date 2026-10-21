import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface HierarchicalLayoutOptions extends LayoutOptions {
  rootId: string;
  levelHeight: number;
  nodeSpacing: number;
  z: number;
  direction: string;
}

export class HierarchicalLayout extends BaseLayout<HierarchicalLayoutOptions> {
  readonly id = 'hierarchical-layout';
  readonly name = 'Hierarchical Layout';
  readonly version = '1.0.0';

  /** The hierarchy reads the whole graph; it leaves the pinned nodes where they are. */
  protected override ownedNodes(): Node[] {
    return Array.from(this.graph.getNodes());
  }

  protected place(nodes: Node[], config: HierarchicalLayoutOptions): void {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const { children, rootId: resolvedRootId } = this.buildTree(config.rootId);

    const level = new Map<string, number>();
    const queue: string[] = [resolvedRootId];
    level.set(resolvedRootId, 0);
    const visited = new Set<string>([resolvedRootId]);

    for (let head = 0; head < queue.length; head++) {
      const cur = queue[head]!;
      for (const child of children.get(cur) ?? []) {
        if (visited.has(child)) continue;
        visited.add(child);
        level.set(child, (level.get(cur) ?? 0) + 1);
        queue.push(child);
      }
    }

    const byLevel = new Map<number, string[]>();
    for (const [id, lv] of level) {
      const bucket = byLevel.get(lv);
      if (bucket) bucket.push(id);
      else byLevel.set(lv, [id]);
    }

    for (const [lv, ids] of byLevel) {
      const placed = ids.filter((id) => !this.isPinned(byId.get(id)!));
      const totalWidth = (placed.length - 1) * config.nodeSpacing;
      for (const [i, id] of placed.entries()) {
        const primary = lv * config.levelHeight;
        const secondary = -totalWidth / 2 + i * config.nodeSpacing;
        const [x, y] = orient(primary, secondary, config.direction);
        this.applyPosition(byId.get(id)!, new THREE.Vector3(x, y, config.z));
      }
    }

    let orphanX = 0;
    const maxLevel = Math.max(...level.values(), 0);
    for (const node of nodes) {
      if (visited.has(node.id) || this.isPinned(node)) continue;
      this.applyPosition(
        node,
        new THREE.Vector3(orphanX, -(maxLevel + 1) * config.levelHeight, config.z)
      );
      orphanX += config.nodeSpacing;
    }
  }

  protected defaultConfig(): HierarchicalLayoutOptions {
    return {
      rootId: '',
      levelHeight: 200,
      nodeSpacing: 150,
      z: 0,
      direction: 'top-down',
      animate: true,
      duration: 1.0,
    };
  }
}

/** The primary axis runs along the levels, the secondary across them; the direction picks the axes. */
function orient(primary: number, secondary: number, direction: string): [number, number] {
  switch (direction) {
    case 'bottom-up':
      return [secondary, primary];
    case 'left-right':
      return [primary, secondary];
    case 'right-left':
      return [-primary, secondary];
    default:
      return [secondary, -primary];
  }
}
