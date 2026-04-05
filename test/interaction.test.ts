// SpaceGraphJS - Interaction Unit Tests
// Tests for event consumption, zoom stack, keyboard controls, drag, activity, etc.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
    InputManager,
    type InputEvent,
    type InputAction,
    type InputBinding,
} from '../src/input/InputManager';
import { CameraControls, type CameraControlsConfig } from '../src/core/CameraControls';
import { DragHandler } from '../src/plugins/interaction/DragHandler';
import { InteractionRaycaster } from '../src/plugins/interaction/RaycasterHelper';
import { FingerManager, Fingering, type Finger } from '../src/input/Fingering';
import { LayoutContainer } from '../src/plugins/LayoutContainer';
import { HoverOverlay, type HoverModel } from '../src/plugins/HoverOverlay';
import { Surface, type HitResult, type Rect } from '../src/core/Surface';
import { createParentTransform, type SurfaceTransform } from '../src/input/SurfaceTransform';
import { Node } from '../src/nodes/Node';
import { Edge, DEFAULT_EDGE_DATA } from '../src/edges/Edge';
import { Wire } from '../src/edges/Wire';

// Mock SpaceGraph for tests
function createMockSpaceGraph() {
    const events = {
        emit: vi.fn(),
        on: vi.fn(),
        emitBatched: vi.fn(),
    };
    const renderer = {
        camera: new THREE.PerspectiveCamera(75, 1, 0.1, 10000),
        scene: new THREE.Scene(),
        renderer: { domElement: document.createElement('canvas') },
    };
    renderer.camera.position.set(0, 0, 500);
    const graph = {
        nodes: new Map<string, Node>(),
        edges: new Map<string, Edge>(),
        on: vi.fn(),
        getNodes: () => graph.nodes.values(),
        getEdges: () => graph.edges.values(),
        addNode: vi.fn(),
        removeNode: vi.fn(),
    };
    return {
        events,
        renderer,
        graph,
        input: { getState: () => ({ keysPressed: new Set() }) },
    } as any;
}

// Concrete test node
class TestNode extends Node {
    readonly object = new THREE.Object3D();
    constructor() {
        super({ id: 'test', type: 'TestNode' } as any);
    }
}

// Concrete test surface
class TestSurface extends Surface {
    bounds: Rect = { x: 0, y: 0, width: 100, height: 100 };
    hitTest(_ray: THREE.Raycaster): HitResult | null {
        return null;
    }
    start(): void {}
    stop(): void {}
    delete(): void {}
}

describe('Event Consumption Model', () => {
    it('should initialize events with consumed=false', () => {
        const mockSg = createMockSpaceGraph();
        const manager = new InputManager({ graph: mockSg, events: mockSg.events });
        const source = manager.addSource({ id: 'test', element: document.createElement('div') });

        const event = (source as any).normalizeEvent('pointerdown', {
            clientX: 100,
            clientY: 200,
            button: 0,
            buttons: 1,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            target: null,
        } as MouseEvent);

        expect(event).not.toBeNull();
        expect(event!.consumed).toBe(false);
    });

    it('should stop propagation when event.consumed=true', () => {
        const mockSg = createMockSpaceGraph();
        const manager = new InputManager({ graph: mockSg, events: mockSg.events });

        const callOrder: string[] = [];

        manager.registerAction({
            id: 'first',
            label: 'First',
            handler: (event: InputEvent) => {
                callOrder.push('first');
                (event as any).consumed = true;
            },
        });
        manager.registerAction({
            id: 'second',
            label: 'Second',
            handler: () => {
                callOrder.push('second');
            },
        });

        manager.addBinding({
            id: 'b1',
            action: 'first',
            sources: ['test'],
            eventType: 'pointerdown',
            priority: 10,
        });
        manager.addBinding({
            id: 'b2',
            action: 'second',
            sources: ['test'],
            eventType: 'pointerdown',
            priority: 5,
        });

        manager.handleEvent({
            type: 'pointerdown',
            source: 'test',
            timestamp: Date.now(),
            data: {},
            consumed: false,
        });

        expect(callOrder).toEqual(['first']);
    });

    it('should allow propagation when not consumed', () => {
        const mockSg = createMockSpaceGraph();
        const manager = new InputManager({ graph: mockSg, events: mockSg.events });

        const callOrder: string[] = [];

        manager.registerAction({
            id: 'first',
            label: 'First',
            handler: () => {
                callOrder.push('first');
            },
        });
        manager.registerAction({
            id: 'second',
            label: 'Second',
            handler: () => {
                callOrder.push('second');
            },
        });

        manager.addBinding({
            id: 'b1',
            action: 'first',
            sources: ['test'],
            eventType: 'pointerdown',
            priority: 10,
        });
        manager.addBinding({
            id: 'b2',
            action: 'second',
            sources: ['test'],
            eventType: 'pointerdown',
            priority: 5,
        });

        manager.handleEvent({
            type: 'pointerdown',
            source: 'test',
            timestamp: Date.now(),
            data: {},
            consumed: false,
        });

        expect(callOrder).toEqual(['first', 'second']);
    });
});

