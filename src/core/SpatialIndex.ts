import * as THREE from 'three';
import type { Node } from '../nodes/Node';

export class SpatialIndex {
    private cellSize: number;
    private cells: Map<string, Node[]> = new Map();

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
    }

    private _getGridBounds(box: THREE.Box3) {
        return {
            minX: Math.floor(box.min.x / this.cellSize),
            minY: Math.floor(box.min.y / this.cellSize),
            maxX: Math.floor(box.max.x / this.cellSize),
            maxY: Math.floor(box.max.y / this.cellSize),
        };
    }

    public build(nodes: Node[]): void {
        this.cells.clear();
        const box = new THREE.Box3();
        for (const node of nodes) {
            box.setFromObject(node.object);
            const bounds = this._getGridBounds(box);

            for (let cx = bounds.minX; cx <= bounds.maxX; cx++) {
                for (let cy = bounds.minY; cy <= bounds.maxY; cy++) {
                    const key = `${cx},${cy}`;
                    let cell = this.cells.get(key);
                    if (!cell) {
                        cell = [];
                        this.cells.set(key, cell);
                    }
                    cell.push(node);
                }
            }
        }
    }

    public queryBox(box: THREE.Box3): Node[] {
        const result: Set<Node> = new Set();
        const bounds = this._getGridBounds(box);

        for (let cx = bounds.minX; cx <= bounds.maxX; cx++) {
            for (let cy = bounds.minY; cy <= bounds.maxY; cy++) {
                const cellNodes = this.cells.get(`${cx},${cy}`);
                if (cellNodes) {
                    for (const node of cellNodes) result.add(node);
                }
            }
        }

        return Array.from(result);
    }

    public clear(): void {
        this.cells.clear();
    }
}
