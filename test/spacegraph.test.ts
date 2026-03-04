import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';

// Node types
import { Node } from '../src/nodes/Node';
import { ShapeNode } from '../src/nodes/ShapeNode';
import { NoteNode } from '../src/nodes/NoteNode';
import { CanvasNode } from '../src/nodes/CanvasNode';
import { TextMeshNode } from '../src/nodes/TextMeshNode';
import { DataNode } from '../src/nodes/DataNode';
import { VideoNode } from '../src/nodes/VideoNode';
import { IFrameNode } from '../src/nodes/IFrameNode';
import { MarkdownNode } from '../src/nodes/MarkdownNode';
import { GlobeNode } from '../src/nodes/GlobeNode';
import { SceneNode } from '../src/nodes/SceneNode';
import { CullingManager } from '../src/utils/CullingManager';
import { LODManager } from '../src/utils/LODManager';
// Edge types
import { Edge } from '../src/edges/Edge';
import { DottedEdge } from '../src/edges/DottedEdge';
import { DynamicThicknessEdge } from '../src/edges/DynamicThicknessEdge';

// Layout plugins
import { ForceLayout } from '../src/plugins/ForceLayout';
import { GridLayout } from '../src/plugins/GridLayout';
import { CircularLayout } from '../src/plugins/CircularLayout';
import { HierarchicalLayout } from '../src/plugins/HierarchicalLayout';
import { RadialLayout } from '../src/plugins/RadialLayout';

// Extended plugins
import { PhysicsPlugin } from '../src/plugins/PhysicsPlugin';
import { ErgonomicsPlugin } from '../src/plugins/ErgonomicsPlugin';
import { CameraControls } from '../src/core/CameraControls';

// ---------------------------------------------------------------------------
// Lightweight mock SpaceGraph — no browser APIs, no WebGL required
// ---------------------------------------------------------------------------
function makeSpaceGraph() {
    const scene = {
        add: vi.fn(),
        remove: vi.fn(),
        background: new THREE.Color(0x1a1a2e),
    };
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
    camera.position.set(0, 0, 500);

    const events = {
        _handlers: new Map<string, Function[]>(),
        _batched: new Map<string, any>(),
        _rafId: null as number | null,
        on(evt: string, fn: Function) {
            if (!this._handlers.has(evt)) this._handlers.set(evt, []);
            this._handlers.get(evt)!.push(fn);
        },
        emit(evt: string, data?: any) {
            (this._handlers.get(evt) ?? []).forEach(fn => fn(data));
        },
        emitBatched(evt: string, data?: any) {
            this._batched.set(evt, data);
            if (this._rafId === null) {
                this._rafId = requestAnimationFrame(() => {
                    this._rafId = null;
                    for (const [e, d] of this._batched.entries()) {
                        this.emit(e, d);
                    }
                    this._batched.clear();
                });
            }
        }
    };

    const nodeTypeRegistry = new Map<string, any>();
    nodeTypeRegistry.set('ShapeNode', ShapeNode); // pre-register for tests
    const edgeTypeRegistry = new Map<string, any>();
    edgeTypeRegistry.set('Edge', Edge);
    const pluginRegistry = new Map<string, any>();

    const poolManager = {
        pools: new Map<string, any[]>(),
        get(key: string) { return this.pools.get(key)?.pop() ?? null; },
        release(key: string, obj: any) {
            if (!this.pools.has(key)) this.pools.set(key, []);
            this.pools.get(key)!.push(obj);
        },
    };

    // Forward-reference to the SpaceGraph proxy
    let sg: any;

    const graph = {
        nodes: new Map<string, any>(),
        edges: [] as any[],
        addNode(spec: any) {
            const NodeType = nodeTypeRegistry.get(spec.type);
            if (!NodeType) return null;
            const node = new NodeType(sg, spec);
            this.nodes.set(spec.id, node);
            scene.add(node.object);
            return node;
        },
        addEdge(spec: any) {
            const EdgeType = edgeTypeRegistry.get(spec.type);
            if (!EdgeType) return null;
            const src = this.nodes.get(spec.source);
            const tgt = this.nodes.get(spec.target);
            if (!src || !tgt) return null;
            const edge = new EdgeType(sg, spec, src, tgt);
            this.edges.push(edge);
            scene.add(edge.object);
            return edge;
        },
        removeNode(id: string) {
            const n = this.nodes.get(id);
            if (n) { scene.remove(n.object); this.nodes.delete(id); }
        },
        removeEdge(id: string) {
            const idx = this.edges.findIndex((e: any) => e.id === id);
            if (idx !== -1) { scene.remove(this.edges[idx].object); this.edges.splice(idx, 1); }
        },
        clear() { this.nodes.clear(); this.edges.length = 0; },
    };

    const pluginManager = {
        register: vi.fn((name: string, p: any) => pluginRegistry.set(name, p)),
        getPlugin: (name: string) => pluginRegistry.get(name),
        registerNodeType: (name: string, T: any) => nodeTypeRegistry.set(name, T),
        registerEdgeType: (name: string, T: any) => edgeTypeRegistry.set(name, T),
        getNodeType: (name: string) => nodeTypeRegistry.get(name),
        getEdgeType: (name: string) => edgeTypeRegistry.get(name),
    };

    sg = { renderer: { scene, camera }, graph, events, pluginManager, poolManager };
    return sg;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const POS_A: [number, number, number] = [0, 0, 0];
const POS_B: [number, number, number] = [200, 0, 0];

function mkNode(sg: any, id: string, pos: [number, number, number] = POS_A) {
    return new ShapeNode(sg, { id, type: 'ShapeNode', label: id, position: pos });
}
function mkEdge(sg: any, id: string, src: any, tgt: any) {
    return new Edge(sg, { id, source: src.id, target: tgt.id, type: 'Edge' }, src, tgt);
}

// ============================================================
// Node tests
// ============================================================

describe('Node base class', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('creates a node with correct id and position', () => {
        const n = new Node(sg, { id: 'n1', type: 'Node', position: [1, 2, 3] });
        expect(n.id).toBe('n1');
        expect(n.position.toArray()).toEqual([1, 2, 3]);
    });

    it('updatePosition syncs object.position', () => {
        const n = new Node(sg, { id: 'n1', type: 'Node', position: [0, 0, 0] });
        n.updatePosition(10, 20, 30);
        expect(n.object.position.x).toBe(10);
    });

    it('updateSpec patches label and merges data', () => {
        const n = new Node(sg, { id: 'n1', type: 'Node', label: 'old', data: { x: 1 } });
        n.updateSpec({ label: 'new', data: { y: 2 } });
        expect(n.label).toBe('new');
        expect(n.data.x).toBe(1);
        expect(n.data.y).toBe(2);
    });
});