describe('Zoom Stack', () => {
    it('should push to stack on zoomTo', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        controls.zoomTo(new THREE.Vector3(100, 100, 0), 200);
        expect(controls.getZoomDepth()).toBe(1);
        expect(controls.canZoomOut()).toBe(true);
    });

    it('should pop from stack on zoomOut', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        controls.zoomTo(new THREE.Vector3(100, 100, 0), 200);
        controls.zoomTo(new THREE.Vector3(200, 200, 0), 100);
        expect(controls.getZoomDepth()).toBe(2);

        controls.zoomOut();
        expect(controls.getZoomDepth()).toBe(1);
    });

    it('should zoom out when zooming to same target', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        controls.zoomTo(new THREE.Vector3(0, 0, 0), 200);
        const depthBefore = controls.getZoomDepth();
        expect(depthBefore).toBe(1);

        controls.zoomTo(new THREE.Vector3(0, 0, 0), 200);
        expect(controls.getZoomDepth()).toBeLessThan(depthBefore);
    });

    it('should have no zoom history initially', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        expect(controls.hasZoomHistory).toBe(false);
        expect(controls.canZoomOut()).toBe(false);
    });

    it('should respect MAX_ZOOM_DEPTH of 8', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        for (let i = 0; i < 15; i++) {
            controls.zoomTo(new THREE.Vector3(i * 100, i * 100, 0), 200 - i * 10);
        }
        expect(controls.getZoomDepth()).toBeLessThanOrEqual(8);
    });
});

describe('Keyboard Camera Controls', () => {
    it('should track key state on keydown/keyup', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        camera.up.set(0, 1, 0);
        const controls = new CameraControls(camera, container);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
        controls.processKeyboardInput();
        expect(controls.panOffset.x).not.toBe(0);

        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'l' }));
    });

    it('should respect enableKeyboard=false', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container, { enableKeyboard: false });

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
        controls.update();
        expect(controls.panOffset.x).toBe(0);
    });

    it('should panBy correctly', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        camera.up.set(0, 1, 0);
        const controls = new CameraControls(camera, container);

        controls.panBy(10, 0);
        expect(controls.panOffset.x).not.toBe(0);

        controls.panBy(0, 10);
        expect(controls.panOffset.y).not.toBe(0);
    });
});

describe('Orthographic Toggle', () => {
    it('should toggle orthographic mode', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        expect(controls.isUsingOrthographic).toBe(false);
        controls.toggleOrthographic();
        expect(controls.isUsingOrthographic).toBe(true);
        expect(controls.getOrthoCamera()).not.toBeNull();
    });

    it('should wire "o" key to toggleOrthographic', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));
        controls.update();
        expect(controls.isUsingOrthographic).toBe(true);

        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'o' }));
    });
});

