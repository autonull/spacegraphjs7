import { Box3, Object3D, Vector3 } from 'three';
import type { Node } from '../../nodes/Node';

interface SpatialCell {
  nodes: Set<NodeLike>;
}

interface NodeLike {
  id: string;
  position: Vector3;
  object?: Object3D;
}

export class SpatialIndex {
  private cellSize: number;
  readonly cells = new Map<string, SpatialCell>();
  readonly nodeBounds = new Map<NodeLike, Box3>();
  readonly nodeCells = new Map<NodeLike, Set<string>>();

  constructor(cellSize = 100) {
    if (cellSize <= 0) throw new Error('cellSize must be positive');
    this.cellSize = cellSize;
  }

  build(nodes: NodeLike[]): void {
    this.clear();
    const box = new Box3();
    for (const node of nodes) {
      this.insertNode(node, box);
    }
  }

  updateNode(node: NodeLike): void {
    this.removeNode(node);
    const box = new Box3();
    this.insertNode(node, box);
  }

  removeNode(node: NodeLike): void {
    const cells = this.nodeCells.get(node);
    if (cells) {
      for (const key of cells) {
        this.cells.get(key)?.nodes.delete(node);
      }
      this.nodeCells.delete(node);
    }
    this.nodeBounds.delete(node);
  }

  queryBox(box: Box3): NodeLike[] {
    const result = new Set<NodeLike>();
    this.forEachCellInBox(box, (x, y, z) => {
      for (const n of this.cells.get(this.getCellKey(x, y, z))?.nodes ?? []) result.add(n);
    });
    return Array.from(result);
  }

  queryRadius(position: Vector3, radius: number): NodeLike[] {
    const box = new Box3(
      position.clone().addScalar(-radius),
      position.clone().addScalar(radius)
    );
    const candidates = this.queryBox(box);
    const radiusSquared = radius * radius;
    return candidates.filter((n) => {
      const dx = n.position.x - position.x;
      const dy = n.position.y - position.y;
      const dz = n.position.z - position.z;
      return dx * dx + dy * dy + dz * dz <= radiusSquared;
    });
  }

  findCollisions(node: NodeLike): NodeLike[] {
    const bounds = this.nodeBounds.get(node);
    if (!bounds) return [];
    const candidates = this.queryBox(bounds);
    return candidates.filter((other) => {
      if (other === node) return false;
      const otherBounds = this.nodeBounds.get(other);
      return otherBounds
        ? bounds.intersectsBox(otherBounds)
        : node.position.distanceTo(other.position) < this.cellSize;
    });
  }

