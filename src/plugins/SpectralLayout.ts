import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';

export class SpectralLayout implements Plugin {
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

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
    }

    public apply(): void {
        const nodes = Array.from(this.sg.graph.nodes.values()).filter((n) => !n.data?.pinned);
        const edges = Array.from(this.sg.graph.edges.values());
        const n = nodes.length;

        if (!n) return;
        if (n === 1) {
            this.setPosition(nodes[0], new THREE.Vector3(0, 0, 0));
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

        const numEigs = Math.min(this.settings.dimensions, n - 1);
        const eigenvectors = Array.from({ length: numEigs }, () => new Float32Array(n));
        for (let k = 0; k < numEigs; k++) {
            for (let i = 0; i < n; i++) {
                eigenvectors[k][i] = Math.random() - 0.5;
            }
        }

        const iterations = 50;
        for (let iter = 0; iter < iterations; iter++) {
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
                for (let i = 0; i < n; i++) {
                    eigenvectors[k][i] = nextEigs[k][i] / norm;
                }
            }
        }

        const scale = this.settings.scale;
        let maxX = -Infinity,
            minX = Infinity;
        let maxY = -Infinity,
            minY = Infinity;
        let maxZ = -Infinity,
            minZ = Infinity;

        for (let i = 0; i < n; i++) {
            const x = eigenvectors[0][i];
            const y = numEigs > 1 ? eigenvectors[1][i] : 0;
            const z = numEigs > 2 ? eigenvectors[2][i] : 0;

            if (x > maxX) maxX = x;
            if (x < minX) minX = x;
            if (y > maxY) maxY = y;
            if (y < minY) minY = y;
            if (z > maxZ) maxZ = z;
            if (z < minZ) minZ = z;
        }

        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const rangeZ = maxZ - minZ || 1;

        for (let i = 0; i < n; i++) {
            const nx = ((eigenvectors[0][i] - minX) / rangeX - 0.5) * scale;
            const ny = numEigs > 1 ? ((eigenvectors[1][i] - minY) / rangeY - 0.5) * scale : 0;
            const nz = numEigs > 2 ? ((eigenvectors[2][i] - minZ) / rangeZ - 0.5) * scale : 0;
            this.setPosition(nodes[i], new THREE.Vector3(nx, ny, nz));
        }

        for (const edge of this.sg.graph.edges.values()) edge.update?.();
    }

    private setPosition(node: Node, pos: THREE.Vector3): void {
        node.applyPosition(pos, {
            animate: this.settings.animate,
            duration: this.settings.animationDuration,
        });
    }
}
