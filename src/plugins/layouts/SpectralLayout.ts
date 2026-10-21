import * as THREE from 'three';
import type { Edge } from '../../edges/Edge';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface SpectralLayoutOptions extends LayoutOptions {
  scale: number;
  dimensions: number;
}

/**
 * Spectral layout using eigenvector decomposition of the graph Laplacian.
 * Positions nodes based on the eigenvectors corresponding to the smallest eigenvalues,
 * providing a layout that respects the graph's connectivity structure.
 */
export class SpectralLayout extends BaseLayout<SpectralLayoutOptions> {
  readonly id = 'spectral-layout';
  readonly name = 'Spectral Layout';
  readonly version = '1.0.0';

  /**
   * Apply spectral layout using power iteration to compute eigenvectors.
   * Uses the adjacency matrix and degree information to position nodes in 2D/3D space.
   */
  protected place(nodes: Node[], config: SpectralLayoutOptions): void {
    const positions = spectralPositions(
      nodes,
      Array.from(this.graph.getEdges()),
      config.dimensions,
      config.scale
    );
    this.positionAll(nodes, (_node, index) => positions[index]);
  }

  protected defaultConfig(): SpectralLayoutOptions {
    return { scale: 400, animate: true, duration: 1.5, dimensions: 3 };
  }
}

function spectralPositions(
  nodes: Node[],
  edges: Edge[],
  dimensions: number,
  scale: number
): THREE.Vector3[] {
  const count = nodes.length;
  if (count === 1) return [new THREE.Vector3(0, 0, 0)];

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
    new Float32Array(count).map(() => Math.random() - 0.5)
  );
  powerIteration(eigenvectors, adjacency, degree, count);

  const ranges = [0, 1, 2].map((dimension) => {
    if (dimension >= eigenCount) return { min: 0, max: 1 };
    const values = Array.from({ length: count }, (_, i) => eigenvectors[dimension][i]);
    return { min: Math.min(...values), max: Math.max(...values) };
  });

  return nodes.map(
    (_, i) =>
      new THREE.Vector3(
        normalized(eigenvectors[0][i], ranges[0]) * scale,
        eigenCount > 1 ? normalized(eigenvectors[1][i], ranges[1]) * scale : 0,
        eigenCount > 2 ? normalized(eigenvectors[2][i], ranges[2]) * scale : 0
      )
  );
}

/** Repeatedly multiply by the normalised adjacency matrix, keeping the eigenvectors orthonormal. */
function powerIteration(
  eigenvectors: Float32Array[],
  adjacency: Float32Array[],
  degree: Float32Array,
  count: number
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
