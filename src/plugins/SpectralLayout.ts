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
        dimensions: 3, // 2 or 3
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

        // 1. Build Adjacency Matrix
        const nodeIndexMap = new Map<string, number>();
        nodes.forEach((node, i) => nodeIndexMap.set(node.id, i));

        const A = Array.from({ length: n }, () => new Float32Array(n).fill(0));
        const D = new Float32Array(n).fill(0); // Degree matrix diagonal

        edges.forEach(edge => {
            if (!edge.source || !edge.target || !edge.source.id || !edge.target.id) return;
            const i = nodeIndexMap.get(edge.source.id);
            const j = nodeIndexMap.get(edge.target.id);
            if (i !== undefined && j !== undefined && i !== j) {
                A[i][j] = 1;
                A[j][i] = 1;
                D[i]++;
                D[j]++;
            }
        });

        // 2. Build Laplacian Matrix (L = D - A)
        // For simplicity and speed in JS without a full linear algebra library,
        // we'll use a fast iterative approximation (Power Iteration / Orthogonal Iteration) 
        // to find the Fiedler vector and the next eigenvectors.

        // Let's find the eigenvectors of the Random Walk normalized Laplacian: L_rw = I - D^-1 A
        // Which is equivalent to finding the eigenvectors of D^-1 A with the largest eigenvalues (< 1).

        const numEigs = Math.min(this.settings.dimensions, n - 1);
        const eigenvectors = Array.from({ length: numEigs }, () => new Float32Array(n));

        // Initialize with random values
        for (let k = 0; k < numEigs; k++) {
            for (let i = 0; i < n; i++) {
                eigenvectors[k][i] = Math.random() - 0.5;
            }
        }

        // Orthogonal Iteration (Simultaneous iteration)
        const iterations = 50;
        for (let iter = 0; iter < iterations; iter++) {
            // Multiply by Transition Matrix (P = D^-1 A)
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

        nodes.forEach((node, i) => {
            const nx = ((eigenvectors[0][i] - minX) / rangeX - 0.5) * scale;
            const ny = numEigs > 1 ? ((eigenvectors[1][i] - minY) / rangeY - 0.5) * scale : 0;
            const nz = numEigs > 2 ? ((eigenvectors[2][i] - minZ) / rangeZ - 0.5) * scale : 0;

            this.setPosition(node, new THREE.Vector3(nx, ny, nz));
        });
    }

    private setPosition(node: any, pos: THREE.Vector3) {
        if (this.settings.animate && (window as any).gsap) {
            (window as any).gsap.to(node.position, {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                duration: this.settings.animationDuration,
                ease: 'power2.out',
            });
        } else {
            node.position.copy(pos);
        }
    }

    dispose(): void { }
}