describe('Right-Drag Zoom', () => {
    it('should start right drag on button 2', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        container.dispatchEvent(
            new PointerEvent('pointerdown', { button: 2, clientX: 100, clientY: 100 }),
        );
        expect((controls as any).isRightDragging).toBe(true);
    });

    it('should update zoom on right drag move', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);
        const initialScale = (controls as any).scale;

        container.dispatchEvent(
            new PointerEvent('pointerdown', {
                button: 2,
                clientX: 100,
                clientY: 100,
                pointerId: 1,
            }),
        );
        container.dispatchEvent(
            new PointerEvent('pointermove', { clientX: 100, clientY: 150, pointerId: 1 }),
        );

        expect((controls as any).scale).not.toBe(initialScale);
    });

    it('should end right drag on pointer up', () => {
        const container = document.createElement('div');
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        camera.position.set(0, 0, 500);
        const controls = new CameraControls(camera, container);

        container.dispatchEvent(
            new PointerEvent('pointerdown', {
                button: 2,
                clientX: 100,
                clientY: 100,
                pointerId: 1,
            }),
        );
        container.dispatchEvent(new PointerEvent('pointerup', { button: 2, pointerId: 1 }));
        expect((controls as any).isRightDragging).toBe(false);
    });
});

describe('Node Activity', () => {
    it('should decay activity over time', () => {
        const node = new TestNode();
        node.activity = 1.0;
        node.onPreRender(1.0);
        expect(node.activity).toBeLessThan(1.0);
        expect(node.activity).toBeGreaterThan(0);
    });

    it('should pulse to max intensity', () => {
        const node = new TestNode();
        node.activity = 0.3;
        node.pulse(0.8);
        expect(node.activity).toBe(0.8);
        node.pulse(0.5);
        expect(node.activity).toBe(0.8);
    });
});

describe('Edge Activity', () => {
    it('should decay activity over time', () => {
        const mockSg = createMockSpaceGraph();
        const source = new TestNode();
        const target = new TestNode();
        const edge = new Edge(
            { id: 'e1', type: 'Edge', source: 's1', target: 't1' },
            source,
            target,
        );
        edge.activity = 1.0;
        edge.onPreRender(1.0);
        expect(edge.activity).toBeLessThan(1.0);
    });

    it('should pulse and track lastActivityTime', () => {
        const mockSg = createMockSpaceGraph();
        const source = new TestNode();
        const target = new TestNode();
        const edge = new Edge(
            { id: 'e1', type: 'Edge', source: 's1', target: 't1' },
            source,
            target,
        );
        edge.pulse(1.0);
        expect(edge.lastActivityTime).toBeGreaterThan(0);
        expect(edge.activityDecay(performance.now(), 2000)).toBeGreaterThan(0);
    });
});

describe('DragHandler', () => {
    it('should veto drag when isDraggable returns false', () => {
        const mockSg = createMockSpaceGraph();
        const node = new TestNode();
        node.isDraggable = () => false;
        mockSg.graph.nodes.set(node.id, node);

        const raycaster = new InteractionRaycaster(mockSg);
        const handler = new DragHandler(mockSg, raycaster);

        const result = handler.startDrag(node);
        expect(result).toBe(false);
    });

    it('should support damped dragging with stiffness < 1.0', () => {
        const mockSg = createMockSpaceGraph();
        const node = new TestNode();
        node.position.set(0, 0, 0);
        mockSg.graph.nodes.set(node.id, node);

        const raycaster = new InteractionRaycaster(mockSg);
        const handler = new DragHandler(mockSg, raycaster);

        handler.startDrag(node, { stiffness: 0.5 });
        expect((handler as any).dragStiffness).toBe(0.5);
    });

    it('should support preserveDistance mode', () => {
        const mockSg = createMockSpaceGraph();
        const node = new TestNode();
        node.position.set(0, 0, 0);
        mockSg.graph.nodes.set(node.id, node);

        const raycaster = new InteractionRaycaster(mockSg);
        const handler = new DragHandler(mockSg, raycaster);

        handler.startDrag(node, { preserveDistance: true });
        expect((handler as any).preserveDistance).toBe(true);
        expect((handler as any).initialPickDistance).toBeGreaterThan(0);
    });
});

