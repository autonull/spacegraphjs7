// SpaceGraphJS v7.0 - Spatial Index
// Grid-based spatial hashing for efficient collision detection

import * as THREE from 'three';
import type { Node } from '../../graph/Node';

/**
 * Grid cell containing nodes
 */
interface SpatialCell {
  nodes: Set<NodeLike>;
}

/**
 * Node-like interface for spatial indexing
 * Works with both Node class and plain objects with required properties
 */
interface NodeLike {
  id: string;
  position: THREE.Vector3;
  object?: THREE.Object3D;
}

/**
 * Spatial index using grid-based hashing
 * Provides O(n·k) collision detection instead of O(n²)
 */
export class SpatialIndex {
  private cellSize: number;
  private cells: Map<string, SpatialCell> = new Map();
  private nodeBounds: Map<NodeLike, THREE.Box3> = new Map();

  /**
   * Create a spatial index
   * @param cellSize - Size of each grid cell (default: 100 units)
   */
  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  /**
   * Get grid coordinates for a position
   */
  private getGridCoords(position: THREE.Vector3): { x: number; y: number } {
    return {
      x: Math.floor(position.x / this.cellSize),
      y: Math.floor(position.y / this.cellSize)
    };
  }

  /**
   * Get grid key for a cell
   */
  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Get or create a cell at grid coordinates
   */
  private getOrCreateCell(x: number, y: number): SpatialCell {
    const key = this.getCellKey(x, y);
    let cell = this.cells.get(key);
    
    if (!cell) {
      cell = { nodes: new Set() };
      this.cells.set(key, cell);
    }

    return cell;
  }

  /**
   * Build the spatial index from nodes
   * @param nodes - Array of nodes to index
   */
  build(nodes: NodeLike[]): void {
    this.clear();

    const box = new THREE.Box3();
    const tempVector = new THREE.Vector3();

    for (const node of nodes) {
      // Get node bounds
      if (node.object) {
        box.setFromObject(node.object);
        this.nodeBounds.set(node, box.clone());

        // Add to all overlapping cells
        const minX = Math.floor(box.min.x / this.cellSize);
        const maxX = Math.floor(box.max.x / this.cellSize);
        const minY = Math.floor(box.min.y / this.cellSize);
        const maxY = Math.floor(box.max.y / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            const cell = this.getOrCreateCell(x, y);
            cell.nodes.add(node);
          }
        }
      } else {
        // Fallback: use position only
        tempVector.copy(node.position);
        const { x, y } = this.getGridCoords(tempVector);
        const cell = this.getOrCreateCell(x, y);
        cell.nodes.add(node);
      }
    }
  }

  /**
   * Update the index for a single node
   * More efficient than rebuilding the entire index
   */
  updateNode(node: Node): void {
    // Remove from old cells
    this.removeNode(node);

    // Add to new cells
    const box = new THREE.Box3();
    if (node.object) {
      box.setFromObject(node.object);
      this.nodeBounds.set(node, box.clone());
    }

    const minX = Math.floor(box.min.x / this.cellSize);
    const maxX = Math.floor(box.max.x / this.cellSize);
    const minY = Math.floor(box.min.y / this.cellSize);
    const maxY = Math.floor(box.max.y / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const cell = this.getOrCreateCell(x, y);
        cell.nodes.add(node);
      }
    }
  }

  /**
   * Remove a node from the index
   */
  removeNode(node: Node): void {
    for (const cell of this.cells.values()) {
      cell.nodes.delete(node);
    }
    this.nodeBounds.delete(node);
  }

  /**
   * Query for nodes in a box region
   * @param box - The query box
   * @returns Array of nodes in or intersecting the box
   */
  queryBox(box: THREE.Box3): Node[] {
    const result: Set<Node> = new Set();

    const minX = Math.floor(box.min.x / this.cellSize);
    const maxX = Math.floor(box.max.x / this.cellSize);
    const minY = Math.floor(box.min.y / this.cellSize);
    const maxY = Math.floor(box.max.y / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const cell = this.cells.get(this.getCellKey(x, y));
        if (cell) {
          for (const node of cell.nodes) {
            result.add(node);
          }
        }
      }
    }

    return Array.from(result);
  }

  /**
   * Query for nodes near a position
   * @param position - Query position
   * @param radius - Query radius
   * @returns Array of nodes within radius
   */
  queryRadius(position: THREE.Vector3, radius: number): Node[] {
    const box = new THREE.Box3();
    box.min.copy(position).addScalar(-radius);
    box.max.copy(position).addScalar(radius);

    const candidates = this.queryBox(box);
    const radiusSquared = radius * radius;

    return candidates.filter(node => {
      const nodePos = node.position;
      const dx = nodePos.x - position.x;
      const dy = nodePos.y - position.y;
      const distSquared = dx * dx + dy * dy;
      return distSquared <= radiusSquared;
    });
  }

  /**
   * Find potential collisions for a node
   * @param node - The node to check
   * @returns Array of potentially colliding nodes
   */
  findCollisions(node: Node): Node[] {
    const bounds = this.nodeBounds.get(node);
    if (!bounds) return [];

    const candidates = this.queryBox(bounds);
    const tempBox = new THREE.Box3();

    return candidates.filter(other => {
      if (other === node) return false;

      const otherBounds = this.nodeBounds.get(other);
      if (otherBounds) {
        return bounds.intersectsBox(otherBounds);
      }

      // Fallback: simple distance check
      const dist = node.position.distanceTo(other.position);
      return dist < this.cellSize;
    });
  }

  /**
   * Find all overlapping node pairs
   * @returns Array of overlapping node pairs
   */
  findAllOverlaps(): Array<[NodeLike, NodeLike]> {
    const overlaps: Array<[NodeLike, NodeLike]> = [];
    const checked = new Set<string>();

    for (const cell of this.cells.values()) {
      const nodes = Array.from(cell.nodes);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];

          // Avoid duplicates
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

  /**
   * Clear the spatial index
   */
  clear(): void {
    this.cells.clear();
    this.nodeBounds.clear();
  }

  /**
   * Get statistics about the index
   */
  getStats(): {
    cellCount: number;
    nodeCount: number;
    avgNodesPerCell: number;
  } {
    let totalNodes = 0;
    for (const cell of this.cells.values()) {
      totalNodes += cell.nodes.size;
    }

    return {
      cellCount: this.cells.size,
      nodeCount: this.nodeBounds.size,
      avgNodesPerCell: this.cells.size > 0 ? totalNodes / this.cells.size : 0
    };
  }

  /**
   * Update cell size
   * Note: This requires rebuilding the index
   */
  setCellSize(cellSize: number): void {
    this.cellSize = cellSize;
  }
}

