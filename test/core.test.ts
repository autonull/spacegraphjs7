// SpaceGraphJS - Basic Unit Tests
// Run with: pnpm dlx vitest run test/core.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Graph } from '../src/core/Graph';
import { Node } from '../src/nodes/Node';
import { Edge } from '../src/edges/Edge';
import { EventSystem } from '../src/core/events/EventSystem';
import { TypeRegistry } from '../src/core/TypeRegistry';
import { SpatialIndex } from '../src/core/spatial/SpatialIndex';
import { MathPool } from '../src/core/pooling/ObjectPool';
import * as THREE from 'three';

describe('Graph', () => {
    describe('Graph', () => {
        it('should create an empty graph', () => {
            const graph = new Graph();
            expect(graph.getNodeCount()).toBe(0);
            expect(graph.getEdgeCount()).toBe(0);
        });

        it('should add and retrieve nodes', () => {
            const graph = new Graph();

            class TestNode extends Node {
                get object() {
                    return new THREE.Object3D();
                }
            }

            const node = new TestNode({
                id: 'test-node',
                type: 'TestNode',
                position: [10, 20, 30],
            });

            graph.addNode(node);

            expect(graph.getNodeCount()).toBe(1);
            expect(graph.getNode('test-node')).toBe(node);
            expect(graph.hasNode('test-node')).toBe(true);
        });

        it('should emit events when nodes are added', async () => {
            return new Promise<void>((resolve) => {
                const graph = new Graph();

                // Manually connect graph events to event system
                graph.on('node:added', (event) => {
                    expect(event.node.id).toBe('test-node');
                    expect(event.timestamp).toBeDefined();
                    resolve();
                });

                class TestNode extends Node {
                    get object() {
                        return new THREE.Object3D();
                    }
                }

                const node = new TestNode({
                    id: 'test-node',
                    type: 'TestNode',
                });

                graph.addNode(node);
            });
        });

        it('should remove connected edges when removing a node', () => {
            const graph = new Graph();

            class TestNode extends Node {
                get object() {
                    return new THREE.Object3D();
                }
            }

            class TestEdge extends Edge {
                get object() {
                    return new THREE.Object3D();
                }
                updatePositions() {}
            }

            const node1 = new TestNode({ id: 'node1', type: 'TestNode' });
            const node2 = new TestNode({ id: 'node2', type: 'TestNode' });

            graph.addNode(node1);
            graph.addNode(node2);

            const edge = new TestEdge(
                { id: 'edge1', source: 'node1', target: 'node2', type: 'TestEdge' },
                node1,
                node2,
            );
            graph.addEdge(edge);

            expect(graph.getEdgeCount()).toBe(1);

            graph.removeNode('node1');

            expect(graph.getNodeCount()).toBe(1);
            expect(graph.getEdgeCount()).toBe(0);
        });
    });

    describe('EventSystem', () => {
        it('should subscribe and emit events', async () => {
            return new Promise<void>((resolve) => {
                const events = new EventSystem();

                events.on('node:added', (event) => {
                    expect(event.node).toBe('test-node');
                    expect(event.timestamp).toBeDefined();
                    resolve();
                });

                events.emit('node:added', { node: 'test-node', timestamp: Date.now() });
            });
        });

        it('should dispose subscriptions', () => {
            const events = new EventSystem();
            const handler = vi.fn();

            const subscription = events.on('node:added', handler);
            subscription.dispose();

            events.emit('node:added', { node: 'test', timestamp: Date.now() });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should batch events', async () => {
            return new Promise<void>((resolve) => {
                const events = new EventSystem();
                const received: number[] = [];

                events.on('interaction:drag', (event) => {
                    received.push(event.position[0]);

                    if (received.length === 3) {
                        expect(received).toEqual([1, 2, 3]);
                        resolve();
                    }
                });

                events.emitBatched('interaction:drag', {
                    node: {},
                    position: [1, 0, 0],
                    timestamp: Date.now(),
                });
                events.emitBatched('interaction:drag', {
                    node: {},
                    position: [2, 0, 0],
                    timestamp: Date.now(),
                });
                events.emitBatched('interaction:drag', {
                    node: {},
                    position: [3, 0, 0],
                    timestamp: Date.now(),
                });

                // Flush batch manually for testing
                (events as any).flushBatch();
            });
        });
    });

    describe('TypeRegistry', () => {
        it('should register and retrieve node constructors', () => {
            const registry = TypeRegistry.getInstance();

            class TestNode extends Node {
                get object() {
                    return new THREE.Object3D();
                }
            }

            registry.registerNode('TestNode', TestNode);

            expect(registry.hasNode('TestNode')).toBe(true);
            expect(registry.getNodeConstructor('TestNode')).toBe(TestNode);
        });

        it('should create nodes from specs', () => {
            const registry = TypeRegistry.getInstance();

            class TestNode extends Node {
                get object() {
                    return new THREE.Object3D();
                }
            }

            registry.registerNode('TestNode', TestNode);

            const node = registry.createNode({
                id: 'test-1',
                type: 'TestNode',
                position: [10, 20, 30],
            });

            expect(node.id).toBe('test-1');
            expect(node.type).toBe('TestNode');
            expect(node.position.x).toBe(10);
        });

        it('should throw for unknown types', () => {
            const registry = TypeRegistry.getInstance();

            expect(() => {
                registry.createNode({ id: 'test', type: 'UnknownType' });
            }).toThrow('TypeRegistry: Unknown node type');
        });
    });

    describe('SpatialIndex', () => {
        it('should build index from nodes', () => {
            const index = new SpatialIndex(100);

            class TestNode extends Node {
                get object() {
                    const obj = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
                    obj.position.copy(this.position);
                    return obj;
                }
            }

            const nodes = [
                new TestNode({ id: 'node1', type: 'TestNode', position: [0, 0, 0] }),
                new TestNode({ id: 'node2', type: 'TestNode', position: [50, 50, 0] }),
                new TestNode({ id: 'node3', type: 'TestNode', position: [500, 500, 0] }),
            ];

            index.build(nodes);

            const stats = index.getStats();
            expect(stats.nodeCount).toBe(3);
            expect(stats.cellCount).toBeGreaterThan(0);
        });

        it('should find overlapping nodes', () => {
            const index = new SpatialIndex(100);

            class TestNode extends Node {
                get object() {
                    const obj = new THREE.Mesh(new THREE.BoxGeometry(50, 50, 50));
                    obj.position.copy(this.position);
                    return obj;
                }
            }

            const nodes = [
                new TestNode({ id: 'node1', type: 'TestNode', position: [0, 0, 0] }),
                new TestNode({ id: 'node2', type: 'TestNode', position: [25, 25, 0] }), // Overlapping
            ];

            index.build(nodes);

            const overlaps = index.findAllOverlaps();
            expect(overlaps.length).toBeGreaterThan(0);
        });

        it('should query by box', () => {
            const index = new SpatialIndex(100);

            class TestNode extends Node {
                get object() {
                    const obj = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10));
                    obj.position.copy(this.position);
                    return obj;
                }
            }

            const nodes = [
                new TestNode({ id: 'node1', type: 'TestNode', position: [0, 0, 0] }),
                new TestNode({ id: 'node2', type: 'TestNode', position: [50, 50, 0] }),
                new TestNode({ id: 'node3', type: 'TestNode', position: [500, 500, 0] }),
            ];

            index.build(nodes);

            const box = new THREE.Box3(
                new THREE.Vector3(-100, -100, -100),
                new THREE.Vector3(100, 100, 100),
            );

            const results = index.queryBox(box);
            expect(results.length).toBe(2); // node1 and node2
        });
    });

    describe('MathPool', () => {
        it('should acquire and release vectors', () => {
            const pool = MathPool.getInstance();

            const v1 = pool.acquireVector3();
            expect(v1.x).toBe(0);
            expect(v1.y).toBe(0);
            expect(v1.z).toBe(0);

            v1.set(10, 20, 30);
            pool.releaseVector3(v1);

            const v2 = pool.acquireVector3();
            // Should be reset
            expect(v2.x).toBe(0);
            expect(v2.y).toBe(0);
            expect(v2.z).toBe(0);
        });

        it('should track pool statistics', () => {
            const pool = MathPool.getInstance();
            const stats = pool.getStats();

            expect(stats.vector3).toBeDefined();
            expect(stats.vector2).toBeDefined();
            expect(stats.matrix4).toBeDefined();
        });
    });
});
