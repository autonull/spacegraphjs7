import type { NodeSpec } from '../types';
import { seededRandom31 } from './math';
import { gridPoint, polarPoint } from './points';

export interface GraphGeneratorOptions {
    nodeCount?: number;
    seed?: number;
}

export const randomTree = (
    depth: number,
    maxChildren: number,
    opts?: GraphGeneratorOptions,
): NodeSpec[] => {
    const rand = opts?.seed !== undefined ? seededRandom31(opts.seed) : Math.random;
    const nodes: NodeSpec[] = [];
    const addNode = (parent: readonly number[] | null, d: number): void => {
        if (d >= depth) return;
        const id = `node-${nodes.length}`;
        const pos: [number, number, number] = parent
            ? [parent[0] + (rand() - 0.5) * 100, parent[1] + (rand() - 0.5) * 100, 0]
            : [rand() * 100, rand() * 100, 0];
        nodes.push({ id, type: 'shape', position: pos, data: { depth: d } });
        for (let i = 0; i < Math.floor(rand() * (maxChildren + 1)); i++) addNode(pos, d + 1);
    };
    addNode(null, 0);
    return nodes;
};

export const randomMesh = (width: number, height: number, spacing = 50): NodeSpec[] =>
    Array.from({ length: width * height }, (_, i) => ({
        id: `node-${Math.floor(i / height)}-${i % height}`,
        type: 'shape',
        position: [Math.floor(i / height) * spacing, (i % height) * spacing, 0],
    }));

export const scaleFreeGraph = (nodeCount: number, opts?: GraphGeneratorOptions): NodeSpec[] => {
    const rand = opts?.seed !== undefined ? seededRandom31(opts.seed) : Math.random;
    return Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        type: 'shape',
        position: [rand() * 200, rand() * 200, 0],
        data: { degree: 0 },
    }));
};

export const smallWorld = (
    nodeCount: number,
    k: number,
    beta: number,
    opts?: GraphGeneratorOptions,
): { nodes: NodeSpec[]; edges: Array<{ source: string; target: string }> } => {
    const rand = opts?.seed !== undefined ? seededRandom31(opts.seed) : Math.random;
    const radius = nodeCount / (2 * Math.PI);
    const nodes: NodeSpec[] = Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        type: 'shape',
        position: polarPoint((2 * Math.PI * i) / nodeCount, radius * 50, 'xy'),
    }));
    const edges: Array<{ source: string; target: string }> = [];
    for (let i = 0; i < nodeCount; i++)
        for (let j = 1; j <= k / 2; j++) {
            const target = `node-${(i + j) % nodeCount}`;
            edges.push({ source: `node-${i}`, target });
            if (rand() < beta) {
                const rewired = `node-${Math.floor(rand() * nodeCount)}`;
                if (rewired !== `node-${i}`) edges.push({ source: `node-${i}`, target: rewired });
            }
        }
    return { nodes, edges };
};

export const lattice2D = (
    cols: number,
    rows: number,
    spacing = 50,
): { nodes: NodeSpec[]; edges: Array<{ source: string; target: string }> } => {
    const nodes: NodeSpec[] = [];
    const edges: Array<{ source: string; target: string }> = [];
    for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
            const id = `node-${x}-${y}`;
            nodes.push({ id, type: 'shape', position: gridPoint(y * cols + x, cols, spacing, [0, 0], 'xy') });
            if (x > 0) edges.push({ source: `node-${x - 1}-${y}`, target: id });
            if (y > 0) edges.push({ source: `node-${x}-${y - 1}`, target: id });
        }
    return { nodes, edges };
};