/**
 * BVH (Bounding Volume Hierarchy) for more complex queries
 * Simpler alternative to grid-based indexing for hierarchical data
 */
export class BVH {
  private root: BVHNode | null = null;

  build(nodes: Node[]): void {
    if (nodes.length === 0) {
      this.root = null;
      return;
    }

    const bounds = new THREE.Box3();
    for (const node of nodes) {
      if (node.object) {
        bounds.expandByObject(node.object);
      } else {
        bounds.expandByPoint(node.position);
      }
    }

    this.root = this.buildTree(nodes, bounds, 0);
  }

  private buildTree(nodes: Node[], bounds: THREE.Box3, depth: number): BVHNode {
    const node: BVHNode = {
      bounds: bounds.clone(),
      nodes: [],
      left: null,
      right: null
    };

    // Leaf node
    if (nodes.length <= 4 || depth > 10) {
      node.nodes = nodes;
      return node;
    }

    // Split along longest axis
    const extent = new THREE.Vector3()
      .subVectors(bounds.max, bounds.min);
    const axis = extent.x > extent.y ? 'x' : 'y';

    // Sort by axis
    const sorted = [...nodes].sort((a, b) => {
      const posA = a.position[axis];
      const posB = b.position[axis];
      return posA - posB;
    });

    // Split in half
    const mid = Math.floor(sorted.length / 2);
    const leftNodes = sorted.slice(0, mid);
    const rightNodes = sorted.slice(mid);

    // Create child bounds
    const leftBounds = new THREE.Box3();
    for (const n of leftNodes) {
      if (n.object) leftBounds.expandByObject(n.object);
      else leftBounds.expandByPoint(n.position);
    }

    const rightBounds = new THREE.Box3();
    for (const n of rightNodes) {
      if (n.object) rightBounds.expandByObject(n.object);
      else rightBounds.expandByPoint(n.position);
    }

    node.left = this.buildTree(leftNodes, leftBounds, depth + 1);
    node.right = this.buildTree(rightNodes, rightBounds, depth + 1);

    return node;
  }

  query(box: THREE.Box3): Node[] {
    const result: Node[] = [];
    if (!this.root) return result;

    this.queryRecursive(this.root, box, result);
    return result;
  }

  private queryRecursive(node: BVHNode, box: THREE.Box3, result: Node[]): void {
    if (!node.bounds.intersectsBox(box)) return;

    for (const n of node.nodes) {
      if (n.object) {
        const nodeBox = new THREE.Box3().setFromObject(n.object);
        if (nodeBox.intersectsBox(box)) {
          result.push(n);
        }
      } else if (box.containsPoint(n.position)) {
        result.push(n);
      }
    }

    if (node.left) this.queryRecursive(node.left, box, result);
    if (node.right) this.queryRecursive(node.right, box, result);
  }
}

interface BVHNode {
  bounds: THREE.Box3;
  nodes: Node[];
  left: BVHNode | null;
  right: BVHNode | null;
}
