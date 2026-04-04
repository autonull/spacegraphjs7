// SpaceGraphJS - Hierarchy Analyzer
// Graph topology analysis for hierarchy detection

import type { VisionContext } from '../types';
import type { HierarchyResult } from '../types';
import type { HeuristicsConfig } from '../strategies/HeuristicsStrategy';

/**
 * Hierarchy Analyzer
 * Analyzes graph topology to detect hierarchy structure
 */
export class HierarchyAnalyzer {
  /**
   * Analyze graph hierarchy
   */
  async analyze(
    context: VisionContext,
    _config: HeuristicsConfig
  ): Promise<HierarchyResult> {
    const graph = context.graph as {
      getNodes(): Iterable<{ id: string }>;
      getEdges(): Iterable<{ source: { id: string }; target: { id: string } }>;
    };

    const nodes = Array.from(graph.getNodes());
    const edges = Array.from(graph.getEdges());

    if (nodes.length === 0) {
      return {
        hasRoot: false,
        rootIds: [],
        depth: 0,
        levels: [],
        score: 0
      };
    }

    // Build adjacency list
    const adjacency = this.buildAdjacencyList(nodes, edges);
    
    // Find root nodes (nodes with no incoming edges)
    const rootIds = this.findRoots(nodes, edges);

    // Compute hierarchy levels using BFS
    const levels = this.computeLevels(rootIds, adjacency);
    const depth = levels.length;

    // Compute hierarchy score
    const score = this.computeScore(nodes, edges, rootIds, depth);

    return {
      hasRoot: rootIds.length > 0,
      rootIds,
      depth,
      levels,
      score
    };
  }

  /**
   * Build adjacency list from edges
   */
  private buildAdjacencyList(
    nodes: Array<{ id: string }>,
    edges: Array<{ source: { id: string }; target: { id: string } }>
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    // Initialize all nodes
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }

    // Add edges
    for (const edge of edges) {
      const sources = adjacency.get(edge.source.id);
      if (sources) {
        sources.push(edge.target.id);
      }
    }

    return adjacency;
  }

  /**
   * Find root nodes (no incoming edges)
   */
  private findRoots(
    nodes: Array<{ id: string }>,
    edges: Array<{ source: { id: string }; target: { id: string } }>
  ): string[] {
    const hasIncoming = new Set<string>();

    for (const edge of edges) {
      hasIncoming.add(edge.target.id);
    }

    const roots: string[] = [];
    for (const node of nodes) {
      if (!hasIncoming.has(node.id)) {
        roots.push(node.id);
      }
    }

    return roots;
  }

  /**
   * Compute hierarchy levels using BFS
   */
  private computeLevels(
    rootIds: string[],
    adjacency: Map<string, string[]>
  ): string[][] {
    const levels: string[][] = [];
    const visited = new Set<string>();
    const queue: Array<{ id: string; level: number }> = [];

    // Start from roots
    for (const rootId of rootIds) {
      queue.push({ id: rootId, level: 0 });
      visited.add(rootId);
    }

    // BFS
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      // Ensure level array exists
      while (levels.length <= level) {
        levels.push([]);
      }
      levels[level].push(id);

      // Add children to queue
      const children = adjacency.get(id) ?? [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push({ id: childId, level: level + 1 });
        }
      }
    }

    return levels;
  }

  /**
   * Compute hierarchy quality score
   */
  private computeScore(
    nodes: Array<{ id: string }>,
    edges: Array<{ source: { id: string }; target: { id: string } }>,
    rootIds: string[],
    depth: number
  ): number {
    let score = 100;

    // Penalize multiple roots (unless it's a forest)
    if (rootIds.length > 1) {
      score -= Math.min(20, (rootIds.length - 1) * 5);
    }

    // Penalize no roots (cycles)
    if (rootIds.length === 0) {
      score -= 30;
    }

    // Penalize excessive depth
    if (depth > 7) {
      score -= Math.min(20, (depth - 7) * 5);
    }

    // Penalize very shallow hierarchies
    if (depth === 1 && nodes.length > 5) {
      score -= 10;
    }

    // Check for cycles (simplified - count edges > nodes - 1)
    const expectedEdges = nodes.length - 1;
    if (edges.length > expectedEdges) {
      const extraEdges = edges.length - expectedEdges;
      score -= Math.min(20, extraEdges * 2);
    }

    return Math.max(0, Math.min(100, score));
  }
}
