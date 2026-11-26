import { Box3, Object3D, Vector3 } from 'three';

interface SpatialCell {
    nodes: Set<NodeLike>;
}

interface NodeLike {
    id: string;
    position: Vector3;
    object?: Object3D;
}

const UNIT = new Vector3(1, 1, 1);

export class SpatialIndex {
    private cellSize: number;
    private readonly scratchBox = new Box3();
    private readonly radiusBox = new Box3();
    private readonly querySet = new Set<NodeLike>();
    readonly cells = new Map<string, SpatialCell>();
    readonly nodeBounds = new Map<NodeLike, Box3>();
    readonly nodeCells = new Map<NodeLike, Set<string>>();

    constructor(cellSize = 100) {
        if (cellSize <= 0) throw new Error('cellSize must be positive');
        this.cellSize = cellSize;
    }

    build(nodes: NodeLike[]): void {
        this.clear();
        for (const node of nodes) this.insertNode(node, this.scratchBox);
    }

    updateNode(node: NodeLike): void {
        this.removeNode(node);
        this.insertNode(node, this.scratchBox);
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
        const result = this.querySet;
        result.clear();
        this.forEachCellInBox(box, (x, y, z) => {
            for (const n of this.cells.get(this.getCellKey(x, y, z))?.nodes ?? []) result.add(n);
        });
        return [...result];
    }

    queryRadius(position: Vector3, radius: number): NodeLike[] {
        this.radiusBox.min.set(position.x - radius, position.y - radius, position.z - radius);
        this.radiusBox.max.set(position.x + radius, position.y + radius, position.z + radius);
        const candidates = this.queryBox(this.radiusBox);
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
        const checked = new Map<NodeLike, Set<NodeLike>>();

        for (const cell of this.cells.values()) {
            const nodes = cell.nodes;
            for (const a of nodes) {
                for (const b of nodes) {
                    if (a === b || a.id === b.id) continue;
                    let seen = checked.get(a);
                    if (!seen) checked.set(a, (seen = new Set()));
                    if (seen.has(b)) continue;
                    seen.add(b);
                    let reverse = checked.get(b);
                    if (!reverse) checked.set(b, (reverse = new Set()));
                    reverse.add(a);
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
    private forEachCellInBox(box: Box3, visit: (x: number, y: number, z: number) => void): void {
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

            // For nodes without objects, retain a small box around the point.
            this.scratchBox.setFromCenterAndSize(node.position, UNIT);
            this.nodeBounds.set(node, this.scratchBox.clone());

            this.nodeCells.set(node, new Set([key]));
            this.getOrCreateCell(x, y, z).nodes.add(node);
        }
    }
}
