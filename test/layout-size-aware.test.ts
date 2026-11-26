// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Graph } from '../src/core/Graph';
import { PluginManager } from '../src/core/PluginManager';
import { EventEmitter } from '../src/core/EventEmitter';
import { ShapeNode } from '../src/nodes/ShapeNode';
import { ForceLayout } from '../src/plugins/layouts/ForceLayout';
import { GridLayout } from '../src/plugins/layouts/GridLayout';
import { CircularLayout } from '../src/plugins/layouts/CircularLayout';
import { TreeLayout } from '../src/plugins/layouts/TreeLayout';
import { HierarchicalLayout } from '../src/plugins/layouts/HierarchicalLayout';
import { RadialLayout } from '../src/plugins/layouts/RadialLayout';
import { ClusterLayout } from '../src/plugins/layouts/ClusterLayout';
import { TimelineLayout } from '../src/plugins/layouts/TimelineLayout';
import type { SpaceGraph } from '../src/SpaceGraph';

/** Shared conformance test for size-aware layouts.
 * Verifies that layouts:
 * 1. Run without error
 * 2. Use size information (spacing adapts when node sizes change)
 * 3. Produce distinct positions (no two nodes at exactly the same position)
 * 4. For GridLayout and CircularLayout: assert AABB non-intersection with nodePadding = 20
 */

interface LayoutTestCase {
    name: string;
    createLayout: (options?: any) => any;
    setupGraph: (graph: Graph) => void;
    checkSizeAware?: (graph: Graph) => void;
    strictNonOverlap?: boolean;
}

function makeHost(): { sg: any; graph: Graph; events: EventEmitter; pluginManager: PluginManager } {
    const graph = new Graph();
    const events = new EventEmitter();

    const sg = { graph, events, requestFrame: () => {} } as unknown as SpaceGraph;
    const pluginManager = new PluginManager(sg);
    Object.assign(sg, { pluginManager });

    return { sg, graph, events, pluginManager };
}

function makeNodeWithSize(graph: Graph, id: string, width: number, height: number): void {
    const node = new ShapeNode(undefined, { id, type: 'ShapeNode', data: { width, height } });
    graph.addNode(node);
}

const FLAT_SIZES: readonly (readonly [string, number, number])[] = [
    ['n1', 100, 60],
    ['n2', 250, 120],
    ['n3', 400, 200],
    ['n4', 100, 60],
    ['n5', 250, 120],
];
const TREE_SIZES: readonly (readonly [string, number, number])[] = [
    ['root', 400, 200],
    ['child1', 250, 120],
    ['child2', 100, 60],
    ['child3', 250, 120],
    ['grandchild1', 100, 60],
];
const TREE_EDGES: readonly (readonly [string, string])[] = [
    ['root', 'child1'],
    ['root', 'child2'],
    ['root', 'child3'],
    ['child1', 'grandchild1'],
];
const addEdges = (graph: Graph, edges: readonly (readonly [string, string])[]): void =>
    edges.forEach(([source, target], index) =>
        graph.addEdge({ id: `e${index + 1}`, type: 'Edge', source, target }),
    );
const addUnsizedNode = (graph: Graph, id: string): void => {
    graph.addNode(new ShapeNode(undefined, { id, type: 'ShapeNode', data: {} }));
};

function seedFlat(graph: Graph, edges = false): void {
    FLAT_SIZES.forEach(([id, width, height]) => makeNodeWithSize(graph, id, width, height));
    addUnsizedNode(graph, 'n6');
    if (edges) addEdges(graph, [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4']]);
}

function seedTree(graph: Graph): void {
    TREE_SIZES.forEach(([id, width, height]) => makeNodeWithSize(graph, id, width, height));
    addUnsizedNode(graph, 'n6');
    addEdges(graph, TREE_EDGES);
}

function getPositions(graph: Graph): Map<string, { x: number; y: number; z: number }> {
    const positions = new Map();
    for (const node of graph.getNodes()) {
        positions.set(node.id, { x: node.position.x, y: node.position.y, z: node.position.z });
    }
    return positions;
}

function positionsEqual(pos1: Map<string, any>, pos2: Map<string, any>): boolean {
    if (pos1.size !== pos2.size) return false;
    for (const [id, p1] of pos1) {
        const p2 = pos2.get(id);
        if (!p2) return false;
        if (p1.x !== p2.x || p1.y !== p2.y || p1.z !== p2.z) return false;
    }
    return true;
}

function assertDistinctPositions(graph: Graph): void {
    const nodes = Array.from(graph.getNodes());
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = a.position.x - b.position.x;
            const dy = a.position.y - b.position.y;
            const dz = a.position.z - b.position.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            expect(distSq).toBeGreaterThan(0.0001); // Not exactly the same position
        }
    }
}