describe('FingerManager', () => {
    it('should acquire fingering on test', () => {
        const manager = new FingerManager();

        class TestFingering extends Fingering {
            started = false;
            updated = false;
            stopped = false;
            start(_finger: Finger): boolean {
                this.started = true;
                return true;
            }
            update(_finger: Finger): boolean {
                this.updated = true;
                return true;
            }
            stop(_finger: Finger): void {
                this.stopped = true;
            }
        }

        const fingering = new TestFingering();
        const finger: Finger = {
            pointerId: 1,
            position: { x: 0, y: 0 },
            buttons: 1,
            state: 'down',
            target: null,
        };

        expect(manager.test(fingering, finger)).toBe(true);
        expect(fingering.started).toBe(true);
        expect(manager.isActive()).toBe(true);
    });

    it('should replace active fingering when defer returns true', () => {
        const manager = new FingerManager();

        class TestFingering extends Fingering {
            stopped = false;
            start(_f: Finger) {
                return true;
            }
            update(_f: Finger) {
                return true;
            }
            stop(_f: Finger) {
                this.stopped = true;
            }
        }

        const first = new TestFingering();
        const second = new TestFingering();
        const finger: Finger = {
            pointerId: 1,
            position: { x: 0, y: 0 },
            buttons: 1,
            state: 'down',
            target: null,
        };

        manager.test(first, finger);
        manager.test(second, finger);

        expect(first.stopped).toBe(true);
        expect(manager.getActive()).toBe(second);
    });

    it('should not replace fingering when defer returns false', () => {
        const manager = new FingerManager();

        class DeferFingering extends Fingering {
            start(_f: Finger) {
                return true;
            }
            update(_f: Finger) {
                return true;
            }
            stop(_f: Finger) {}
            defer(_f: Finger): boolean {
                return false;
            }
        }

        class NextFingering extends Fingering {
            start(_f: Finger) {
                return true;
            }
            update(_f: Finger) {
                return true;
            }
            stop(_f: Finger) {}
        }

        const blocking = new DeferFingering();
        const next = new NextFingering();
        const finger: Finger = {
            pointerId: 1,
            position: { x: 0, y: 0 },
            buttons: 1,
            state: 'down',
            target: null,
        };

        manager.test(blocking, finger);
        const result = manager.test(next, finger);

        expect(result).toBe(false);
        expect(manager.getActive()).toBe(blocking);
    });
});

describe('LayoutContainer', () => {
    it('should mark dirty and trigger doLayout on onPreRender', () => {
        const mockGraph = {
            nodes: new Map(),
            edges: new Map(),
            on: vi.fn(),
            getNodes: () => [],
            getEdges: () => [],
        };
        const mockEvents = { emit: vi.fn() };

        let layoutCalled = false;
        class TestLayout extends LayoutContainer {
            protected doLayout(_dt: number): void {
                layoutCalled = true;
            }
        }

        const container = new TestLayout(mockGraph as any, mockEvents as any);
        container.markDirty();
        container.onPreRender(0.016);
        expect(layoutCalled).toBe(true);
    });

    it('should not call doLayout when not dirty', () => {
        const mockGraph = {
            nodes: new Map(),
            edges: new Map(),
            on: vi.fn(),
            getNodes: () => [],
            getEdges: () => [],
        };
        const mockEvents = { emit: vi.fn() };

        let layoutCalled = false;
        class TestLayout extends LayoutContainer {
            protected doLayout(_dt: number): void {
                layoutCalled = true;
            }
        }

        const container = new TestLayout(mockGraph as any, mockEvents as any);
        container.onPreRender(0.016);
        expect(layoutCalled).toBe(false);
    });
});

describe('SurfaceTransform', () => {
    it('should transform world to local and back for parent', () => {
        const parent = new THREE.Object3D();
        parent.position.set(100, 50, 0);
        parent.rotation.z = Math.PI / 4;

        const transform = createParentTransform(parent);
        const world = new THREE.Vector3(200, 150, 0);
        const local = transform.worldToLocal(world);
        const back = transform.localToWorld(local);

        expect(back.x).toBeCloseTo(world.x, 5);
        expect(back.y).toBeCloseTo(world.y, 5);
    });

    it('should return identity transform for null parent', () => {
        const transform = createParentTransform(null);
        const vec = new THREE.Vector3(100, 200, 300);
        const local = transform.worldToLocal(vec);
        expect(local.x).toBe(100);
        expect(local.y).toBe(200);
        expect(local.z).toBe(300);
    });
});

