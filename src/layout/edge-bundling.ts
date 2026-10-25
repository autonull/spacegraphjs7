import type { Position } from './placement';

/**
 * Edge bundling configuration.
 */
export interface EdgeBundlingConfig {
    /** Maximum distance for edges to be bundled together. */
    maxDistance?: number;
    /** Minimum number of edges to form a bundle. */
    minBundleSize?: number;
    /** Number of subdivision points for bezier curves. */
    subdivisions?: number;
    /** Strength of bundling (0 = straight lines, 1 = fully bundled). */
    bundlingStrength?: number;
}

/**
 * Represents a bundled edge with control points for bezier curve rendering.
 */
export interface BundledEdge {
    /** Original edge ID */
    id: string;
    /** Source node ID */
    source: string;
    /** Target node ID */
    target: string;
    /** Edge kind */
    kind: string;
    /** Control points for bezier curve (including start and end) */
    controlPoints: Position[];
    /** Bundle ID if this edge is part of a bundle */
    bundleId?: string;
}

/**
 * Hierarchical edge bundling: groups edges that share similar paths
 * and routes them along common bezier curves to reduce visual clutter.
 */
export class EdgeBundler {
    readonly #maxDistance: number;
    readonly #minBundleSize: number;
    readonly #subdivisions: number;
    readonly #bundlingStrength: number;

    constructor(config: EdgeBundlingConfig = {}) {
        this.#maxDistance = config.maxDistance ?? 100;
        this.#minBundleSize = config.minBundleSize ?? 3;
        this.#subdivisions = config.subdivisions ?? 20;
        this.#bundlingStrength = config.bundlingStrength ?? 0.7;
    }

    /**
     * Bundles edges based on their spatial proximity and shared hierarchy.
     */
    bundleEdges(
        edges: Array<{ id: string; source: string; target: string; kind: string }>,
        positions: Map<string, Position>,
        hierarchy: Map<string, string[]>, // nodeID -> ancestor chain
    ): BundledEdge[] {
        // Group edges by their hierarchical paths
        const edgeGroups = this.#groupEdgesByHierarchy(edges, hierarchy);

        const bundledEdges: BundledEdge[] = [];

        for (const group of edgeGroups.values()) {
            if (group.length >= this.#minBundleSize) {
                // Create bundle for this group
                const bundle = this.#createBundle(group, positions);
                bundledEdges.push(...bundle);
            } else {
                // Not enough edges to bundle, keep as individual
                for (const edge of group) {
                    bundledEdges.push(this.#createStraightEdge(edge, positions));
                }
            }
        }

        return bundledEdges;
    }

    /**
     * Groups edges by their hierarchical similarity.
     * Edges that share ancestors are more likely to be bundled.
     */
    #groupEdgesByHierarchy(
        edges: Array<{ id: string; source: string; target: string; kind: string }>,
        hierarchy: Map<string, string[]>,
    ): Map<string, Array<{ id: string; source: string; target: string; kind: string }>> {
        const groups = new Map<string, Array<{ id: string; source: string; target: string; kind: string }>>();

        for (const edge of edges) {
            const sourceAncestors = hierarchy.get(edge.source) ?? [];
            const targetAncestors = hierarchy.get(edge.target) ?? [];

            // Find common ancestor
            let commonAncestor = '';
            for (let i = 0; i < Math.min(sourceAncestors.length, targetAncestors.length); i++) {
                if (sourceAncestors[i] === targetAncestors[i]) {
                    commonAncestor = sourceAncestors[i];
                } else {
                    break;
                }
            }

            // Group by common ancestor (or 'none' if no common ancestor)
            const groupKey = commonAncestor || 'none';
            const group = groups.get(groupKey) ?? [];
            group.push(edge);
            groups.set(groupKey, group);
        }

        return groups;
    }