function assertStrictNonOverlap(graph: Graph, padding: number): void {
    const nodes = Array.from(graph.getNodes());
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const boundsA = a.getLayoutBounds();
            const boundsB = b.getLayoutBounds();
            const radiusA = Math.hypot(boundsA.width, boundsA.height) / 2;
            const radiusB = Math.hypot(boundsB.width, boundsB.height) / 2;
            const minDist = radiusA + radiusB + padding;

            const dx = Math.abs(a.position.x - b.position.x);
            const dy = Math.abs(a.position.y - b.position.y);
            const dist = Math.hypot(dx, dy);

            // Axis-separated OR center distance - allow small epsilon for floating point
            const axisSeparated = dx >= minDist - 1e-10 || dy >= minDist - 1e-10;
            const centerSeparated = dist >= minDist - 1e-10;
            expect(axisSeparated || centerSeparated).toBe(true);
        }
    }
}

const testCases: LayoutTestCase[] = [
    {
        name: 'ForceLayout',
        createLayout: (options) => new ForceLayout({ iterations: 200, nodePadding: 20, ...options }),
        setupGraph: (graph) => seedFlat(graph, true),
        strictNonOverlap: false,
    },
    {
        name: 'GridLayout',
        createLayout: (options) => new GridLayout({ columns: 3, nodePadding: 20, ...options }),
        setupGraph: seedFlat,
        strictNonOverlap: true,
    },
    {
        name: 'CircularLayout',
        createLayout: (options) => new CircularLayout({ nodePadding: 20, ...options }),
        setupGraph: seedFlat,
        strictNonOverlap: true,
    },
    {
        name: 'TreeLayout',
        createLayout: (options) => new TreeLayout({ nodePadding: 20, ...options }),
        setupGraph: seedTree,
        checkSizeAware: (graph) => {
            // Verify that sibling spacing adapts to node sizes
            const child1 = graph.queryEngine.getNode('child1')!;
            const child2 = graph.queryEngine.getNode('child2')!;
            const dx = Math.abs(child1.position.x - child2.position.x);
            // With sizes 250 and 100, spacing should be larger than default
            expect(dx).toBeGreaterThan(50);
        },
        strictNonOverlap: false,
    },
    {
        name: 'HierarchicalLayout',
        createLayout: (options) => new HierarchicalLayout({ rootId: 'root', nodePadding: 20, ...options }),
        setupGraph: seedTree,
        checkSizeAware: (graph) => {
            // Verify that sibling spacing adapts to node sizes
            const child1 = graph.queryEngine.getNode('child1')!;
            const child2 = graph.queryEngine.getNode('child2')!;
            const dx = Math.abs(child1.position.x - child2.position.x);
            expect(dx).toBeGreaterThan(50);
        },
        strictNonOverlap: false,
    },
    {
        name: 'RadialLayout',
        createLayout: (options) => new RadialLayout({ rootId: 'root', nodePadding: 20, ...options }),
        setupGraph: seedTree,
        checkSizeAware: (graph) => {
            // Verify that radial spacing adapts to node sizes
            const child1 = graph.queryEngine.getNode('child1')!;
            const child2 = graph.queryEngine.getNode('child2')!;
            const dist = Math.hypot(child1.position.x - child2.position.x, child1.position.y - child2.position.y);
            expect(dist).toBeGreaterThan(50);
        },
        strictNonOverlap: false,
    },
    {
        name: 'ClusterLayout',
        createLayout: (options) => new ClusterLayout({ clusterBy: 'category', nodePadding: 20, ...options }),
        setupGraph: (graph) => {
            seedFlat(graph);
            graph.queryEngine.getNode('n1')!.data.category = 'A';
            graph.queryEngine.getNode('n2')!.data.category = 'A';
            graph.queryEngine.getNode('n3')!.data.category = 'B';
            graph.queryEngine.getNode('n4')!.data.category = 'B';
            graph.queryEngine.getNode('n5')!.data.category = 'C';
            graph.queryEngine.getNode('n6')!.data.category = 'C';
        },
        checkSizeAware: (graph) => {
            // Verify that cluster micro-ring radius adapts to member sizes
            const n2 = graph.queryEngine.getNode('n2')!; // 250x120 in cluster A
            const n3 = graph.queryEngine.getNode('n3')!; // 400x200 in cluster B
            const distFromOrigin2 = Math.hypot(n2.position.x, n2.position.y);
            const distFromOrigin3 = Math.hypot(n3.position.x, n3.position.y);
            // Larger node should be further from cluster center
            expect(distFromOrigin3).toBeGreaterThan(distFromOrigin2);
        },
        strictNonOverlap: false,
    },
    {
        name: 'TimelineLayout',
        createLayout: (options) => new TimelineLayout({ timeField: 'timestamp', nodePadding: 20, staggerLayout: false, ...options }),
        setupGraph: (graph) => {
            seedFlat(graph);
            graph.queryEngine.getNode('n1')!.data.timestamp = 1000;
            graph.queryEngine.getNode('n2')!.data.timestamp = 2000;
            graph.queryEngine.getNode('n3')!.data.timestamp = 3000;
            graph.queryEngine.getNode('n4')!.data.timestamp = 4000;
            graph.queryEngine.getNode('n5')!.data.timestamp = 5000;
            graph.queryEngine.getNode('n6')!.data.timestamp = 6000;
        },
        checkSizeAware: (graph) => {
            // Verify that fallback/timed spacing adapts to node sizes
            const n1 = graph.queryEngine.getNode('n1')!;
            const n2 = graph.queryEngine.getNode('n2')!;
            const dx = Math.abs(n2.position.x - n1.position.x);
            // With sizes 100 and 250, spacing should be larger than default
            expect(dx).toBeGreaterThan(50);
        },
        strictNonOverlap: false,
    },
];

