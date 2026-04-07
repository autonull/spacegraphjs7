import * as THREE from 'three';
import { BaseLayout, type LayoutConfig, type LayoutOptions } from './BaseLayout';

/**
 * Spectral layout using eigenvector decomposition of the graph Laplacian.
 * Positions nodes based on the eigenvectors corresponding to the smallest eigenvalues,
 * providing a layout that respects the graph's connectivity structure.
 */
export class SpectralLayout extends BaseLayout {
    readonly id = 'spectral-layout';
    readonly name = 'Spectral Layout';
    readonly version = '1.0.0';

    protected defaultConfig(): LayoutConfig {
        return { scale: 400, animate: true, duration: 1.5, dimensions: 3 };
    }

    /**
     * Apply spectral layout using power iteration to compute eigenvectors.
     * Uses the adjacency matrix and degree information to position nodes in 2D/3D space.
     */
    async apply(options?: LayoutOptions): Promise<void> {
        const {
            scale = this.config.scale as number,
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.5,
            dimensions = this.config.dimensions as number,
        } = options ?? {};

        const nodes = Array.from(this.graph.getNodes()).filter(
            (n) => !(n.data as Record<string, unknown>).pinned,
        );
        const edges = Array.from(this.graph.getEdges());
        const n = nodes.length;
        if (!n) return;
        if (n === 1) {
            this.applyPosition(nodes[0], new THREE.Vector3(0, 0, 0), { animate, duration });
            return;
        }

        const nodeIndexMap = new Map<string, number>();
        nodes.forEach((node, i) => nodeIndexMap.set(node.id, i));

        const A = Array.from({ length: n }, () => new Float32Array(n));
        const D = new Float32Array(n);
        for (const edge of edges) {
            const i = edge.source?.id ? nodeIndexMap.get(edge.source.id) : undefined;
            const j = edge.target?.id ? nodeIndexMap.get(edge.target.id) : undefined;
            if (i !== undefined && j !== undefined && i !== j) {
                A[i][j] = A[j][i] = 1;
                D[i]++;
                D[j]++;
            }
        }

        const numEigs = Math.min(dimensions, n - 1);
        const eigenvectors = Array.from({ length: numEigs }, () =>
            new Float32Array(n).map(() => Math.random() - 0.5),
        );

        for (let iter = 0; iter < 50; iter++) {
            const nextEigs = Array.from({ length: numEigs }, () => new Float32Array(n));
            for (let k = 0; k < numEigs; k++) {
                for (let i = 0; i < n; i++) {
                    if (!D[i]) continue;
                    let sum = 0;
                    for (let j = 0; j < n; j++) {
                        if (A[i][j]) sum += eigenvectors[k][j];
                    }
                    nextEigs[k][i] = sum / D[i];
                }
            }
            for (let k = 0; k < numEigs; k++) {
                let mean = 0;
                for (let i = 0; i < n; i++) mean += nextEigs[k][i];
                mean /= n;
                for (let i = 0; i < n; i++) nextEigs[k][i] -= mean;
                for (let prev = 0; prev < k; prev++) {
                    let dot = 0;
                    for (let i = 0; i < n; i++) dot += nextEigs[k][i] * eigenvectors[prev][i];
                    for (let i = 0; i < n; i++) nextEigs[k][i] -= dot * eigenvectors[prev][i];
                }
                let normSq = 0;
                for (let i = 0; i < n; i++) normSq += nextEigs[k][i] ** 2;
                const norm = Math.sqrt(normSq) || 1;
                for (let i = 0; i < n; i++) eigenvectors[k][i] = nextEigs[k][i] / norm;
            }
        }

        const ranges = [0, 1, 2].map((dim) => {
            if (dim >= numEigs) return { min: 0, max: 1 };
            const vals = Array.from({ length: n }, (_, i) => eigenvectors[dim][i]);
            return { min: Math.min(...vals), max: Math.max(...vals) };
        });

        for (let i = 0; i < n; i++) {
            const nx =
                ((eigenvectors[0][i] - ranges[0].min) / (ranges[0].max - ranges[0].min || 1) -
                    0.5) *
                scale;
            const ny =
                numEigs > 1
                    ? ((eigenvectors[1][i] - ranges[1].min) / (ranges[1].max - ranges[1].min || 1) -
                          0.5) *
                      scale
                    : 0;
            const nz =
                numEigs > 2
                    ? ((eigenvectors[2][i] - ranges[2].min) / (ranges[2].max - ranges[2].min || 1) -
                          0.5) *
                      scale
                    : 0;
            this.applyPosition(nodes[i], new THREE.Vector3(nx, ny, nz), { animate, duration });
        }

        this.updateEdges();
    }
}