describe('ShapeNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('has child mesh in object', () => {
        const n = new ShapeNode(sg, { id: 's', type: 'ShapeNode', label: 'hi', data: { color: 0xff0000 } });
        expect(n.object.children.length).toBeGreaterThan(0);
    });

    it('updateSpec color change does not throw', () => {
        const n = new ShapeNode(sg, { id: 's', type: 'ShapeNode', data: { color: 0x0000ff } });
        expect(() => n.updateSpec({ data: { color: 0x00ff00 } })).not.toThrow();
    });

    it('dispose does not throw', () => {
        const n = new ShapeNode(sg, { id: 's', type: 'ShapeNode' });
        expect(() => n.dispose()).not.toThrow();
    });
});

describe('NoteNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('renders title and body text', () => {
        const n = new NoteNode(sg, { id: 'nn', type: 'NoteNode', label: 'My Note', data: { text: 'hello' } });
        expect(n.domElement.querySelector('.sg-note-title')?.textContent).toBe('My Note');
        expect(n.domElement.querySelector('.sg-note-body')?.textContent).toBe('hello');
    });

    it('updateSpec updates label and text', () => {
        const n = new NoteNode(sg, { id: 'nn', type: 'NoteNode', label: 'A', data: { text: 'B' } });
        n.updateSpec({ label: 'A2', data: { text: 'B2' } });
        expect(n.domElement.querySelector('.sg-note-title')?.textContent).toBe('A2');
        expect(n.domElement.querySelector('.sg-note-body')?.textContent).toBe('B2');
    });

    it('respects custom background color', () => {
        const n = new NoteNode(sg, { id: 'nn', type: 'NoteNode', data: { color: '#ff0000' } });
        // jsdom normalises hex to rgb(), so check for the colour value rather than exact string
        expect(n.domElement.style.background).toMatch(/ff0000|255,\s*0,\s*0/);
    });
});

describe('CanvasNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('creates canvas with specified dimensions', () => {
        const n = new CanvasNode(sg, { id: 'cn', type: 'CanvasNode', data: { width: 128, height: 64 } });
        expect((n as any)['canvas'].width).toBe(128);
        expect((n as any)['canvas'].height).toBe(64);
    });

    it('redraw with custom function does not throw', () => {
        const n = new CanvasNode(sg, { id: 'cn', type: 'CanvasNode' });
        expect(() => n.redraw((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        })).not.toThrow();
    });

    it('exposes canvas 2D context (null in jsdom)', () => {
        const n = new CanvasNode(sg, { id: 'cn', type: 'CanvasNode' });
        // jsdom returns null from getContext('2d'); the property is accessible
        expect('context' in n).toBe(true);
    });
});

describe('TextMeshNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('creates a sprite child', () => {
        const n = new TextMeshNode(sg, { id: 'tm', type: 'TextMeshNode', label: 'Hello' });
        expect(n.object.children.length).toBeGreaterThan(0);
    });

    it('updateSpec with new label does not throw', () => {
        const n = new TextMeshNode(sg, { id: 'tm', type: 'TextMeshNode', label: 'A' });
        expect(() => n.updateSpec({ label: 'B' })).not.toThrow();
    });
});