describe('Surface', () => {
    it('should traverse ancestors', () => {
        const root = new TestSurface();
        const child = new TestSurface();
        const grandchild = new TestSurface();

        child.parent = root;
        grandchild.parent = child;

        const ancestors = grandchild.ancestors();
        expect(ancestors).toHaveLength(2);
        expect(ancestors[0]).toBe(child);
        expect(ancestors[1]).toBe(root);
    });

    it('should traverse descendants', () => {
        const root = new TestSurface();
        const child1 = new TestSurface();
        const child2 = new TestSurface();
        const grandchild = new TestSurface();

        root.children = [child1, child2];
        child1.children = [grandchild];

        const descendants = root.descendants();
        expect(descendants).toHaveLength(3);
    });

    it('should find parent by predicate', () => {
        const root = new TestSurface();
        const child = new TestSurface();
        const grandchild = new TestSurface();

        child.parent = root;
        grandchild.parent = child;

        const found = grandchild.findParent((s) => s === root);
        expect(found).toBe(root);

        const notFound = grandchild.findParent((s) => false);
        expect(notFound).toBeNull();
    });

    it('should return self when no parent', () => {
        const surface = new TestSurface();
        expect(surface.parentOrSelf()).toBe(surface);
    });
});

describe('HoverOverlay', () => {
    it('should show target on pointerenter after delay', async () => {
        const source = new TestSurface();
        const target = new TestSurface();
        let built = false;

        const overlay = new HoverOverlay(
            source,
            () => {
                built = true;
                return target;
            },
            { delay: 10 },
        );

        source.emit('pointerenter', { surface: source });
        expect(built).toBe(false);

        await new Promise((r) => setTimeout(r, 20));
        expect(built).toBe(true);

        overlay.dispose();
    });

    it('should hide target on pointerleave', async () => {
        const source = new TestSurface();
        const target = new TestSurface();
        let started = false;
        let stopped = false;
        let deleted = false;

        const origStart = target.start.bind(target);
        const origStop = target.stop.bind(target);
        const origDelete = target.delete.bind(target);
        target.start = () => {
            started = true;
            origStart();
        };
        target.stop = () => {
            stopped = true;
            origStop();
        };
        target.delete = () => {
            deleted = true;
            origDelete();
        };

        const overlay = new HoverOverlay(source, () => target, { delay: 0 });

        source.emit('pointerenter', { surface: source });
        await new Promise((r) => setTimeout(r, 5));
        expect(started).toBe(true);

        source.emit('pointerleave', { surface: source });
        expect(stopped).toBe(true);
        expect(deleted).toBe(true);

        overlay.dispose();
    });
});

describe('Wire', () => {
    it('should send data and trigger pulse', () => {
        const mockSg = createMockSpaceGraph();
        const source = new TestNode();
        const target = new TestNode();

        (globalThis as any).__SG_Wire = Wire;

        const portSource = new (class extends TestNode {
            private _connections: Wire[] = [];
            connect(t: any) {
                const w = new Wire(this as any, t);
                this._connections.push(w);
                return w;
            }
        })();
        const portTarget = new (class extends TestNode {
            private _onReceive: ((w: Wire, d: any) => void) | null = null;
            listen(cb: (w: Wire, d: any) => void) {
                this._onReceive = cb;
                return this;
            }
            getReceiveHandler() {
                return this._onReceive;
            }
            disconnect(_w: Wire) {}
        })();

        let received = false;
        portTarget.listen(() => {
            received = true;
        });

        const wire = new Wire(portSource as any, portTarget as any);
        wire.send('test-data');
        expect(received).toBe(true);
        expect(wire.getActivity(performance.now(), 2000)).toBeGreaterThan(0);
    });
});

describe('Node children', () => {
    it('should have children array on Node', () => {
        const node = new TestNode();
        expect(Array.isArray(node.children)).toBe(true);
        expect(node.children).toHaveLength(0);
    });
});

describe('isTouchable', () => {
    it('should default to true', () => {
        const node = new TestNode();
        expect(node.isTouchable).toBe(true);
    });
});

describe('isDraggable', () => {
    it('should default to true', () => {
        const node = new TestNode();
        expect(node.isDraggable(new THREE.Vector3())).toBe(true);
    });
});
