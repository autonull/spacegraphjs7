import { Vector3 } from 'three';
import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface SpectralLayoutOptions extends LayoutOptions {
    scale: number;
    dimensions: number;
    /** Extra padding between nodes for collision avoidance. Default: 20. */
    nodePadding?: number;
    /** If true, run a post-pass to eliminate overlaps (30 passes). Default: true. */
    separateOverlaps?: boolean;
}

/**
 * Spectral layout using eigenvector decomposition of the graph Laplacian.
 * Positions nodes based on the eigenvectors corresponding to the smallest eigenvalues,
 * providing a layout that respects the graph's connectivity structure.
 * 
 * Includes an optional size-aware collision settle post-pass (30 passes)
 * to eliminate node overlaps while preserving spectral structure.
 */
export class SpectralLayout extends BaseLayout<SpectralLayoutOptions> {
    readonly id = 'spectral-layout';
    readonly name = 'Spectral Layout';
    readonly version = '1.0.0';

    /**
     * Apply spectral layout using power iteration to compute eigenvectors.
     * Uses the adjacency matrix and degree information to position nodes in 2D/3D space.
     * Then runs an optional size-aware collision settle pass to eliminate overlaps.
     */
    protected place(nodes: Node[], config: SpectralLayoutOptions): void {
        const positions = spectralPositions(
            nodes,
            Array.from(this.graph.getEdges()),
            config.dimensions,
            config.scale,
        );
        this.positionAll(nodes, (_node, index) => positions[index]);

        // Size-aware collision settle post-pass (like ForceLayout's separation pass)
        if (config.separateOverlaps !== false) {
            this.separateOverlaps(nodes, config.nodePadding ?? 20);
        }
    }

    /**
     * Size-aware collision settle: push overlapping nodes apart until no overlaps remain.
     * Uses 30 passes (same pattern as ForceLayout).
     */
    private separateOverlaps(nodes: Node[], nodePadding: number): void {
        // Precompute collision radii (diagonal radius + padding)
        const radii = new Map<string, number>();
        for (const node of nodes) {
            const bounds = node.getLayoutBounds();
            const diagonal = Math.hypot(bounds.width, bounds.height);
            radii.set(node.id, diagonal / 2 + nodePadding);
        }

        // 30-pass separation
        for (let pass = 0; pass < 30; pass++) {
            let anyOverlap = false;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i];
                    const b = nodes[j];

                    const dx = a.position.x - b.position.x;
                    const dy = a.position.y - b.position.y;
                    const dz = a.position.z - b.position.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

                    const needed = (radii.get(a.id) ?? 0) + (radii.get(b.id) ?? 0);

                    if (dist < needed) {
                        anyOverlap = true;
                        const shove = (needed - dist) / 2;
                        const fx = (dx / dist) * shove;
                        const fy = (dy / dist) * shove;
                        const fz = (dz / dist) * shove;

                        a.position.x += fx;
                        a.position.y += fy;
                        a.position.z += fz;
                        b.position.x -= fx;
                        b.position.y -= fy;
                        b.position.z -= fz;
                    }
                }
            }
            if (!anyOverlap) break;
        }

        // Sync positions to Three.js objects
        for (const node of nodes) {
            this.syncPosition(node);
        }
    }

    protected defaultConfig(): SpectralLayoutOptions {
        return { scale: 400, animate: true, duration: 1.5, dimensions: 3, nodePadding: 20, separateOverlaps: true };
    }
}

function spectralPositions(
    nodes: Node[],
    edges: Edge[],
    dimensions: number,
    scale: number,
): Vector3[] {
    const count = nodes.length;
    if (count === 1) return [new Vector3(0, 0, 0)];

    const indexOf = new Map(nodes.map((node, index) => [node.id, index]));
    const adjacency = Array.from({ length: count }, () => new Float32Array(count));
    const degree = new Float32Array(count);
    for (const edge of edges) {
        const i = indexOf.get(edge.source.id);
        const j = indexOf.get(edge.target.id);
        if (i === undefined || j === undefined || i === j) continue;
        adjacency[i][j] = adjacency[j][i] = 1;
        degree[i]++;
        degree[j]++;
    }

    const eigenCount = Math.min(dimensions, count - 1);
    const eigenvectors = Array.from({ length: eigenCount }, () =>
        new Float32Array(count).map(() => Math.random() - 0.5),
    );
    powerIteration(eigenvectors, adjacency, degree, count);

    const ranges = [0, 1, 2].map((dimension) => {
        if (dimension >= eigenCount) return { min: 0, max: 1 };
        const values = Array.from({ length: count }, (_, i) => eigenvectors[dimension][i]);
        return { min: Math.min(...values), max: Math.max(...values) };
    });

    return nodes.map(
        (_, i) =>
            new Vector3(
                normalized(eigenvectors[0][i], ranges[0]) * scale,
                eigenCount > 1 ? normalized(eigenvectors[1][i], ranges[1]) * scale : 0,
                eigenCount > 2 ? normalized(eigenvectors[2][i], ranges[2]) * scale : 0,
            ),
    );
}

/** Repeatedly multiply by the normalised adjacency matrix, keeping the eigenvectors orthonormal. */
function powerIteration(
    eigenvectors: Float32Array[],
    adjacency: Float32Array[],
    degree: Float32Array,
    count: number,
): void {
    const eigenCount = eigenvectors.length;
    for (let iteration = 0; iteration < 50; iteration++) {
        const next = Array.from({ length: eigenCount }, () => new Float32Array(count));
        for (let k = 0; k < eigenCount; k++) {
            for (let i = 0; i < count; i++) {
                if (!degree[i]) continue;
                let sum = 0;
                for (let j = 0; j < count; j++) {
                    if (adjacency[i][j]) sum += eigenvectors[k][j];
                }
                next[k][i] = sum / degree[i];
            }
        }
        for (let k = 0; k < eigenCount; k++) {
            let mean = 0;
            for (let i = 0; i < count; i++) mean += next[k][i];
            mean /= count;
            for (let i = 0; i < count; i++) next[k][i] -= mean;
            for (let previous = 0; previous < k; previous++) {
                let dot = 0;
                for (let i = 0; i < count; i++) dot += next[k][i] * eigenvectors[previous][i];
                for (let i = 0; i < count; i++) next[k][i] -= dot * eigenvectors[previous][i];
            }
            let normSquared = 0;
            for (let i = 0; i < count; i++) normSquared += next[k][i] ** 2;
            const norm = Math.sqrt(normSquared) || 1;
            for (let i = 0; i < count; i++) eigenvectors[k][i] = next[k][i] / norm;
        }
    }
}

function normalized(value: number, range: { min: number; max: number }): number {
    return (value - range.min) / (range.max - range.min || 1) - 0.5;
}