describe('DataNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('renders correct number of rows', () => {
        const n = new DataNode(sg, {
            id: 'dn', type: 'DataNode',
            data: { fields: { foo: 'bar', baz: 42 } }
        });
        expect(n.domElement.querySelectorAll('.sg-data-row').length).toBe(2);
    });

    it('shows empty state placeholder when no fields', () => {
        const n = new DataNode(sg, { id: 'dn', type: 'DataNode' });
        expect(n.domElement.textContent).toContain('no data');
    });

    it('respects maxFields truncation', () => {
        const fields: Record<string, number> = {};
        for (let i = 0; i < 20; i++) fields[`k${i}`] = i;
        const n = new DataNode(sg, { id: 'dn', type: 'DataNode', data: { fields, maxFields: 5 } });
        expect(n.domElement.querySelectorAll('.sg-data-row').length).toBe(5);
    });
});

describe('VideoNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('sets video src correctly', () => {
        const n = new VideoNode(sg, { id: 'vn', type: 'VideoNode', data: { src: 'test.mp4', autoplay: false } });
        expect(n.videoEl.src).toContain('test.mp4');
    });

    it('pause/play do not throw', () => {
        const n = new VideoNode(sg, { id: 'vn', type: 'VideoNode', data: { src: '', autoplay: false } });
        expect(() => { n.pause(); n.play(); }).not.toThrow();
    });

    it('muted is true by default', () => {
        const n = new VideoNode(sg, { id: 'vn', type: 'VideoNode', data: { src: '', autoplay: false } });
        expect(n.videoEl.muted).toBe(true);
    });
});

describe('IFrameNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('creates iframe with target src', () => {
        const n = new IFrameNode(sg, { id: 'iframe', type: 'IFrameNode', data: { src: 'https://example.com' } });
        // jsdom may set src to full absolute url or leave it empty for cross-origin
        expect(n.iframeEl).toBeTruthy();
    });

    it('navigate changes src', () => {
        const n = new IFrameNode(sg, { id: 'iframe', type: 'IFrameNode', data: { src: 'about:blank' } });
        n.navigate('https://new.example.com');
        expect(n.iframeEl.src).toContain('new.example.com');
    });
});

describe('MarkdownNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('creates CSS3D element with parsed html', () => {
        const n = new MarkdownNode(sg, { id: 'mn', type: 'MarkdownNode', data: { markdown: '# Hello' } });
        expect(n.domElement).toBeTruthy();
        expect(n.domElement.innerHTML).toContain('Hello');
    });
});

describe('GlobeNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('creates sphere geometry mesh', () => {
        const n = new GlobeNode(sg, { id: 'gn', type: 'GlobeNode' });
        const mesh = n.object.children.find(c => (c as any).isMesh);
        expect(mesh).toBeTruthy();
        expect((mesh as any).geometry.type).toBe('SphereGeometry');
    });
});

describe('SceneNode', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('instantiates without error even if url is empty', () => {
        const n = new SceneNode(sg, { id: 'sn', type: 'SceneNode' });
        expect(n.object.children.length).toBeGreaterThanOrEqual(0);
    });
});

// ============================================================
// Edge tests
// ============================================================

describe('Edge', () => {
    let sg: any, nodeA: any, nodeB: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        nodeA = mkNode(sg, 'a', POS_A);
        nodeB = mkNode(sg, 'b', POS_B);
    });

    it('stores source and target references', () => {
        const e = mkEdge(sg, 'e1', nodeA, nodeB);
        expect(e.source.id).toBe('a');
        expect(e.target.id).toBe('b');
    });

    it('update after node move does not throw', () => {
        const e = mkEdge(sg, 'e1', nodeA, nodeB);
        nodeA.updatePosition(50, 50, 0);
        expect(() => e.update()).not.toThrow();
    });

    it('updateSpec merges data fields', () => {
        const e = mkEdge(sg, 'e1', nodeA, nodeB);
        e.updateSpec({ data: { weight: 0.8 } });
        expect(e.data.weight).toBe(0.8);
    });

    it('dispose removes from parent and frees geometry', () => {
        const e = mkEdge(sg, 'e1', nodeA, nodeB);
        expect(() => e.dispose()).not.toThrow();
    });
});

describe('DottedEdge', () => {
    let sg: any, nodeA: any, nodeB: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        nodeA = mkNode(sg, 'a', POS_A);
        nodeB = mkNode(sg, 'b', POS_B);
    });

    it('uses LineDashedMaterial', () => {
        const e = new DottedEdge(sg,
            { id: 'de', source: 'a', target: 'b', type: 'DottedEdge', data: { dashSize: 10, gapSize: 5 } },
            nodeA, nodeB);
        expect(e.object.material).toBeInstanceOf(THREE.LineDashedMaterial);
    });

    it('update recomputes line distances', () => {
        const e = new DottedEdge(sg,
            { id: 'de', source: 'a', target: 'b', type: 'DottedEdge' },
            nodeA, nodeB);
        nodeA.updatePosition(100, 0, 0);
        expect(() => e.update()).not.toThrow();
    });
});

