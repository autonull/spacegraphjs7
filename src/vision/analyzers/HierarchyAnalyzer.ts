// SpaceGraphJS - Hierarchy Analyzer
// Graph topology analysis for hierarchy detection

import type { HeuristicsConfig } from '..';
import { childrenByID } from '../../utils/collection';
import { clamp } from '../../utils/math';
import type { HierarchyResult, VisionContext } from '../types';

/**
 * Hierarchy Analyzer
 * Analyzes graph topology to detect hierarchy structure
 */
export class HierarchyAnalyzer {
    /**
     * Analyze graph hierarchy
     */
    async analyze(context: VisionContext, _config: HeuristicsConfig): Promise<HierarchyResult> {
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
                score: 0,
            };
        }

        // Children and roots come from the same edge scan
        const { children: adjacency, parents } = childrenByID(
            nodes.map((node) => node.id),
            edges,
            (edge) => edge.source.id,
            (edge) => edge.target.id,
        );
        const rootIds = nodes.filter((node) => !parents.has(node.id)).map((node) => node.id);

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
            score,
        };
    }

    /**
     * Compute hierarchy levels using BFS
     */
    private computeLevels(rootIds: string[], adjacency: Map<string, string[]>): string[][] {
        const levels: string[][] = [];
        const visited = new Set<string>();
        const queue: Array<{ id: string; level: number }> = [];

        // Start from roots
        for (const rootId of rootIds) {
            queue.push({ id: rootId, level: 0 });
            visited.add(rootId);
        }

        // BFS
        for (let head = 0; head < queue.length; head++) {
            const { id, level } = queue[head]!;

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
        depth: number,
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

        return clamp(score, 0, 100);
    }
}