  findAllOverlaps(): Array<[NodeLike, NodeLike]> {
    const overlaps: Array<[NodeLike, NodeLike]> = [];
    const checked = new Set<string>();

    for (const cell of this.cells.values()) {
      const nodes = Array.from(cell.nodes);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i],
            b = nodes[j];
          if (a.id === b.id) continue;
          const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
          if (checked.has(key)) continue;
          checked.add(key);
          const boundsA = this.nodeBounds.get(a);
          const boundsB = this.nodeBounds.get(b);
          if (boundsA && boundsB && boundsA.intersectsBox(boundsB)) {
            overlaps.push([a, b]);
          }
        }
      }
    }
    return overlaps;
  }

  clear(): void {
    this.cells.clear();
    this.nodeBounds.clear();
    this.nodeCells.clear();
  }

  getStats(): { cellCount: number; nodeCount: number; avgNodesPerCell: number } {
    let totalNodes = 0;
    for (const cell of this.cells.values()) totalNodes += cell.nodes.size;
    return {
      cellCount: this.cells.size,
      nodeCount: this.nodeBounds.size,
      avgNodesPerCell: this.cells.size > 0 ? totalNodes / this.cells.size : 0,
    };
  }

  setCellSize(cellSize: number): void {
    if (cellSize <= 0) throw new Error('cellSize must be positive');
    if (cellSize === this.cellSize) return;
    this.cellSize = cellSize;
    const allNodes = Array.from(this.nodeBounds.keys());
    if (allNodes.length > 0) {
      this.build(allNodes);
    }
  }

  private getGridCoords(position: Vector3): { x: number; y: number; z: number } {
    return {
      x: this.cellIndex(position.x),
      y: this.cellIndex(position.y),
      z: this.cellIndex(position.z),
    };
  }

  /** The cell a coordinate falls into. */
  private cellIndex(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  /** Every cell a box covers, in the same order the range is walked. */
  private forEachCellInBox(
    box: Box3,
    visit: (x: number, y: number, z: number) => void
  ): void {
    const minX = this.cellIndex(box.min.x);
    const maxX = this.cellIndex(box.max.x);
    const minY = this.cellIndex(box.min.y);
    const maxY = this.cellIndex(box.max.y);
    const minZ = this.cellIndex(box.min.z);
    const maxZ = this.cellIndex(box.max.z);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          visit(x, y, z);
        }
      }
    }
  }

  private getCellKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private getOrCreateCell(x: number, y: number, z: number): SpatialCell {
    const key = this.getCellKey(x, y, z);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = { nodes: new Set() };
      this.cells.set(key, cell);
    }
    return cell;
  }

  private insertNode(node: NodeLike, box: Box3): void {
    if (node.object) {
      node.object.updateMatrixWorld(true);
      const wasVisible = node.object.visible;
      node.object.visible = true;
      box.setFromObject(node.object);
      node.object.visible = wasVisible;
      this.nodeBounds.set(node, box.clone());
      const cells = new Set<string>();
      this.forEachCellInBox(box, (x, y, z) => {
        cells.add(this.getCellKey(x, y, z));
        this.getOrCreateCell(x, y, z).nodes.add(node);
      });
      this.nodeCells.set(node, cells);
    } else {
      const { x, y, z } = this.getGridCoords(node.position);
      const key = this.getCellKey(x, y, z);

      // For nodes without objects, create a small representative box
      const pointBox = new Box3().setFromCenterAndSize(
        node.position,
        new Vector3(1, 1, 1)
      );
      this.nodeBounds.set(node, pointBox);

      this.nodeCells.set(node, new Set([key]));
      this.getOrCreateCell(x, y, z).nodes.add(node);
    }
  }
}

interface BVHNode {
  bounds: Box3;
  nodes: Node[];
  left: BVHNode | null;
  right: BVHNode | null;
}

export class BVH {
  private root: BVHNode | null = null;

  build(nodes: Node[]): void {
    if (nodes.length === 0) {
      this.root = null;
      return;
    }
    const bounds = new Box3();
    for (const node of nodes) {
      if (node.object) {
        bounds.expandByObject(node.object);
      } else {
        bounds.expandByPoint(node.position);
      }
    }
    this.root = this.buildTree(nodes, bounds, 0);
  }

  query(box: Box3): Node[] {
    const result: Node[] = [];
    if (!this.root) return result;
    this.queryRecursive(this.root, box, result);
    return result;
  }

  private buildTree(nodes: Node[], bounds: Box3, depth: number): BVHNode {
    const node: BVHNode = { bounds: bounds.clone(), nodes: [], left: null, right: null };
    if (nodes.length <= 4 || depth > 10) {
      node.nodes = nodes;
      return node;
    }
    const extent = new Vector3().subVectors(bounds.max, bounds.min);
    const axis = extent.x > extent.y ? 'x' : 'y';
    const sorted = [...nodes].sort((a, b) => a.position[axis] - b.position[axis]);
    const mid = Math.floor(sorted.length / 2);
    const leftNodes = sorted.slice(0, mid);
    const rightNodes = sorted.slice(mid);
    const leftBounds = new Box3();
    for (const n of leftNodes) {
      if (n.object) {
        leftBounds.expandByObject(n.object);
      } else {
        leftBounds.expandByPoint(n.position);
      }
    }
    const rightBounds = new Box3();
    for (const n of rightNodes) {
      if (n.object) {
        rightBounds.expandByObject(n.object);
      } else {
        rightBounds.expandByPoint(n.position);
      }
    }
    node.left = this.buildTree(leftNodes, leftBounds, depth + 1);
    node.right = this.buildTree(rightNodes, rightBounds, depth + 1);
    return node;
  }

  private queryRecursive(node: BVHNode, box: Box3, result: Node[]): void {
    if (!node.bounds.intersectsBox(box)) return;
    for (const n of node.nodes) {
      if (
        n.object
          ? new Box3().setFromObject(n.object).intersectsBox(box)
          : box.containsPoint(n.position)
      ) {
        result.push(n);
      }
    }
    if (node.left) this.queryRecursive(node.left, box, result);
    if (node.right) this.queryRecursive(node.right, box, result);
  }
}