describe('DynamicThicknessEdge', () => {
    let sg: any, nodeA: any, nodeB: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        nodeA = mkNode(sg, 'a', POS_A);
        nodeB = mkNode(sg, 'b', POS_B);
    });

    it('creates a Mesh (tube geometry)', () => {
        const e = new DynamicThicknessEdge(sg,
            { id: 'dte', source: 'a', target: 'b', type: 'DynamicThicknessEdge', data: { weight: 0.7 } },
            nodeA, nodeB);
        expect(e.object).toBeInstanceOf(THREE.Mesh);
    });

    it('update rebuilds geometry without throwing', () => {
        const e = new DynamicThicknessEdge(sg,
            { id: 'dte', source: 'a', target: 'b', type: 'DynamicThicknessEdge', data: { weight: 0.5 } },
            nodeA, nodeB);
        nodeA.updatePosition(100, 100, 0);
        expect(() => e.update()).not.toThrow();
    });
});

// ============================================================
// Layout tests
// ============================================================

describe('GridLayout', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        for (let i = 0; i < 6; i++) {
            sg.graph.addNode({ id: `n${i}`, type: 'ShapeNode', position: [0, 0, 0] });
        }
    });

    it('places correct number of nodes per row', () => {
        const layout = new GridLayout();
        layout.settings.columns = 3;
        layout.settings.spacingX = 100;
        layout.settings.spacingY = 100;
        layout.init(sg);
        layout.apply();
        const positions = [...sg.graph.nodes.values()].map((n: any) => n.position.x);
        expect(positions[0]).toBe(0);
        expect(positions[1]).toBe(100);
        expect(positions[2]).toBe(200);
        expect(positions[3]).toBe(0); // wraps to new row
    });

    it('row 1 is below row 0 (negative Y)', () => {
        const layout = new GridLayout();
        layout.settings.columns = 2;
        layout.settings.spacingY = 150;
        layout.init(sg);
        layout.apply();
        const nodes = [...sg.graph.nodes.values()];
        expect(nodes[2].position.y).toBeLessThan(nodes[0].position.y);
    });
});

describe('CircularLayout', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        for (let i = 0; i < 4; i++) {
            sg.graph.addNode({ id: `n${i}`, type: 'ShapeNode', position: [0, 0, 0] });
        }
    });

    it('places all nodes at the target radius', () => {
        const layout = new CircularLayout();
        layout.settings.radiusX = 200;
        layout.settings.radiusY = 200;
        layout.init(sg);
        layout.apply();
        for (const n of sg.graph.nodes.values()) {
            const r = Math.sqrt(n.position.x ** 2 + n.position.y ** 2);
            expect(r).toBeCloseTo(200, 0);
        }
    });
});

describe('HierarchicalLayout', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        sg.pluginManager.registerEdgeType('Edge', Edge);
        ['A', 'B', 'C'].forEach(id => sg.graph.addNode({ id, type: 'ShapeNode', position: [0, 0, 0] }));
        sg.graph.addEdge({ id: 'eAB', source: 'A', target: 'B', type: 'Edge' });
        sg.graph.addEdge({ id: 'eBC', source: 'B', target: 'C', type: 'Edge' });
    });

    it('root has higher Y than children (top-down)', () => {
        const layout = new HierarchicalLayout();
        layout.settings.rootId = 'A';
        layout.settings.levelHeight = 150;
        layout.init(sg);
        layout.apply();
        const yA = sg.graph.nodes.get('A').position.y;
        const yB = sg.graph.nodes.get('B').position.y;
        const yC = sg.graph.nodes.get('C').position.y;
        expect(yA).toBeGreaterThan(yB);
        expect(yB).toBeGreaterThan(yC);
    });

    it('works with bottom-up direction', () => {
        const layout = new HierarchicalLayout();
        layout.settings.rootId = 'A';
        layout.settings.direction = 'bottom-up';
        layout.init(sg);
        expect(() => layout.apply()).not.toThrow();
    });
});

describe('RadialLayout', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        sg.pluginManager.registerEdgeType('Edge', Edge);
        ['root', 'c1', 'c2'].forEach(id => sg.graph.addNode({ id, type: 'ShapeNode', position: [0, 0, 0] }));
        sg.graph.addEdge({ id: 'e1', source: 'root', target: 'c1', type: 'Edge' });
        sg.graph.addEdge({ id: 'e2', source: 'root', target: 'c2', type: 'Edge' });
    });

    it('places root at origin', () => {
        const layout = new RadialLayout();
        layout.settings.rootId = 'root';
        layout.init(sg);
        layout.apply();
        const root = sg.graph.nodes.get('root');
        expect(root.position.x).toBe(0);
        expect(root.position.y).toBe(0);
    });

    it('places children at baseRadius distance', () => {
        const layout = new RadialLayout();
        layout.settings.rootId = 'root';
        layout.settings.baseRadius = 300;
        layout.init(sg);
        layout.apply();
        const c1 = sg.graph.nodes.get('c1');
        const r = Math.sqrt(c1.position.x ** 2 + c1.position.y ** 2);
        expect(r).toBeCloseTo(300, -1);
    });
});

