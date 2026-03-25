import * as THREE from 'three';
import type { ISpaceGraphPlugin } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export class SpectralLayout implements ISpaceGraphPlugin {
    readonly id = 'spectral-layout';
    readonly name = 'Spectral Layout';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public settings = {
        scale: 400,
        animate: true,
        animationDuration: 1.5,
        dimensions: 3,
    };

    init(sg: SpaceGraph): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values());
        const edges = Array.from(this.sg.graph.edges);
        const n = nodes.length;

        if (n === 0) return;
        if (n === 1) {
            this.setPosition(nodes[0], new THREE.Vector3(0, 0, 0));
            return;
        }

        const nodeIndexMap = new Map<string, number>();
        for (let i = 0; i < nodes.length; i++) {
            nodeIndexMap.set(nodes[i].id, i);
        }

        const A = Array.from({ length: n }, () => new Float32Array(n).fill(0));
        const D = new Float32Array(n).fill(0);

        for (const edge of edges) {
            if (!edge.source || !edge.target || !edge.source.id || !edge.target.id) continue;
            const i = nodeIndexMap.get(edge.source.id);
            const j = nodeIndexMap.get(edge.target.id);
            if (i !== undefined && j !== undefined && i !== j) {
                A[i][j] = 1;
                A[j][i] = 1;
                D[i]++;
                D[j]++;
            }
        }

        const numEigs = Math.min(this.settings.dimensions, n - 1);
        const eigenvectors = Array.from({ length: numEigs }, () => new Float32Array(n));

        for (let k = 0; k < numEigs; k++) {
            for (let i = 0; i < n; i++) {
                eigenvectors[k][i] = Math.random() - 0.5;
            }
        }

        const iterations = 50;
        for (let iter = 0; iter < iterations; iter++) {
            const nextEigs = Array.from({ length: numEigs }, () => new Float32Array(n).fill(0));

            for (let k = 0; k < numEigs; k++) {
                for (let i = 0; i < n; i++) {
                    if (D[i] === 0) continue;
                    let sum = 0;
                    for (let j = 0; j < n; j++) {
                        if (A[i][j] > 0) {
                            sum += eigenvectors[k][j];
                        }
                    }
                    nextEigs[k][i] = sum / D[i];
                }
            }

            // Gram-Schmidt Orthogonalization (ignoring the trivial constant eigenvector [1,1,1...])
            // We force orthogonality to the trivial first eigenvector
            for (let k = 0; k < numEigs; k++) {
                // Remove mean (orthogonalize against constant vector)
                let mean = 0;
                for (let i = 0; i < n; i++) mean += nextEigs[k][i];
                mean /= n;
                for (let i = 0; i < n; i++) nextEigs[k][i] -= mean;

                // Orthogonalize against previously computed eigenvectors
                for (let prev = 0; prev < k; prev++) {
                    let dot = 0;
                    for (let i = 0; i < n; i++) dot += nextEigs[k][i] * eigenvectors[prev][i];
                    for (let i = 0; i < n; i++) nextEigs[k][i] -= dot * eigenvectors[prev][i];
                }

                // Normalize
                let normSq = 0;
                for (let i = 0; i < n; i++) normSq += nextEigs[k][i] * nextEigs[k][i];
                const norm = Math.sqrt(normSq) || 1;
                for (let i = 0; i < n; i++) {
                    eigenvectors[k][i] = nextEigs[k][i] / norm;
                }
            }
        }

        // 3. Assign positions based on the leading non-trivial eigenvectors
        const scale = this.settings.scale;

        // Normalize the final bounding box to perfectly fit the scale
        let maxX = -Infinity, minX = Infinity;
        let maxY = -Infinity, minY = Infinity;
        let maxZ = -Infinity, minZ = Infinity;

        for (let i = 0; i < n; i++) {
            const x = eigenvectors[0][i];
            const y = numEigs > 1 ? eigenvectors[1][i] : 0;
            const z = numEigs > 2 ? eigenvectors[2][i] : 0;

            if (x > maxX) maxX = x; if (x < minX) minX = x;
            if (y > maxY) maxY = y; if (y < minY) minY = y;
            if (z > maxZ) maxZ = z; if (z < minZ) minZ = z;
        }

        const rangeX = (maxX - minX) || 1;
        const rangeY = (maxY - minY) || 1;
        const rangeZ = (maxZ - minZ) || 1;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nx = ((eigenvectors[0][i] - minX) / rangeX - 0.5) * scale;
            const ny = numEigs > 1 ? ((eigenvectors[1][i] - minY) / rangeY - 0.5) * scale : 0;
            const nz = numEigs > 2 ? ((eigenvectors[2][i] - minZ) / rangeZ - 0.5) * scale : 0;

            this.setPosition(node, new THREE.Vector3(nx, ny, nz));
        }
    }

    private setPosition(node: any, pos: THREE.Vector3) {
        node.applyPosition(
            pos,
            this.settings.animate,
            this.settings.animationDuration
        );
    }

    dispose(): void { }
}