describe('size-aware layout conformance', () => {
    for (const tc of testCases) {
        it(`${tc.name} runs without error and produces distinct positions`, async () => {
            const { graph, pluginManager } = makeHost();
            const layout = tc.createLayout({});
            tc.setupGraph(graph);

            pluginManager.register(tc.name, layout);
            await pluginManager.initAll();

            // Apply layout
            await layout.applyLayout();

            // 1. All nodes have distinct positions
            assertDistinctPositions(graph);

            // 2. Layout uses size information (if checkSizeAware provided)
            if (tc.checkSizeAware) {
                tc.checkSizeAware(graph);
            }

            // 3. Strict non-overlap check for GridLayout and CircularLayout
            if (tc.strictNonOverlap) {
                assertStrictNonOverlap(graph, 20);
            }
        });

        it(`${tc.name} produces different positions when node sizes change (size-aware)`, async () => {
            // Run with original sizes
            const { graph: graph1, pluginManager: pm1 } = makeHost();
            const layout1 = tc.createLayout({});
            tc.setupGraph(graph1);
            pm1.register(tc.name, layout1);
            await pm1.initAll();
            await layout1.applyLayout();
            const pos1 = getPositions(graph1);

            // Run with doubled sizes
            const { graph: graph2, pluginManager: pm2 } = makeHost();
            const layout2 = tc.createLayout({});
            // Modify setup to use larger sizes
            const originalSetup = tc.setupGraph;
            tc.setupGraph = (g: Graph) => {
                originalSetup(g);
                // Double all node sizes
                for (const node of g.getNodes()) {
                    if (node.data.width) node.data.width *= 2;
                    if (node.data.height) node.data.height *= 2;
                }
            };
            tc.setupGraph(graph2);
            pm2.register(tc.name, layout2);
            await pm2.initAll();
            await layout2.applyLayout();
            const pos2 = getPositions(graph2);

            // Restore original setup
            tc.setupGraph = originalSetup;

            // Positions should be different (layout adapts to sizes)
            // Note: Some layouts may produce same relative positions but scaled
            // At minimum, they should not be identical
            expect(positionsEqual(pos1, pos2)).toBe(false);
        });
    }
});