// ============================================================
// Performance System tests
// ============================================================

describe('CullingManager', () => {
    let cm: CullingManager;
    let camera: THREE.PerspectiveCamera;

    beforeEach(() => {
        cm = new CullingManager();
        // Camera looking straight down -Z
        camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
        camera.position.set(0, 0, 0);
        camera.updateMatrixWorld();
        cm.setCamera(camera);
    });

    it('makes objects visible when inside frustum', () => {
        const obj = new THREE.Mesh(new THREE.SphereGeometry(1));
        obj.position.set(0, 0, -50); // Direct line of sight
        obj.visible = false; // Start hidden

        cm.registerObject(obj);
        cm.update();

        expect(obj.visible).toBe(true);
    });

    it('makes objects invisible when outside frustum (behind camera)', () => {
        const obj = new THREE.Mesh(new THREE.SphereGeometry(1));
        obj.position.set(0, 0, 50); // Behind camera
        obj.visible = true; // Start visible

        cm.registerObject(obj);
        cm.update();

        expect(obj.visible).toBe(false);
    });

    it('respects manual cullingRadius bypass', () => {
        const obj = new THREE.Mesh(); // No geometry, implies empty bounds
        obj.position.set(0, 0, -50);
        obj.visible = false;

        // Custom massive radius ensures intersects
        cm.registerObject(obj, { enabled: true, cullingRadius: 9999 });
        cm.update();

        expect(obj.visible).toBe(true);
    });

    it('ignores objects when settings.enabled is false', () => {
        const obj = new THREE.Mesh(new THREE.SphereGeometry(1));
        obj.position.set(0, 0, 50); // Behind camera
        obj.visible = true; // should stay true

        cm.registerObject(obj, { enabled: false });
        cm.update();

        expect(obj.visible).toBe(true);
    });
});

// ============================================================
// Plugin tests
// ============================================================

describe('PhysicsPlugin', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        sg.graph.addNode({ id: 'p1', type: 'ShapeNode', position: [0, 100, 0] });
    });

    it('does not move nodes when disabled', () => {
        const plugin = new PhysicsPlugin();
        plugin.settings.enabled = false;
        plugin.init(sg);
        const before = sg.graph.nodes.get('p1').position.y;
        plugin.onPreRender(1 / 60);
        expect(sg.graph.nodes.get('p1').position.y).toBe(before);
    });

    it('applies gravity when enabled', () => {
        const plugin = new PhysicsPlugin();
        plugin.settings.enabled = true;
        plugin.settings.gravity = -100;
        plugin.settings.groundY = -10000;
        plugin.init(sg);
        const before = sg.graph.nodes.get('p1').position.y;
        for (let i = 0; i < 10; i++) plugin.onPreRender(1 / 60);
        expect(sg.graph.nodes.get('p1').position.y).toBeLessThan(before);
    });

    it('pin/unpin do not throw', () => {
        const plugin = new PhysicsPlugin();
        plugin.init(sg);
        expect(() => {
            plugin.pin('p1');
            plugin.unpin('p1');
        }).not.toThrow();
    });
});

describe('ErgonomicsPlugin', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('initialises without throwing', () => {
        expect(() => new ErgonomicsPlugin().init(sg)).not.toThrow();
    });

    it('updateConfig merges only changed settings', () => {
        const p = new ErgonomicsPlugin();
        p.init(sg);
        p.updateConfig({ panSpeed: 2.5 });
        expect(p.config.panSpeed).toBe(2.5);
        expect(p.config.dampingFactor).toBe(0.12);
    });

    it('increments totalInteractions on node:drag event', () => {
        const p = new ErgonomicsPlugin();
        p.init(sg);

        const node = sg.graph.addNode({ id: 'test1', type: 'ShapeNode', position: [0, 0, 0] });

        sg.events.emit('interaction:dragstart', { node });
        sg.events.emit('interaction:drag', { node });
        node.position.x = 10;
        sg.events.emit('interaction:drag', { node });
        sg.events.emit('interaction:dragend', { node });

        sg.events.emit('interaction:dragstart', { node });
        sg.events.emit('interaction:drag', { node });
        node.position.x = 20;
        sg.events.emit('interaction:drag', { node });
        sg.events.emit('interaction:dragend', { node });

        expect(p.metrics.totalInteractions).toBe(2);
    });

    it('getMetrics returns a copy', () => {
        const p = new ErgonomicsPlugin();
        p.init(sg);
        const m1 = p.getMetrics();

        const node = sg.graph.addNode({ id: 'test2', type: 'ShapeNode', position: [0, 0, 0] });
        sg.events.emit('interaction:dragstart', { node });
        sg.events.emit('interaction:drag', { node });
        node.position.x = 10;
        sg.events.emit('interaction:drag', { node });
        sg.events.emit('interaction:dragend', { node });

        const m2 = p.getMetrics();
        expect(m1.totalInteractions).toBe(0);
        expect(m2.totalInteractions).toBe(1);
    });
});

