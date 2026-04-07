// SpaceGraphJS v7.0 - Integration Test
// Demonstrates end-to-end functionality of the v7 architecture

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Graph } from '../src/core/Graph';
import { Node } from '../src/nodes/Node';
import { Edge } from '../src/edges/Edge';
import { EventSystem } from '../src/core/events/EventSystem';
import { TypeRegistry } from '../src/core/TypeRegistry';
import { SpatialIndex } from '../src/core/spatial/SpatialIndex';
import { MathPool } from '../src/core/pooling/ObjectPool';
import { VisionSystem } from '../src/vision/VisionSystem';
import { ForceLayout } from '../src/plugins/layouts/ForceLayout';
import { PluginManager, type Plugin } from '../src/core/PluginManager';
import * as THREE from 'three';

/**
 * Test Node implementation
 */
class TestNode extends Node {
    private _object: THREE.Object3D;

    constructor(sgOrSpec: any, maybeSpec?: any) {
        const spec = sgOrSpec?.type ? sgOrSpec : maybeSpec;
        super(sgOrSpec?.type ? sgOrSpec : undefined, spec);
        this._object = new THREE.Mesh(
            new THREE.SphereGeometry(10, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x3366ff }),
        );
        this._object.position.copy(this.position);
    }

    get object(): THREE.Object3D {
        return this._object;
    }

    update(spec: any): void {
        super.update(spec);
        if (spec.data?.color) {
            (this._object as THREE.Mesh).material.color.setHex(spec.data.color);
        }
    }

    dispose(): void {
        (this._object as THREE.Mesh).geometry.dispose();
        (this._object as THREE.Mesh).material.dispose();
        super.dispose();
    }
}

/**
 * Test Edge implementation
 */
class TestEdge extends Edge {
    private _object: THREE.Object3D;

    constructor(sgOrSpec: any, specOrSource: any, sourceOrTarget?: Node, targetOrNothing?: Node) {
        const isSpecFirst = sgOrSpec?.source !== undefined;
        if (isSpecFirst) {
            super(sgOrSpec, specOrSource, sourceOrTarget);
        } else {
            super(sgOrSpec, specOrSource, sourceOrTarget, targetOrNothing);
        }
        this._object = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x00d0ff }),
        );
        this.updatePositions();
    }

    get object(): THREE.Object3D {
        return this._object;
    }

    updatePositions(): void {
        const positions = new Float32Array([
            this.source.position.x,
            this.source.position.y,
            this.source.position.z,
            this.target.position.x,
            this.target.position.y,
            this.target.position.z,
        ]);
        (this._object.geometry as THREE.BufferGeometry).setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3),
        );
    }

    dispose(): void {
        this._object.geometry.dispose();
        (this._object.material as THREE.Material).dispose();
        super.dispose();
    }
}

/**
 * Integration Test Suite
 */
