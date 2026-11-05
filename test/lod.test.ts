// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { LODPlugin } from '../src/plugins/LODPlugin';
import { ShapeNode } from '../src/nodes/ShapeNode';
import { Node } from '../src/nodes/Node';

// Minimal mock SpaceGraph for testing LODPlugin
function createMockSg(camera: THREE.Camera) {
    const nodes = new Map<string, Node>();
    const edges = new Map<string, any>();

    return {
        renderer: { camera },
        graph: { nodes, edges },
        requestFrame: vi.fn(),
    };
}

// Test node that tracks visibility and opacity
class TestNode extends ShapeNode {
    public lodUpdated = false;
    public lastLodDistance = 0;

    updateLod(distance: number): void {
        this.lodUpdated = true;
        this.lastLodDistance = distance;
    }

    setVisibility(visible: boolean): void {
        this.object.visible = visible;
    }
}

describe('LODPlugin', () => {
    describe('perspective camera', () => {
        it('should hide nodes beyond maxDistance', () => {
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
            camera.position.set(0, 0, 5000); // Far from origin

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxDistance: 3000, transitionRange: 500 });

            // Initialize plugin with mock SpaceGraph
            (plugin as any).sg = sg;

            // Create a node at origin (5000 units from camera)
            const node = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('node-1', node);

            plugin.onPreRender(0);

            // Node should be hidden (distance 5000 > maxDistance 3000)
            expect(node.object.visible).toBe(false);
        });

        it('should show nodes within maxDistance', () => {
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
            camera.position.set(0, 0, 1000); // Close to origin

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxDistance: 3000, transitionRange: 500 });

            (plugin as any).sg = sg;

            const node = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('node-1', node);

            plugin.onPreRender(0);

            // Node should be visible (distance 1000 < maxDistance 3000)
            expect(node.object.visible).toBe(true);
            expect(node.data.opacity).toBe(1);
        });

        it('should fade nodes in transition range', () => {
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
            // At distance 2800: in transition range (3000 - 500 = 2500 to 3000)
            camera.position.set(0, 0, 2800);

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxDistance: 3000, transitionRange: 500 });

            (plugin as any).sg = sg;

            const node = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('node-1', node);

            plugin.onPreRender(0);

            // Node should be visible but with reduced opacity
            expect(node.object.visible).toBe(true);
            const opacity = node.data.opacity as number;
            expect(opacity).toBeGreaterThan(0);
            expect(opacity).toBeLessThan(1);
            // At 2800: (3000 - 500 = 2500), so distance is 300 into 500 range = 0.6 through range
            // opacity = 1 - 300/500 = 0.4
            expect(opacity).toBeCloseTo(0.4, 1);
        });
    });

    describe('orthographic camera', () => {
        it('should show nodes when frustum extent is within maxVisibleExtent', () => {
            const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 10000);
            camera.zoom = 1; // frustum height = 600

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxVisibleExtent: 5000, extentTransitionRange: 1000 });

            (plugin as any).sg = sg;

            const node = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('node-1', node);

            plugin.onPreRender(0);

            // Frustum height 600 < maxVisibleExtent 5000, should be visible
            expect(node.object.visible).toBe(true);
        });

        it('should hide nodes when frustum extent exceeds maxVisibleExtent', () => {
            const camera = new THREE.OrthographicCamera(-3000, 3000, 3000, -3000, 0.1, 10000);
            camera.zoom = 1; // frustum height = 6000

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxVisibleExtent: 5000, extentTransitionRange: 1000 });

            (plugin as any).sg = sg;

            const node = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('node-1', node);

            plugin.onPreRender(0);

            // Frustum height 6000 > maxVisibleExtent 5000, should be hidden
            expect(node.object.visible).toBe(false);
        });

        it('should fade nodes when frustum extent is in transition range', () => {
            const camera = new THREE.OrthographicCamera(-3000, 3000, 3000, -3000, 0.1, 10000);
            camera.zoom = 0.8; // frustum height = 7500 (6000 / 0.8)

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxVisibleExtent: 5000, extentTransitionRange: 1000 });

            (plugin as any).sg = sg;

            const node = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('node-1', node);

            plugin.onPreRender(0);

            // Frustum height 7500 is in transition range (5000 to 6000)
            // At 7500: 7500 - (5000 - 1000) = 3500 into 1000 range = 3.5, clamped to 1
            // Actually: maxVisibleExtent - extentTransitionRange = 4000
            // 7500 - 4000 = 3500 > 1000, so fully hidden (opacity 0)
            // Let's use a zoom that puts it in the fade range
            // zoom = 5000/6000 = 0.833... gives extent = 6000, wait that's not right
            // The extent is (top - bottom) / zoom = 6000 / zoom
            // We want extent = 5500 (in transition range 4000-5000... wait, max=5000, transition=1000, so fade starts at 4000)
            // So we want extent = 4500: zoom = 6000/4500 = 1.333
            camera.zoom = 6000 / 4500;

            plugin.onPreRender(0);

            expect(node.object.visible).toBe(true);
            const opacity = node.data.opacity as number;
            expect(opacity).toBeGreaterThan(0);
            expect(opacity).toBeLessThan(1);
        });

        it('should track zoom changes correctly', () => {
            const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 10000);
            camera.zoom = 1; // frustum height = 600

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxVisibleExtent: 1000, extentTransitionRange: 200 });

            (plugin as any).sg = sg;

            const node = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('node-1', node);

            // Initial: extent 600 < 1000, visible
            plugin.onPreRender(0);
            expect(node.object.visible).toBe(true);
            expect(node.data.opacity).toBe(1);

            // Zoom out: extent increases
            camera.zoom = 0.5; // frustum height = 1200
            plugin.onPreRender(0);
            // extent 1200 > max 1000, should be hidden
            expect(node.object.visible).toBe(false);

            // Zoom back in
            camera.zoom = 2; // frustum height = 300
            plugin.onPreRender(0);
            expect(node.object.visible).toBe(true);
            expect(node.data.opacity).toBe(1);
        });
    });

    describe('group node handling', () => {
        it('should hide children when parent group is hidden', () => {
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
            camera.position.set(0, 0, 5000);

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxDistance: 3000, transitionRange: 500 });

            (plugin as any).sg = sg;

            // Create parent group node
            class GroupTestNode extends ShapeNode {
                isGroupNode = true;
                updateLod(distance: number): void {
                    this.data._lastLodVisible = distance <= 3000;
                }
            }

            const parent = new GroupTestNode(sg, { id: 'parent', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('parent', parent);

            // Create child node
            const child = new TestNode(sg, { id: 'child', type: 'ShapeNode', position: [100, 100, 0] });
            sg.graph.nodes.set('child', child);

            plugin.onPreRender(0);

            // Parent is hidden (distance 5000 > 3000), so child should also be hidden
            expect(child.object.visible).toBe(false);
        });

        it('should show children when parent group is visible', () => {
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
            camera.position.set(0, 0, 1000);

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxDistance: 3000, transitionRange: 500 });

            (plugin as any).sg = sg;

            class GroupTestNode extends ShapeNode {
                isGroupNode = true;
                updateLod(distance: number): void {
                    this.data._lastLodVisible = distance <= 3000;
                }
            }

            const parent = new GroupTestNode(sg, { id: 'parent', type: 'ShapeNode', position: [0, 0, 0] });
            sg.graph.nodes.set('parent', parent);

            const child = new TestNode(sg, { id: 'child', type: 'ShapeNode', position: [100, 100, 0] });
            sg.graph.nodes.set('child', child);

            plugin.onPreRender(0);

            // Parent is visible (distance 1000 < 3000), so child should be visible
            expect(child.object.visible).toBe(true);
        });
    });

    describe('edge visibility', () => {
        it('should hide edges when either endpoint is hidden', () => {
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
            camera.position.set(0, 0, 5000);

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxDistance: 3000, transitionRange: 500 });

            (plugin as any).sg = sg;

            const node1 = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            const node2 = new TestNode(sg, { id: 'node-2', type: 'ShapeNode', position: [1000, 0, 0] });
            sg.graph.nodes.set('node-1', node1);
            sg.graph.nodes.set('node-2', node2);

            // Create a mock edge
            const edge = {
                source: node1,
                target: node2,
                object: new THREE.Line(),
            };
            sg.graph.edges.set('edge-1', edge);

            plugin.onPreRender(0);

            // Both nodes hidden, edge should be hidden
            expect(edge.object.visible).toBe(false);
        });

        it('should show edges when both endpoints are visible', () => {
            const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
            camera.position.set(0, 0, 1000);

            const sg = createMockSg(camera);
            const plugin = new LODPlugin({ maxDistance: 3000, transitionRange: 500 });

            (plugin as any).sg = sg;

            const node1 = new TestNode(sg, { id: 'node-1', type: 'ShapeNode', position: [0, 0, 0] });
            const node2 = new TestNode(sg, { id: 'node-2', type: 'ShapeNode', position: [1000, 0, 0] });
            sg.graph.nodes.set('node-1', node1);
            sg.graph.nodes.set('node-2', node2);

            const edge = {
                source: node1,
                target: node2,
                object: new THREE.Line(),
            };
            sg.graph.edges.set('edge-1', edge);

            plugin.onPreRender(0);

            // Both nodes visible, edge should be visible
            expect(edge.object.visible).toBe(true);
        });
    });
});