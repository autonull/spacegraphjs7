import * as THREE from 'three';
import type { Node } from '../nodes/Node';
export declare class SpatialIndex {
    private cellSize;
    private cells;
    constructor(cellSize?: number);
    private getCellKey;
    build(nodes: Node[]): void;
    queryBox(box: THREE.Box3): Node[];
    clear(): void;
}