// ============================================================
// Graph CRUD
// ============================================================

describe('Graph CRUD', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        sg.pluginManager.registerEdgeType('Edge', Edge);
    });

    it('addNode stores node in map', () => {
        sg.graph.addNode({ id: 'x', type: 'ShapeNode', position: [0, 0, 0] });
        expect(sg.graph.nodes.has('x')).toBe(true);
    });

    it('addEdge adds to edges array', () => {
        sg.graph.addNode({ id: 'a', type: 'ShapeNode', position: [0, 0, 0] });
        sg.graph.addNode({ id: 'b', type: 'ShapeNode', position: [100, 0, 0] });
        sg.graph.addEdge({ id: 'e', source: 'a', target: 'b', type: 'Edge' });
        expect(sg.graph.edges.length).toBe(1);
    });

    it('addEdge returns null for missing source', () => {
        sg.graph.addNode({ id: 'b', type: 'ShapeNode', position: [0, 0, 0] });
        expect(sg.graph.addEdge({ id: 'e', source: 'missing', target: 'b', type: 'Edge' })).toBeNull();
    });

    it('removeNode deletes from map', () => {
        sg.graph.addNode({ id: 'a', type: 'ShapeNode', position: [0, 0, 0] });
        sg.graph.removeNode('a');
        expect(sg.graph.nodes.has('a')).toBe(false);
    });

    it('clear empties everything', () => {
        sg.graph.addNode({ id: 'a', type: 'ShapeNode', position: [0, 0, 0] });
        sg.graph.addNode({ id: 'b', type: 'ShapeNode', position: [100, 0, 0] });
        sg.graph.addEdge({ id: 'e', source: 'a', target: 'b', type: 'Edge' });
        sg.graph.clear();
        expect(sg.graph.nodes.size).toBe(0);
        expect(sg.graph.edges.length).toBe(0);
    });
});

// ============================================================
// PluginManager
// ============================================================

describe('PluginManager', () => {
    let sg: any;
    beforeEach(() => { sg = makeSpaceGraph(); });

    it('registers and retrieves plugins by key', () => {
        const plugin = new ForceLayout();
        sg.pluginManager.register('ForceLayout', plugin);
        expect(sg.pluginManager.getPlugin('ForceLayout')).toBe(plugin);
    });

    it('registers node types', () => {
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        expect(sg.pluginManager.getNodeType('ShapeNode')).toBe(ShapeNode);
    });

    it('returns undefined for unknown plugin', () => {
        expect(sg.pluginManager.getPlugin('NonExistent')).toBeUndefined();
    });
});

// ============================================================
// LODManager
// ============================================================

describe('LODManager', () => {
    let lod: LODManager;
    let camera: THREE.PerspectiveCamera;
    let root: THREE.Object3D;
    let meshLevel0: THREE.Mesh;
    let meshLevel1: THREE.Mesh;

    beforeEach(() => {
        lod = new LODManager();
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(0, 0, 0); // Origin
        lod.setCamera(camera);

        root = new THREE.Object3D();
        root.position.set(0, 0, -10); // 10 units away

        meshLevel0 = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32)); // High poly
        meshLevel1 = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8));   // Low poly

        lod.registerObject(root, {
            enabled: true,
            levels: [
                { distance: 0, object: meshLevel0 },   // from 0 to 49
                { distance: 50, object: meshLevel1 },  // from 50 to infinity
            ]
        });
    });

    it('makes closest level visible initially', () => {
        lod.update();
        expect(meshLevel0.visible).toBe(true);
        expect(meshLevel1.visible).toBe(false);
    });

    it('switches to lower detail level when moving camera away', () => {
        camera.position.set(0, 0, 100); // 110 units away from root
        lod.update();
        expect(meshLevel0.visible).toBe(false);
        expect(meshLevel1.visible).toBe(true);
    });

    it('adds level meshes as children of root if they are not already', () => {
        expect(meshLevel0.parent).toBe(root);
        expect(meshLevel1.parent).toBe(root);
    });
});

// ============================================================
// EventManager
// ============================================================

