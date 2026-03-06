import * as THREE from 'three';
import type { Node } from '../nodes/Node';

export class SpatialIndex {
    private cellSize: number;
    private cells: Map<string, Node[]> = new Map();

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
    }

    private getCellKey(x: number, y: number): string {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    public build(nodes: Node[]): void {
        this.cells.clear();
        for (const node of nodes) {
            // Compute the bounding box of the node in world space
            const box = new THREE.Box3().setFromObject(node.object);

            const minX = Math.floor(box.min.x / this.cellSize);
            const minY = Math.floor(box.min.y / this.cellSize);
            const maxX = Math.floor(box.max.x / this.cellSize);
            const maxY = Math.floor(box.max.y / this.cellSize);

            // Insert the node into all overlapped cells
            for (let cx = minX; cx <= maxX; cx++) {
                for (let cy = minY; cy <= maxY; cy++) {
                    const key = `${cx},${cy}`;
                    if (!this.cells.has(key)) {
                        this.cells.set(key, []);
                    }
                    // Avoid inserting the same node multiple times into the same cell, though Set handles it in query
                    this.cells.get(key)!.push(node);
                }
            }
        }
    }

    public queryBox(box: THREE.Box3): Node[] {
        const result: Set<Node> = new Set();

        const minX = Math.floor(box.min.x / this.cellSize);
        const minY = Math.floor(box.min.y / this.cellSize);
        const maxX = Math.floor(box.max.x / this.cellSize);
        const maxY = Math.floor(box.max.y / this.cellSize);

        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const key = `${cx},${cy}`;
                const cellNodes = this.cells.get(key);
                if (cellNodes) {
                    for (const node of cellNodes) {
                        result.add(node);
                    }
                }
            }
        }

        return Array.from(result);
    }

    public clear(): void {
        this.cells.clear();
    }
}
