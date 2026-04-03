import * as THREE from 'three';
import type { Node } from '../../graph/Node';

interface SpatialCell {
    nodes: Set<NodeLike>;
}

interface NodeLike {
    id: string;
    position: THREE.Vector3;
    object?: THREE.Object3D;
}

export class SpatialIndex {
    private readonly cellSize: number;
    private readonly cells = new Map<string, SpatialCell>();
    private readonly nodeBounds = new Map<NodeLike, THREE.Box3>();

    constructor(cellSize = 100) {
        this.cellSize = cellSize;
    }

    private getGridCoords(position: THREE.Vector3): { x: number; y: number } {
        return {
            x: Math.floor(position.x / this.cellSize),
            y: Math.floor(position.y / this.cellSize),
        };
    }

    private getCellKey(x: number, y: number): string {
        return `${x},${y}`;
    }

    private getOrCreateCell(x: number, y: number): SpatialCell {
        const key = this.getCellKey(x, y);
        let cell = this.cells.get(key);
        if (!cell) {
            cell = { nodes: new Set() };
            this.cells.set(key, cell);
        }
        return cell;
    }

    build(nodes: NodeLike[]): void {
        this.clear();
        const box = new THREE.Box3();

        for (const node of nodes) {
            if (node.object) {
                box.setFromObject(node.object);
                this.nodeBounds.set(node, box.clone());
                const minX = Math.floor(box.min.x / this.cellSize);
                const maxX = Math.floor(box.max.x / this.cellSize);
                const minY = Math.floor(box.min.y / this.cellSize);
                const maxY = Math.floor(box.max.y / this.cellSize);
                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        this.getOrCreateCell(x, y).nodes.add(node);
                    }
                }
            } else {
                const { x, y } = this.getGridCoords(node.position);
                this.getOrCreateCell(x, y).nodes.add(node);
            }
        }
    }

    updateNode(node: NodeLike): void {
        this.removeNode(node);
        const box = node.object
            ? new THREE.Box3().setFromObject(node.object)
            : new THREE.Box3().makeEmpty().expandByPoint(node.position);

        const minX = Math.floor(box.min.x / this.cellSize);
        const maxX = Math.floor(box.max.x / this.cellSize);
        const minY = Math.floor(box.min.y / this.cellSize);
        const maxY = Math.floor(box.max.y / this.cellSize);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                this.getOrCreateCell(x, y).nodes.add(node);
            }
        }
    }

    removeNode(node: NodeLike): void {
        for (const cell of this.cells.values()) cell.nodes.delete(node);
        this.nodeBounds.delete(node);
    }

    queryBox(box: THREE.Box3): NodeLike[] {
        const result = new Set<NodeLike>();
        const minX = Math.floor(box.min.x / this.cellSize);
        const maxX = Math.floor(box.max.x / this.cellSize);
        const minY = Math.floor(box.min.y / this.cellSize);
        const maxY = Math.floor(box.max.y / this.cellSize);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                this.cells.get(this.getCellKey(x, y))?.nodes.forEach((n) => result.add(n));
            }
        }
        return Array.from(result);
    }

    queryRadius(position: THREE.Vector3, radius: number): NodeLike[] {
        const box = new THREE.Box3(
            position.clone().addScalar(-radius),
            position.clone().addScalar(radius),
        );
        const candidates = this.queryBox(box);
        const radiusSquared = radius * radius;
        return candidates.filter((n) => {
            const dx = n.position.x - position.x;
            const dy = n.position.y - position.y;
            return dx * dx + dy * dy <= radiusSquared;
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
        this.cellSize = cellSize;
    }
}

interface BVHNode {
    bounds: THREE.Box3;
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
        const node: BVHNode = { bounds: bounds.clone(), nodes: [], left: null, right: null };
        if (nodes.length <= 4 || depth > 10) {
            node.nodes = nodes;
            return node;
        }
        const extent = new THREE.Vector3().subVectors(bounds.max, bounds.min);
        const axis = extent.x > extent.y ? 'x' : 'y';
        const sorted = [...nodes].sort((a, b) => a.position[axis] - b.position[axis]);
        const mid = Math.floor(sorted.length / 2);
        const leftNodes = sorted.slice(0, mid);
        const rightNodes = sorted.slice(mid);
        const leftBounds = new THREE.Box3();
        for (const n of leftNodes) {
            if (n.object) {
                leftBounds.expandByObject(n.object);
            } else {
                leftBounds.expandByPoint(n.position);
            }
        }
        const rightBounds = new THREE.Box3();
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

    query(box: THREE.Box3): Node[] {
        const result: Node[] = [];
        if (!this.root) return result;
        this.queryRecursive(this.root, box, result);
        return result;
    }

    private queryRecursive(node: BVHNode, box: THREE.Box3, result: Node[]): void {
        if (!node.bounds.intersectsBox(box)) return;
        for (const n of node.nodes) {
            if (
                n.object
                    ? new THREE.Box3().setFromObject(n.object).intersectsBox(box)
                    : box.containsPoint(n.position)
            ) {
                result.push(n);
            }
        }
        if (node.left) this.queryRecursive(node.left, box, result);
        if (node.right) this.queryRecursive(node.right, box, result);
    }
}