    /**
     * Creates a bundle for a group of edges.
     */
    #createBundle(
        edges: Array<{ id: string; source: string; target: string; kind: string }>,
        positions: Map<string, Position>,
    ): BundledEdge[] {
        // Calculate bundle control points
        const bundleId = `bundle-${edges[0].source}-${edges[0].target}`;

        // Find common control points for the bundle
        const sourcePositions = edges.map(e => positions.get(e.source)!).filter(Boolean);
        const targetPositions = edges.map(e => positions.get(e.target)!).filter(Boolean);

        if (sourcePositions.length === 0 || targetPositions.length === 0) {
            return edges.map(e => this.#createStraightEdge(e, positions));
        }

        // Calculate centroid of sources and targets
        const sourceCentroid = this.#centroid(sourcePositions);
        const targetCentroid = this.#centroid(targetPositions);

        // Create bundle control points: source -> mid -> target
        const midX = (sourceCentroid.x + targetCentroid.x) / 2;
        const midY = (sourceCentroid.y + targetCentroid.y) / 2;
        const midZ = (sourceCentroid.z + targetCentroid.z) / 2;

        // Offset mid point to create curve
        const dx = targetCentroid.x - sourceCentroid.x;
        const dy = targetCentroid.y - sourceCentroid.y;
        const distance = Math.hypot(dx, dy) || 1;
        const offset = Math.min(distance * 0.3, this.#maxDistance);

        const perpX = -dy / distance * offset;
        const perpY = dx / distance * offset;

        const bundleControlPoints: Position[] = [
            { x: sourceCentroid.x, y: sourceCentroid.y, z: sourceCentroid.z },
            { x: midX + perpX, y: midY + perpY, z: midZ },
            { x: targetCentroid.x, y: targetCentroid.y, z: targetCentroid.z },
        ];

        return edges.map(edge => {
            const sourcePos = positions.get(edge.source)!;
            const targetPos = positions.get(edge.target)!;

            // Create individual edge control points that blend from straight to bundle
            const individualPoints = this.#createIndividualEdgePoints(
                sourcePos,
                targetPos,
                bundleControlPoints,
                this.#subdivisions,
            );

            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                kind: edge.kind,
                controlPoints: individualPoints,
                bundleId,
            };
        });
    }

    /**
     * Creates control points for an individual edge that blend between
     * straight line and bundle curve.
     */
    #createIndividualEdgePoints(
        sourcePos: Position,
        targetPos: Position,
        bundlePoints: Position[],
        subdivisions: number,
    ): Position[] {
        const [bundleStart, bundleMid, bundleEnd] = bundlePoints;

        const points: Position[] = [];

        for (let i = 0; i <= subdivisions; i++) {
            const t = i / subdivisions;
            const invT = 1 - t;

            // Straight line interpolation
            const straightX = invT * sourcePos.x + t * targetPos.x;
            const straightY = invT * sourcePos.y + t * targetPos.y;
            const straightZ = invT * sourcePos.z + t * targetPos.z;

            // Bundle curve interpolation (quadratic bezier)
            const bundleX = invT * invT * bundleStart.x + 2 * invT * t * bundleMid.x + t * t * bundleEnd.x;
            const bundleY = invT * invT * bundleStart.y + 2 * invT * t * bundleMid.y + t * t * bundleEnd.y;
            const bundleZ = invT * invT * bundleStart.z + 2 * invT * t * bundleMid.z + t * t * bundleEnd.z;

            // Blend between straight and bundled
            const x = straightX + (bundleX - straightX) * this.#bundlingStrength;
            const y = straightY + (bundleY - straightY) * this.#bundlingStrength;
            const z = straightZ + (bundleZ - straightZ) * this.#bundlingStrength;

            points.push({ x, y, z });
        }

        return points;
    }

    /**
     * Creates a straight edge (no bundling).
     */
    #createStraightEdge(
        edge: { id: string; source: string; target: string; kind: string },
        positions: Map<string, Position>,
    ): BundledEdge {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);

        if (!sourcePos || !targetPos) {
            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                kind: edge.kind,
                controlPoints: [],
            };
        }

        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            controlPoints: [sourcePos, targetPos],
        };
    }

    /**
     * Calculates centroid of positions.
     */
    #centroid(positions: Position[]): Position {
        const sum = positions.reduce(
            (acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y, z: acc.z + pos.z }),
            { x: 0, y: 0, z: 0 },
        );
        const n = positions.length;
        return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
    }
}

/**
 * Convenience function to bundle edges.
 */
export function bundleEdges(
    edges: Array<{ id: string; source: string; target: string; kind: string }>,
    positions: Map<string, Position>,
    hierarchy: Map<string, string[]>,
    config?: EdgeBundlingConfig,
): BundledEdge[] {
    const bundler = new EdgeBundler(config);
    return bundler.bundleEdges(edges, positions, hierarchy);
}