describe('SpaceGraphJS v7.0 Integration', () => {
    let graph: Graph;
    let events: EventSystem;
    let registry: TypeRegistry;

    beforeEach(() => {
        graph = new Graph();
        events = new EventSystem();
        registry = TypeRegistry.getInstance();

        // Register test types with both Graph and TypeRegistry
        graph.registerNodeType('TestNode', TestNode);
        graph.registerEdgeType('TestEdge', TestEdge);
        registry.registerNode('TestNode', TestNode);
        registry.registerEdge('TestEdge', TestEdge);
    });

    afterEach(() => {
        graph.clear();
        events.clear();
        registry.clear();
    });

    describe('Graph Operations', () => {
        it('should create graph and load from spec', () => {
            const spec = {
                nodes: [
                    {
                        id: 'node1',
                        type: 'TestNode',
                        position: [0, 0, 0] as [number, number, number],
                    },
                    {
                        id: 'node2',
                        type: 'TestNode',
                        position: [100, 0, 0] as [number, number, number],
                    },
                ],
                edges: [{ id: 'edge1', type: 'TestEdge', source: 'node1', target: 'node2' }],
            };

            graph.fromJSON(spec);

            expect(graph.getNodeCount()).toBe(2);
            expect(graph.getEdgeCount()).toBe(1);
            expect(graph.hasNode('node1')).toBe(true);
            expect(graph.hasNode('node2')).toBe(true);
            expect(graph.hasEdge('edge1')).toBe(true);
        });

        it('should emit events on graph changes', () => {
            const nodeAdded = vi.fn();
            const edgeAdded = vi.fn();

            graph.on('node:added', nodeAdded);
            graph.on('edge:added', edgeAdded);

            const node = new TestNode({ id: 'n1', type: 'TestNode' });
            graph.addNode(node);

            expect(nodeAdded).toHaveBeenCalledTimes(1);
            expect(nodeAdded.mock.calls[0][0].node.id).toBe('n1');
            expect(nodeAdded.mock.calls[0][0].timestamp).toBeDefined();
        });

        it('should remove connected edges when removing node', () => {
            graph.fromJSON({
                nodes: [
                    { id: 'n1', type: 'TestNode', position: [0, 0, 0] as [number, number, number] },
                    {
                        id: 'n2',
                        type: 'TestNode',
                        position: [100, 0, 0] as [number, number, number],
                    },
                ],
                edges: [{ id: 'e1', type: 'TestEdge', source: 'n1', target: 'n2' }],
            });

            graph.removeNode('n1');

            expect(graph.getNodeCount()).toBe(1);
            expect(graph.getEdgeCount()).toBe(0);
        });
    });

    describe('Spatial Index', () => {
        it('should detect overlapping nodes', () => {
            const nodes = [
                new TestNode({ id: 'n1', type: 'TestNode', position: [0, 0, 0] }),
                new TestNode({ id: 'n2', type: 'TestNode', position: [5, 5, 0] }), // Close enough to overlap
            ];

            const index = new SpatialIndex(50);
            index.build(nodes);

            const overlaps = index.findAllOverlaps();
            expect(overlaps.length).toBeGreaterThan(0);
        });

        it('should query nodes in radius', () => {
            const nodes = [
                new TestNode({ id: 'n1', type: 'TestNode', position: [0, 0, 0] }),
                new TestNode({ id: 'n2', type: 'TestNode', position: [50, 0, 0] }),
                new TestNode({ id: 'n3', type: 'TestNode', position: [200, 0, 0] }),
            ];

            const index = new SpatialIndex(100);
            index.build(nodes);

            const center = new THREE.Vector3(0, 0, 0);
            const results = index.queryRadius(center, 100);

            expect(results.length).toBe(2); // n1 and n2
        });
    });

    describe('Object Pool', () => {
        it('should reuse pooled vectors', () => {
            const pool = MathPool.getInstance();

            const v1 = pool.acquireVector3();
            v1.set(10, 20, 30);
            pool.releaseVector3(v1);

            const v2 = pool.acquireVector3();
            expect(v2.x).toBe(0); // Should be reset
            expect(v2.y).toBe(0);
            expect(v2.z).toBe(0);
        });

        it('should track pool statistics', () => {
            const pool = MathPool.getInstance();
            const stats = pool.getStats();

            expect(stats.vector3).toBeGreaterThan(0);
            expect(stats.vector2).toBeGreaterThan(0);
        });
    });

    describe('Vision System', () => {
        it('should analyze graph with heuristics', async () => {
            const vision = new VisionSystem({
                strategy: 'heuristics',
                heuristics: {
                    wcagThreshold: 4.5,
                    overlapPadding: 10,
                    fittsLawTargetSize: 44,
                },
            });

            // Create a simple graph
            const testGraph = new Graph();
            testGraph.fromJSON({
                nodes: [
                    { id: 'n1', type: 'TestNode', position: [0, 0, 0] as [number, number, number] },
                    {
                        id: 'n2',
                        type: 'TestNode',
                        position: [100, 0, 0] as [number, number, number],
                    },
                ],
                edges: [],
            });

            const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
            camera.position.set(0, 0, 500);

            const report = await vision.analyze(testGraph, camera);

            expect(report.overall.score).toBeDefined();
            expect(report.overall.grade).toBeDefined();
            expect(report.legibility).toBeDefined();
            expect(report.overlap).toBeDefined();
        });
    });

    describe('Plugin System', () => {
        it('should register and initialize plugins', async () => {
            const testGraph = new Graph();
            const testEvents = new EventSystem();
            const mockSg = { graph: testGraph, events: testEvents } as any;
            const plugins = new PluginManager(mockSg);

            const forceLayout = new ForceLayout();
            plugins.register('force-layout', forceLayout);

            expect(plugins.hasPlugin('force-layout')).toBe(true);
        });

        it('should call plugin hooks', async () => {
            const testGraph = new Graph();
            const testEvents = new EventSystem();
            const mockSg = { graph: testGraph, events: testEvents } as any;
            const plugins = new PluginManager(mockSg);

            let preRenderCalled = false;

            const testPlugin: Plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                init: () => {},
                onPreRender: () => {
                    preRenderCalled = true;
                },
            };

            plugins.register('test-plugin', testPlugin);
            plugins.updateAll(0.016);

            expect(preRenderCalled).toBe(true);
        });
    });

    describe('Force Layout', () => {
        it('should apply force-directed layout', async () => {
            graph.fromJSON({
                nodes: [
                    { id: 'n1', type: 'TestNode', position: [0, 0, 0] as [number, number, number] },
                    {
                        id: 'n2',
                        type: 'TestNode',
                        position: [10, 0, 0] as [number, number, number],
                    },
                    {
                        id: 'n3',
                        type: 'TestNode',
                        position: [20, 0, 0] as [number, number, number],
                    },
                ],
                edges: [
                    { id: 'e1', type: 'TestEdge', source: 'n1', target: 'n2' },
                    { id: 'e2', type: 'TestEdge', source: 'n2', target: 'n3' },
                ],
            });

            const mockSg = { graph, events } as any;
            const plugins = new PluginManager(mockSg);

            const layout = new ForceLayout();
            plugins.register('force-layout', layout);
            await layout.init(mockSg, graph, events);

            // Get initial positions
            const n1 = graph.getNode('n1')!;
            const n2 = graph.getNode('n2')!;
            const n3 = graph.getNode('n3')!;

            const initialDist12 = n1.position.distanceTo(n2.position);
            const initialDist23 = n2.position.distanceTo(n3.position);

            // Apply layout
            await layout.apply({ animate: false });

            // Nodes should be spread out after layout (repulsion should increase distances)
            const finalDist12 = n1.position.distanceTo(n2.position);
            const finalDist23 = n2.position.distanceTo(n3.position);

            // At least one distance should have increased due to repulsion
            expect(finalDist12 >= initialDist12 || finalDist23 >= initialDist23).toBe(true);
        });
    });

    describe('Type Registry', () => {
        it('should create nodes from specs', () => {
            const node = registry.createNode({
                id: 'test-1',
                type: 'TestNode',
                position: [10, 20, 30] as [number, number, number],
                data: { color: 0xff0000 },
            });

            expect(node.id).toBe('test-1');
            expect(node.type).toBe('TestNode');
            expect(node.position.x).toBe(10);
        });

        it('should create edges from specs', () => {
            const source = registry.createNode({ id: 's1', type: 'TestNode' });
            const target = registry.createNode({ id: 't1', type: 'TestNode' });

            const edge = registry.createEdge(
                { id: 'e1', type: 'TestEdge', source: 's1', target: 't1' },
                source,
                target,
            );

            expect(edge.id).toBe('e1');
            expect(edge.type).toBe('TestEdge');
            expect(edge.source.id).toBe('s1');
            expect(edge.target.id).toBe('t1');
        });
    });
});