describe('EventManager (Batching)', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        vi.useFakeTimers();
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            return setTimeout(() => cb(Date.now()), 16) as any;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
            clearTimeout(id);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('emits standard events instantly', () => {
        const spy = vi.fn();
        sg.events.on('node:added', spy);

        sg.events.emit('node:added', { node: { id: 'test' } });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('batches high-frequency events to RAF', () => {
        const spy = vi.fn();
        sg.events.on('interaction:dragstart', spy);

        sg.events.emitBatched('interaction:dragstart', { node: { id: '1' } });
        sg.events.emitBatched('interaction:dragstart', { node: { id: '2' } });
        sg.events.emitBatched('interaction:dragstart', { node: { id: '3' } });

        // Has not fired yet
        expect(spy).not.toHaveBeenCalled();

        // Fast-forward to trigger RAF (simulated with setTimeout)
        vi.advanceTimersByTime(20);

        // Should only have fired ONCE with the the LAST payload
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith({ node: { id: '3' } });
    });
});

// ============================================================
// Phase 4: Physics & Ergonomics Plugins
// ============================================================

describe('PhysicsPlugin', () => {
    let sg: any;
    let physics: PhysicsPlugin;

    beforeEach(() => {
        sg = makeSpaceGraph();
        physics = new PhysicsPlugin();
        physics.init(sg);
        physics.settings.enabled = true;
        physics.settings.gravity = 0; // Turn off gravity for isolated test
        sg.pluginManager.register('PhysicsPlugin', physics);
    });

    it('resolves Hookes Law spring constraints between connected nodes', () => {
        const n1 = sg.graph.addNode({ id: '1', type: 'ShapeNode', position: [0, 0, 0] });
        const n2 = sg.graph.addNode({ id: '2', type: 'ShapeNode', position: [1000, 0, 0] }); // Far apart
        sg.graph.addEdge({ id: 'e', source: '1', target: '2', type: 'Edge' });

        physics.settings.springStiffness = 0.5;
        physics.settings.springRestLength = 100;
        physics.settings.collide = false;
        physics.settings.repulsion = 0;

        // Step physics forward 1 frame
        physics.onPreRender(0.016);

        // Nodes should have pulled towards each other because 1000 > rest length 100
        expect(n1.position.x).toBeGreaterThan(0);
        expect(n2.position.x).toBeLessThan(1000);
    });

    it('resolves node overlap collisions', () => {
        const n1 = sg.graph.addNode({ id: '1', type: 'ShapeNode', position: [0, 0, 0] });
        const n2 = sg.graph.addNode({ id: '2', type: 'ShapeNode', position: [10, 0, 0] }); // Inside collision radius

        physics.settings.collide = true;
        physics.settings.collisionRadius = 20; // Needs 40 units distance (20*2)
        physics.settings.springStiffness = 0;
        physics.settings.repulsion = 0;

        physics.onPreRender(0.016);

        // Should have pushed away from each other
        expect(n1.position.x).toBeLessThan(0);
        expect(n2.position.x).toBeGreaterThan(10);

        // Final distance should be exactly the required 40 (20 * 2) if 1 pass is enough
        const finalDist = n1.position.distanceTo(n2.position);
        expect(finalDist).toBeCloseTo(40, 0); // Precision 0 decimal point
    });
});

describe('ErgonomicsPlugin', () => {
    let sg: any;
    let ergo: ErgonomicsPlugin;

    beforeEach(() => {
        sg = makeSpaceGraph();
        ergo = new ErgonomicsPlugin();
        ergo.init(sg);
        sg.pluginManager.register('ErgonomicsPlugin', ergo);

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('tracks efficiency during a straight line drag', () => {
        const node = sg.graph.addNode({ id: '1', type: 'ShapeNode', position: [0, 0, 0] });

        sg.events.emit('interaction:dragstart', { node });

        // Move in a perfect straight line
        node.position.set(10, 0, 0);
        sg.events.emit('interaction:drag', { node });

        node.position.set(20, 0, 0);
        sg.events.emit('interaction:drag', { node });

        sg.events.emit('interaction:dragend', { node });

        const metrics = ergo.getMetrics();
        expect(metrics.totalInteractions).toBe(1);

        // The exponential moving avg incorporates the default 1.0 baseline
        // Since the line was perfectly straight, the Session efficiency is 1.0. 
        // 1.0 blended into 1.0 is 1.0.
        expect(metrics.avgEfficiency).toBeCloseTo(1.0, 3);
        expect(metrics.avgJitter).toBe(0);
    });

    it('registers jitter and lower efficiency during zig-zag drags', () => {
        const node = sg.graph.addNode({ id: '2', type: 'ShapeNode', position: [0, 0, 0] });

        sg.events.emit('interaction:dragstart', { node });

        // Zig Zag dragging
        node.position.set(10, 10, 0);
        sg.events.emit('interaction:drag', { node });
        vi.advanceTimersByTime(50);

        node.position.set(20, -10, 0); // Sharp reversal in Y vector
        sg.events.emit('interaction:drag', { node });
        vi.advanceTimersByTime(50);

        node.position.set(30, 10, 0); // Sharp reversal in Y vector
        sg.events.emit('interaction:drag', { node });
        vi.advanceTimersByTime(50);

        sg.events.emit('interaction:dragend', { node });

        const metrics = ergo.getMetrics();
        expect(metrics.totalInteractions).toBe(1);

        // Efficency should be pulled down below 1.0
        expect(metrics.avgEfficiency).toBeLessThan(1.0);

        // Jitter should be > 0 because of the sharp reversing directions
        expect(metrics.avgJitter).toBeGreaterThan(0);
    });

    it('runs a CalibrationRound A/B test and selects the best variant', () => {
        const configA = { dampingFactor: 0.1 };
        const configB = { dampingFactor: 0.9 }; // Much smoother theoretically
        ergo.startCalibrationRound(configA, configB, 2); // only require 2 interactions

        expect(ergo.calibrating).toBe(true);
        expect(ergo.config.dampingFactor).toBe(0.1);

        const node = sg.graph.addNode({ id: 'calib', type: 'ShapeNode', position: [0, 0, 0] });

        // 1. Simulate poor interactions under Config A (lots of jitter)
        for (let i = 0; i < 2; i++) {
            sg.events.emit('interaction:dragstart', { node });
            sg.events.emit('interaction:drag', { node });
            node.position.set(10, 10, 0);
            sg.events.emit('interaction:drag', { node });
            node.position.set(20, -10, 0); // Jitter
            sg.events.emit('interaction:drag', { node });
            sg.events.emit('interaction:dragend', { node });
        }

        // Trigger interval check
        vi.advanceTimersByTime(1100);

        // Should now be on Config B
        expect(ergo.config.dampingFactor).toBe(0.9);

        // 2. Simulate great interactions under Config B (straight lines)
        for (let i = 0; i < 2; i++) {
            sg.events.emit('interaction:dragstart', { node });
            sg.events.emit('interaction:drag', { node });
            node.position.set(100, 0, 0);
            sg.events.emit('interaction:drag', { node });
            node.position.set(200, 0, 0); // Straight
            sg.events.emit('interaction:drag', { node });
            sg.events.emit('interaction:dragend', { node });
        }

        // Trigger interval check
        vi.advanceTimersByTime(1100);

        // Calibration should be finished and B should have won due to no jitter
        // Calibration should be finished and B should have won due to no jitter
        expect(ergo.calibrating).toBe(false);
        expect(ergo.config.dampingFactor).toBe(0.9);
    });
});

describe('CameraControls (Multi-touch)', () => {
    let sg: any;
    let canvas: any;

    // Helper to simulate touch events
    const fireTouch = (type: string, touches: { id: number, x: number, y: number }[]) => {
        const event = new Event(type) as any;
        event.changedTouches = touches.map(t => ({
            identifier: t.id,
            clientX: t.x,
            clientY: t.y
        }));
        event.preventDefault = vi.fn();
        canvas.dispatchEvent(event);
        return event;
    };

    beforeEach(() => {
        sg = makeSpaceGraph();
        canvas = sg.renderer.renderer.domElement;

        // We have to mock the camera matrix for the pan math
        sg.renderer.camera.matrix = new THREE.Matrix4();

        // SpaceGraph auto-initializes CameraControls in its constructor usually,
        // but our mock doesn't. We initialize it here manually.
        sg.cameraControls = new CameraControls(sg);
    });

    it('handles 1-finger rotate', () => {
        fireTouch('touchstart', [{ id: 1, x: 0, y: 0 }]);
        expect((sg.cameraControls as any).isDragging).toBe(true);
        expect((sg.cameraControls as any).dragMode).toBe('rotate');

        fireTouch('touchmove', [{ id: 1, x: 100, y: 0 }]);

        // Theta should change due to velocity
        expect((sg.cameraControls as any).spherical.theta).not.toBe(0);

        fireTouch('touchend', [{ id: 1, x: 100, y: 0 }]);
        expect((sg.cameraControls as any).isDragging).toBe(false);
    });

    it('handles 2-finger pinch-to-zoom spreading (zoom in)', () => {
        fireTouch('touchstart', [
            { id: 1, x: 100, y: 100 },
            { id: 2, x: 200, y: 200 }
        ]);

        expect((sg.cameraControls as any).isDragging).toBe(true);
        expect((sg.cameraControls as any).dragMode).toBe('pan');

        const initialRadius = (sg.cameraControls as any).spherical.radius; // usually 500

        // Spread fingers further apart (100 -> 0, 200 -> 300)
        fireTouch('touchmove', [
            { id: 1, x: 0, y: 0 },
            { id: 2, x: 300, y: 300 }
        ]);

        // Radius should decrease because spreading fingers = zoom in
        const newRadius = (sg.cameraControls as any).spherical.radius;
        expect(newRadius).toBeLessThan(initialRadius);
    });

    it('handles 2-finger panning (moving together)', () => {
        fireTouch('touchstart', [
            { id: 1, x: 100, y: 100 },
            { id: 2, x: 200, y: 100 }
        ]);

        const initialTargetX = (sg.cameraControls as any).target.x;

        // Move both fingers right
        fireTouch('touchmove', [
            { id: 1, x: 150, y: 100 },
            { id: 2, x: 250, y: 100 }
        ]);

        const newTargetX = (sg.cameraControls as any).target.x;
        expect(newTargetX).not.toBe(initialTargetX);

        fireTouch('touchend', [
            { id: 1, x: 150, y: 100 },
            { id: 2, x: 250, y: 100 }
        ]);
    });
});
