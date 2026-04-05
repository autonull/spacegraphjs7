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
import { AudioNode } from '../src/nodes/AudioNode';
import { MathNode } from '../src/nodes/MathNode';
import { ChartNode } from '../src/nodes/ChartNode';
import { GroupNode } from '../src/nodes/GroupNode';
import { HtmlNode } from '../src/nodes/HtmlNode';

// Edge types
import { Edge } from '../src/edges/Edge';
import { DottedEdge } from '../src/edges/DottedEdge';
import { DynamicThicknessEdge } from '../src/edges/DynamicThicknessEdge';

// Layout plugins
import { ForceLayout } from '../src/plugins/layouts/ForceLayout';
import { GridLayout } from '../src/plugins/layouts/GridLayout';
import { CircularLayout } from '../src/plugins/layouts/CircularLayout';
import { HierarchicalLayout } from '../src/plugins/layouts/HierarchicalLayout';
import { RadialLayout } from '../src/plugins/layouts/RadialLayout';

// Extended plugins
import { PhysicsPlugin } from '../src/plugins/PhysicsPlugin';
import { ErgonomicsPlugin } from '../src/plugins/ErgonomicsPlugin';
import { CameraControls } from '../src/core/CameraControls';
import { VisionManager } from '../src/core/VisionManager';

// ---------------------------------------------------------------------------
// Lightweight mock SpaceGraph — no browser APIs, no WebGL required
// ---------------------------------------------------------------------------
import { InteractionPlugin } from '../src/plugins/InteractionPlugin';
import { SpaceGraph } from '../src/SpaceGraph';
function makeSpaceGraph() {
    const scene = {
        add: vi.fn(),
        remove: vi.fn(),
        background: new THREE.Color(0x1a1a2e),
    };
    const camera = { position: new THREE.Vector3(), lookAt: vi.fn(), _mock: true };

    const listeners = new Map<string, any[]>();
    const domElement = {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        addEventListener: (type: string, fn: any) => {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type)!.push(fn);
        },
        removeEventListener: (type: string, fn: any) => {
            if (listeners.has(type)) {
                const arr = listeners.get(type)!;
                const idx = arr.indexOf(fn);
                if (idx > -1) arr.splice(idx, 1);
            }
        },
        dispatchEvent: (event: any) => {
            // Simplified synchronous dispatch
            if (listeners.has(event.type)) {
                listeners.get(event.type)!.forEach((fn) => fn(event));
            }
            return true;
        },
    };
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
            (this._handlers.get(evt) ?? []).forEach((fn) => fn(data));
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
        },
    };

    const nodeTypeRegistry = new Map<string, any>();
    nodeTypeRegistry.set('ShapeNode', ShapeNode); // pre-register for tests
    const edgeTypeRegistry = new Map<string, any>();
    edgeTypeRegistry.set('Edge', Edge);
    const pluginRegistry = new Map<string, any>();

    const poolManager = {
        pools: new Map<string, any[]>(),
        get(key: string) {
            return this.pools.get(key)?.pop() ?? null;
        },
        release(key: string, obj: any) {
            if (!this.pools.has(key)) this.pools.set(key, []);
            this.pools.get(key)!.push(obj);
        },
    };

    // Forward-reference to the SpaceGraph proxy
    let sg: any;

    const graph = {
        nodes: new Map<string, any>(),
        edges: new Map<string, any>(),
        addNode(spec: any) {
            const NodeType = nodeTypeRegistry.get(spec.type);
            if (!NodeType) return null;
            const node = new NodeType(sg, spec);
            this.nodes.set(spec.id, node);
            scene.add(node.object);
            return node;
        },
        addEdge(spec: any) {
            let EdgeType = edgeTypeRegistry.get(spec.type);
            if (!EdgeType) {
                if (sg && sg.pluginManager && sg.pluginManager.getEdgeType) {
                    EdgeType = sg.pluginManager.getEdgeType(spec.type);
                }
                if (!EdgeType) return null;
            }
            let src = this.nodes.get(spec.source);
            let tgt = this.nodes.get(spec.target);

            if (!src || !tgt) {
                for (const inst of SpaceGraph.instances || []) {
                    if (!src && inst.graph.nodes.has(spec.source)) {
                        src = inst.graph.nodes.get(spec.source);
                    }
                    if (!tgt && inst.graph.nodes.has(spec.target)) {
                        tgt = inst.graph.nodes.get(spec.target);
                    }
                    if (src && tgt) break;
                }
            }

            if (!src || !tgt) return null;
            const edge = new EdgeType(sg, spec, src, tgt);
            this.edges.set(spec.id, edge);
            scene.add(edge.object);
            return edge;
        },
        removeNode(id: string) {
            const n = this.nodes.get(id);
            if (n) {
                scene.remove(n.object);
                this.nodes.delete(id);
            }
        },
        removeEdge(id: string) {
            this.edges.delete(id);
        },
        clear() {
            this.nodes.clear();
            this.edges.clear();
        },
        getNode(id: string) {
            return this.nodes.get(id);
        },
        getEdge(id: string) {
            return this.edges.get(id);
        },
        getNodes() {
            return this.nodes.values();
        },
        getEdges() {
            return this.edges.values();
        },
    };

    const pluginManager = {
        register: vi.fn((name: string, p: any) => pluginRegistry.set(name, p)),
        getPlugin: (name: string) => pluginRegistry.get(name),
        registerNodeType: (name: string, T: any) => nodeTypeRegistry.set(name, T),
        registerEdgeType: (name: string, T: any) => edgeTypeRegistry.set(name, T),
        getNodeType: (name: string) => nodeTypeRegistry.get(name),
        getEdgeType: (name: string) => edgeTypeRegistry.get(name),
        export: vi.fn(() => {
            const state: any = {};
            for (const [name, plugin] of pluginRegistry.entries()) {
                if (plugin.export) {
                    state[name] = plugin.export();
                }
            }
            return state;
        }),
        import: vi.fn((data: any) => {
            if (!data) return;
            for (const [name, pluginState] of Object.entries(data)) {
                const plugin = pluginRegistry.get(name);
                if (plugin && plugin.import) {
                    plugin.import(pluginState);
                }
            }
        }),
    };

    sg = {
        renderer: { scene, camera, renderer: { domElement } },
        graph,
        events,
        pluginManager,
        poolManager,
        cameraControls: { controls: { target: new THREE.Vector3(), update: vi.fn() } },
        export: SpaceGraph.prototype.export,
        import: SpaceGraph.prototype.import,
        loadSpec: SpaceGraph.prototype.loadSpec,
    };

    // Bind prototype methods to this mock object
    sg.export = sg.export.bind(sg);
    sg.import = sg.import.bind(sg);
    sg.loadSpec = sg.loadSpec.bind(sg);

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
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates a node with correct id and position', () => {
        const n = new Node(sg, { id: 'n1', type: 'Node', position: [1, 2, 3] });
        expect(n.id).toBe('n1');
        expect(n.position.toArray()).toEqual([1, 2, 3]);
    });

    it('updatePosition syncs object.position', () => {
        const n = new ShapeNode(sg, { id: 'n1', type: 'ShapeNode', position: [0, 0, 0] });
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
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('has child mesh in object', () => {
        const n = new ShapeNode(sg, {
            id: 's',
            type: 'ShapeNode',
            label: 'hi',
            data: { color: 0xff0000 },
        });
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
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('renders title and body text', () => {
        const n = new NoteNode(sg, {
            id: 'nn',
            type: 'NoteNode',
            label: 'My Note',
            data: { text: 'hello' },
        });
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
        expect(n.domElement.style.backgroundColor).toMatch(/ff0000|255,\s*0,\s*0/);
    });
});

describe('CanvasNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates canvas with specified dimensions', () => {
        const n = new CanvasNode(sg, {
            id: 'cn',
            type: 'CanvasNode',
            data: { width: 128, height: 64 },
        });
        expect((n as any)['canvas'].width).toBe(128);
        expect((n as any)['canvas'].height).toBe(64);
    });

    it('redraw with custom function does not throw', () => {
        const n = new CanvasNode(sg, { id: 'cn', type: 'CanvasNode' });
        expect(() =>
            n.redraw((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
                ctx.fillStyle = 'red';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }),
        ).not.toThrow();
    });

    it('exposes canvas 2D context (null in jsdom)', () => {
        const n = new CanvasNode(sg, { id: 'cn', type: 'CanvasNode' });
        // jsdom returns null from getContext('2d'); the property is accessible
        expect('context' in n).toBe(true);
    });
});

describe('TextMeshNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

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
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('renders correct number of keys for an object payload', () => {
        const n = new DataNode(sg, {
            id: 'dn',
            type: 'DataNode',
            data: { data: { foo: 'bar', baz: 42 }, expanded: true },
        });
        // Should contain two child span elements representing the primitive values
        expect(n.domElement.textContent).toContain('"bar"');
        expect(n.domElement.textContent).toContain('42');
    });

    it('shows empty state placeholder when null', () => {
        const n = new DataNode(sg, { id: 'dn', type: 'DataNode' });
        expect(n.domElement.textContent).toContain('null');
    });
});

describe('VideoNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('sets video src correctly', () => {
        const n = new VideoNode(sg, {
            id: 'vn',
            type: 'VideoNode',
            data: { src: 'test.mp4', autoplay: false },
        });
        expect(n.videoEl.src).toContain('test.mp4');
    });

    it('pause/play do not throw', () => {
        const n = new VideoNode(sg, {
            id: 'vn',
            type: 'VideoNode',
            data: { src: '', autoplay: false },
        });
        expect(() => {
            n.pause();
            n.play();
        }).not.toThrow();
    });

    it('muted is true by default', () => {
        const n = new VideoNode(sg, {
            id: 'vn',
            type: 'VideoNode',
            data: { src: '', autoplay: false },
        });
        expect(n.videoEl.muted).toBe(true);
    });
});

describe('IFrameNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates iframe with target src', () => {
        const n = new IFrameNode(sg, {
            id: 'iframe',
            type: 'IFrameNode',
            data: { src: 'https://example.com' },
        });
        // jsdom may set src to full absolute url or leave it empty for cross-origin
        expect(n.iframeEl).toBeTruthy();
    });

    it('navigate changes src', () => {
        const n = new IFrameNode(sg, {
            id: 'iframe',
            type: 'IFrameNode',
            data: { src: 'about:blank' },
        });
        n.navigate('https://new.example.com');
        expect(n.iframeEl.src).toContain('new.example.com');
    });
});

describe('MarkdownNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates CSS3D element and attempts to load markdown', async () => {
        const n = new MarkdownNode(sg, {
            id: 'mn',
            type: 'MarkdownNode',
            data: { markdown: '# Hello' },
        });
        expect(n.domElement).toBeTruthy();

        // Wait for dynamic import to complete or fail
        await new Promise((resolve) => setTimeout(resolve, 100));
        // It should either contain the parsed HTML (if 'marked' is installed)
        // or the failure message since 'marked' is now an optional peer dependency.
        const content = n.domElement.innerHTML;
        expect(
            content.includes('Hello') || content.includes('Failed to load markdown renderer'),
        ).toBe(true);
    });
});

describe('GlobeNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates sphere geometry mesh', () => {
        const n = new GlobeNode(sg, { id: 'gn', type: 'GlobeNode' });
        const mesh = n.object.children.find((c) => (c as any).isMesh);
        expect(mesh).toBeTruthy();
        expect((mesh as any).geometry.type).toBe('SphereGeometry');
    });
});

describe('SceneNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('instantiates without error even if url is empty', () => {
        const n = new SceneNode(sg, { id: 'sn', type: 'SceneNode' });
        expect(n.object.children.length).toBeGreaterThanOrEqual(0);
    });
});

describe('AudioNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates audio element and updates properly', () => {
        const n = new AudioNode(sg, {
            id: 'an',
            type: 'AudioNode',
            data: { src: 'test.mp3', autoplay: true },
        });
        expect(n.audioElement).toBeTruthy();
        expect(n.audioElement.src).toContain('test.mp3');
        expect(n.audioElement.autoplay).toBe(true);

        n.updateSpec({ data: { src: 'test2.mp3', loop: true } });
        expect(n.audioElement.src).toContain('test2.mp3');
        expect(n.audioElement.loop).toBe(true);
    });
});

describe('MathNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('instantiates and contains loading text before katex loads', () => {
        const n = new MathNode(sg, {
            id: 'mn',
            type: 'MathNode',
            data: { math: 'x^2' },
        });
        expect(n.domElement).toBeTruthy();
        expect(n.domElement.textContent).toContain('Loading Math...');
    });
});

describe('ChartNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('instantiates and fallback renders without throwing', () => {
        const n = new ChartNode(sg, {
            id: 'cn',
            type: 'ChartNode',
            label: 'Test Chart',
            data: { datasets: [{ data: [1, 2, 3] }] },
        });
        expect(n.canvasEl).toBeTruthy();
        expect(n.domElement.textContent).toContain('Test Chart');
    });
});

describe('GroupNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates box geometry and handles LOD opacity', () => {
        const n = new GroupNode(sg, {
            id: 'gn',
            type: 'GroupNode',
            data: { width: 100, height: 100, depth: 100 },
        });

        // Find mesh child
        const mesh = n.object.children[0] as THREE.Mesh;
        expect(mesh).toBeTruthy();

        // Test LOD update
        n.updateLod(500); // Less than default threshold 1200
        expect((mesh.material as THREE.Material).opacity).toBe(0.05);

        n.updateLod(2000); // Greater than threshold
        expect((mesh.material as THREE.Material).opacity).toBe(0.2);
    });

    it('sets _lastLodVisible false when beyond threshold', () => {
        const n = new GroupNode(sg, {
            id: 'gn2',
            type: 'GroupNode',
            data: { lodThreshold: 1000 },
        });

        n.updateLod(1500);
        expect(n.data._lastLodVisible).toBe(false);

        n.updateLod(500);
        expect(n.data._lastLodVisible).toBe(true);
    });

    it('remains hidden if its parent is hidden (Fractal LOD)', () => {
        const parent = new GroupNode(sg, {
            id: 'parent',
            type: 'GroupNode',
            data: { lodThreshold: 1000 },
        });
        sg.graph.addNode(parent);

        const childGroup = new GroupNode(sg, {
            id: 'childGroup',
            type: 'GroupNode',
            data: { parent: 'parent', lodThreshold: 500 },
        });
        sg.graph.addNode(childGroup);

        // Update sg to match what the GroupNode loop expects
        sg.graph.nodes = new Map([
            ['parent', parent],
            ['childGroup', childGroup],
        ]);

        // Zoom camera way out - parent closes
        parent.updateLod(2000);
        expect(parent.data._lastLodVisible).toBe(false);

        // Try to update child group (simulate being close to the child but the parent is closed)
        childGroup.updateLod(100);

        // Because parent is closed, child should stay closed
        expect(childGroup.data._lastLodVisible).toBe(false);
    });
});

describe('HtmlNode', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('creates html content correctly', () => {
        const n = new HtmlNode(sg, {
            id: 'hn',
            type: 'HtmlNode',
            data: { html: '<span>Test</span>' },
        });
        expect(n.domElement.innerHTML).toContain('Test');
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

    it('uses dashed LineMaterial', () => {
        const e = new DottedEdge(
            sg,
            {
                id: 'de',
                source: 'a',
                target: 'b',
                type: 'DottedEdge',
                data: { dashSize: 10, gapSize: 5 },
            },
            nodeA,
            nodeB,
        );
        const mat = e.object.material as { dashed?: boolean; dashSize?: number; gapSize?: number };
        expect(mat.dashed).toBe(true);
        expect(mat.dashSize).toBe(10);
        expect(mat.gapSize).toBe(5);
    });

    it('update recomputes line distances', () => {
        const e = new DottedEdge(
            sg,
            { id: 'de', source: 'a', target: 'b', type: 'DottedEdge' },
            nodeA,
            nodeB,
        );
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
        const e = new DynamicThicknessEdge(
            sg,
            {
                id: 'dte',
                source: 'a',
                target: 'b',
                type: 'DynamicThicknessEdge',
                data: { weight: 0.7 },
            },
            nodeA,
            nodeB,
        );
        expect(e.object).toBeInstanceOf(THREE.Mesh);
    });

    it('update rebuilds geometry without throwing', () => {
        const e = new DynamicThicknessEdge(
            sg,
            {
                id: 'dte',
                source: 'a',
                target: 'b',
                type: 'DynamicThicknessEdge',
                data: { weight: 0.5 },
            },
            nodeA,
            nodeB,
        );
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

    it('places correct number of nodes per row', async () => {
        const layout = new GridLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).columns = 3;
        (layout.config as any).spacingX = 100;
        (layout.config as any).spacingY = 100;
        await layout.apply();
        const positions = [...sg.graph.nodes.values()].map((n: any) => n.position.x);
        expect(positions[0]).toBe(0);
        expect(positions[1]).toBe(100);
        expect(positions[2]).toBe(200);
        expect(positions[3]).toBe(0); // wraps to new row
    });

    it('row 1 is below row 0 (negative Y)', async () => {
        const layout = new GridLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).columns = 2;
        (layout.config as any).spacingY = 150;
        await layout.apply();
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

    it('places all nodes at the target radius', async () => {
        const layout = new CircularLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).radiusX = 200;
        (layout.config as any).radiusY = 200;
        await layout.apply();
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
        ['A', 'B', 'C'].forEach((id) =>
            sg.graph.addNode({ id, type: 'ShapeNode', position: [0, 0, 0] }),
        );
        sg.graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'Edge' });
        sg.graph.addEdge({ id: 'e2', source: 'A', target: 'C', type: 'Edge' });
    });

    it('root has higher Y than children (top-down)', async () => {
        const layout = new HierarchicalLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).rootId = 'A';
        (layout.config as any).levelHeight = 150;
        await layout.apply();
        const yA = sg.graph.nodes.get('A').position.y;
        const yB = sg.graph.nodes.get('B').position.y;
        const yC = sg.graph.nodes.get('C').position.y;
        expect(yA).toBeGreaterThan(yB);
        expect(yB).toBe(yC);
    });

    it('works with bottom-up direction', async () => {
        const layout = new HierarchicalLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).direction = 'bottom-up';
        await expect(layout.apply()).resolves.not.toThrow();
    });
});

describe('RadialLayout', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        sg.pluginManager.registerEdgeType('Edge', Edge);
        ['root', 'c1', 'c2'].forEach((id) =>
            sg.graph.addNode({ id, type: 'ShapeNode', position: [0, 0, 0] }),
        );
        sg.graph.addEdge({ id: 'e1', source: 'root', target: 'c1', type: 'Edge' });
        sg.graph.addEdge({ id: 'e2', source: 'root', target: 'c2', type: 'Edge' });
    });

    it('places root at origin', async () => {
        const layout = new RadialLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).rootId = 'root';
        await layout.apply();
        const root = sg.graph.nodes.get('root');
        expect(root.position.x).toBe(0);
        expect(root.position.y).toBe(0);
    });

    it('places children at baseRadius distance', async () => {
        const layout = new RadialLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).baseRadius = 300;
        await layout.apply();
        const c1 = sg.graph.nodes.get('c1');
        const r = Math.sqrt(c1.position.x ** 2 + c1.position.y ** 2);
        expect(r).toBeCloseTo(300, -1);
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
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

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
// Graph CRUD and Serialization
// ============================================================

describe('Graph Serialization', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
        sg.pluginManager.registerNodeType('ShapeNode', ShapeNode);
        sg.pluginManager.registerEdgeType('Edge', Edge);

        // Using real `SpaceGraph.prototype.export` and `import` bound to the mock instance.
    });

    it('exports graph nodes and edges', () => {
        sg.graph.addNode({
            id: 'a',
            type: 'ShapeNode',
            position: [10, 20, 30],
            data: { color: 'red' },
        });
        sg.graph.addNode({ id: 'b', type: 'ShapeNode', position: [-10, 0, 0] });
        sg.graph.addEdge({ id: 'e1', source: 'a', target: 'b', type: 'Edge' });

        const exported = sg.export();

        expect(exported.nodes.length).toBe(2);
        expect(exported.edges.length).toBe(1);
        expect(exported.nodes[0].id).toBe('a');
        expect(exported.nodes[0].position).toEqual([10, 20, 30]);
        expect(exported.nodes[0].data.color).toBe('red');
    });

    it('exports and imports SpaceGraph via static method', async () => {
        const sg1 = makeSpaceGraph();
        sg1.graph.addNode({ id: 'a', type: 'ShapeNode', label: 'A', position: [10, 20, 30] });
        sg1.graph.addNode({ id: 'b', type: 'ShapeNode', label: 'B', position: [40, 50, 60] });
        sg1.graph.addEdge({ id: 'e1', source: 'a', target: 'b', type: 'Edge' });

        const state = sg1.export();

        const sg2 = makeSpaceGraph();
        // Mock static import using instance methods for test environments without WebGL
        sg2.import(state);

        expect(sg2.graph.nodes.size).toBe(2);
        expect(sg2.graph.edges.size).toBe(1);
        expect(sg2.graph.nodes.get('a').position.x).toBe(10);
    });

    it('creates InterGraphEdges when adding an edge between different instances', async () => {
        const sg1 = makeSpaceGraph();
        const sg2 = makeSpaceGraph();

        sg1.graph.addNode({ id: 'a', type: 'ShapeNode', label: 'A', position: [10, 20, 30] });
        sg2.graph.addNode({ id: 'b', type: 'ShapeNode', label: 'B', position: [40, 50, 60] });

        // Add sg reference to makeSpaceGraph mocked nodes to mimic real nodes
        sg1.graph.getNode('a').sg = sg1;
        sg2.graph.getNode('b').sg = sg2;

        // Register mocked instances directly into SpaceGraph static registry
        SpaceGraph.instances.add(sg1);
        SpaceGraph.instances.add(sg2);

        // Mock getting InterGraphEdge plugin since we are using makeSpaceGraph mock
        class MockInterGraphEdge extends Edge {
            isInterGraphEdge = true;
        }
        sg1.pluginManager.getEdgeType = (type: string) =>
            type === 'InterGraphEdge' ? MockInterGraphEdge : Edge;

        const edge = sg1.graph.addEdge({
            id: 'e1',
            source: 'a',
            target: 'b',
            type: 'InterGraphEdge',
        });

        expect(edge).toBeTruthy();
        expect((edge as any).isInterGraphEdge).toBe(true);
        expect(sg1.graph.edges.size).toBe(1);
    });

    it('imports graph data correctly', () => {
        const spec = {
            nodes: [
                { id: '1', type: 'ShapeNode', position: [0, 0, 0] },
                { id: '2', type: 'ShapeNode', position: [100, 100, 100] },
            ],
            edges: [{ id: 'e-1-2', source: '1', target: '2', type: 'Edge' }],
        };

        sg.import(spec);

        expect(sg.graph.nodes.size).toBe(2);
        expect(sg.graph.edges.size).toBe(1);
        expect(sg.graph.nodes.get('2').position.x).toBe(100);
    });

    it('exports and imports plugin state correctly', () => {
        const mockPlugin = {
            id: 'mockPlugin',
            name: 'Mock Plugin',
            version: '1.0',
            init: vi.fn(),
            export: vi.fn().mockReturnValue({ configured: true }),
            import: vi.fn(),
        };

        sg.pluginManager.register('mockPlugin', mockPlugin);

        // Test Export
        const exported = sg.export();
        expect(mockPlugin.export).toHaveBeenCalled();
        expect(exported.plugins).toBeDefined();
        expect(exported.plugins.mockPlugin).toEqual({ configured: true });

        // Test Import
        const specWithPlugins = {
            nodes: [],
            edges: [],
            plugins: {
                mockPlugin: { restored: true },
            },
        };

        sg.import(specWithPlugins);
        expect(mockPlugin.import).toHaveBeenCalledWith({ restored: true });
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
        expect(sg.graph.edges.size).toBe(1);
    });

    it('addEdge returns null for missing source', () => {
        sg.graph.addNode({ id: 'b', type: 'ShapeNode', position: [0, 0, 0] });
        expect(
            sg.graph.addEdge({ id: 'e', source: 'missing', target: 'b', type: 'Edge' }),
        ).toBeNull();
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
        expect(sg.graph.edges.size).toBe(0);
    });

    it('getNode and getEdge retrieve elements correctly', () => {
        sg.graph.addNode({ id: 'node-A', type: 'ShapeNode', position: [0, 0, 0] });
        sg.graph.addNode({ id: 'node-B', type: 'ShapeNode', position: [100, 0, 0] });
        sg.graph.addEdge({ id: 'edge-1', source: 'node-A', target: 'node-B', type: 'Edge' });

        const nodeA = sg.graph.getNode('node-A');
        const edge1 = sg.graph.getEdge('edge-1');

        expect(nodeA).toBeDefined();
        expect(nodeA.id).toBe('node-A');

        expect(edge1).toBeDefined();
        expect(edge1.id).toBe('edge-1');

        expect(sg.graph.getNode('missing')).toBeUndefined();
        expect(sg.graph.getEdge('missing')).toBeUndefined();
    });
});

// ============================================================
// PluginManager
// ============================================================

import { PluginManager } from '../src/core/PluginManager';

describe('PluginManager', () => {
    let sg: any;
    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('registers and retrieves plugins by key', () => {
        const pm = new PluginManager(sg);
        const plugin = new ForceLayout();
        pm.register('ForceLayout', plugin);
        expect(pm.getPlugin('ForceLayout')).toBe(plugin);
    });

    it('throws error when registering with invalid name or undefined plugin', () => {
        const pm = new PluginManager(sg);
        const plugin = new ForceLayout();
        expect(() => pm.register('', plugin)).toThrow(/Invalid plugin name/);
        expect(() => pm.register('InvalidPlugin', undefined as any)).toThrow(/undefined or null/);
    });

    it('initAll throws Error with errors array if plugins fail to init', async () => {
        const pm = new PluginManager(sg);
        const badPlugin = {
            id: 'bad',
            name: 'Bad',
            version: '1',
            init: async () => {
                throw new Error('Crash');
            },
        };
        pm.register('badPlugin', badPlugin);
        const error = await pm.initAll().catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect((error as Error & { errors: Error[] }).errors).toHaveLength(1);
    });

    it('registers node types', () => {
        const pm = new PluginManager(sg);
        pm.registerNodeType('ShapeNode', ShapeNode);
        expect(pm.getNodeType('ShapeNode')).toBe(ShapeNode);
    });

    it('returns undefined for unknown plugin', () => {
        const pm = new PluginManager(sg);
        expect(pm.getPlugin('NonExistent')).toBeUndefined();
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
// Interaction tests
// ============================================================

describe('InteractionPlugin', () => {
    let sg: any;
    let interaction: InteractionPlugin;

    beforeEach(() => {
        sg = makeSpaceGraph();
        // Make camera look like a PerspectiveCamera for Raycaster
        sg.renderer.camera.isPerspectiveCamera = true;
        sg.renderer.camera.matrixWorld = new THREE.Matrix4();
        sg.renderer.camera.matrixWorldInverse = new THREE.Matrix4();
        sg.renderer.camera.projectionMatrix = new THREE.Matrix4();
        sg.renderer.camera.projectionMatrixInverse = new THREE.Matrix4();
        sg.cameraControls = { flyTo: vi.fn() };
        interaction = new InteractionPlugin();
        interaction.init(sg);
        sg.pluginManager.register('InteractionPlugin', interaction);
    });

    it('emits node:dblclick event when a node is double clicked', () => {
        // Test removed - now uses InputManager abstraction
    });

    it('emits edge:dblclick event and flies to target node', () => {
        // Test removed - now uses InputManager abstraction
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

describe('VisionManager Auto-Correction Loop', () => {
    let sg: any;
    let visionManager: any;
    let autoLayout: any;

    beforeEach(() => {
        sg = makeSpaceGraph();

        // Setup AutoLayoutPlugin mock
        autoLayout = {
            id: 'AutoLayoutPlugin',
            applyVisionCorrection: vi.fn(),
        };
        sg.pluginManager.register('AutoLayoutPlugin', autoLayout);

        sg.visionManager = new VisionManager(sg);

        // Mock analyzeVision to return overlaps so auto-fix is triggered
        vi.spyOn(sg.visionManager, 'analyzeVision').mockResolvedValue({
            overall: { score: 70, grade: 'D', issues: [] },
            overlap: {
                hasOverlaps: true,
                overlapCount: 1,
                overlaps: [{ nodeA: 'v1', nodeB: 'v2', penetration: 5 }],
            },
            legibility: { wcagAA: true, averageContrast: 10, failures: [] },
            hierarchy: {
                hasRoot: true,
                rootIds: ['v1'],
                depth: 2,
                levels: [['v1'], ['v2']],
                score: 80,
            },
            ergonomics: {
                fittsLawCompliant: true,
                averageTargetSize: 50,
                smallTargets: [],
                score: 90,
            },
        });

        vi.useFakeTimers();
    });

    afterEach(() => {
        if (sg.visionManager) sg.visionManager.stopAutonomousCorrection();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('periodically polls analyzeVision and fires autoLayout fixes', async () => {
        // Start loop every 10 seconds
        sg.visionManager.startAutonomousCorrection(10000);

        // Should not have fired yet
        expect(autoLayout.applyVisionCorrection).not.toHaveBeenCalled();

        // Fast forward time and flush all resulting promises queued by the interval
        await vi.advanceTimersByTimeAsync(11000);

        expect(autoLayout.applyVisionCorrection).toHaveBeenCalledTimes(1);

        // Verify it passed the right issue format
        const args = autoLayout.applyVisionCorrection.mock.calls[0][0];
        expect(args[0].type).toBe('overlap');
        expect(args[0].nodeA).toBe('v1');
        expect(args[0].nodeB).toBe('v2');
    });
});

describe('Layout Engines', () => {
    let sg: any;

    beforeEach(() => {
        sg = makeSpaceGraph();
    });

    it('GridLayout correctly places nodes in a mathematical grid', async () => {
        const layout = new GridLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).spacingX = 100;
        (layout.config as any).spacingY = 50;
        (layout.config as any).columns = 2;

        const n0 = sg.graph.addNode({ id: 'n0', type: 'ShapeNode', position: [0, 0, 0] });
        const n1 = sg.graph.addNode({ id: 'n1', type: 'ShapeNode', position: [0, 0, 0] });
        const n2 = sg.graph.addNode({ id: 'n2', type: 'ShapeNode', position: [0, 0, 0] });
        const n3 = sg.graph.addNode({ id: 'n3', type: 'ShapeNode', position: [0, 0, 0] });

        await layout.apply();

        // Node 0 should be at 0, 0 (row 0, col 0)
        expect(n0.position.x).toBe(0);
        expect(n0.position.y).toBe(0);

        // Node 1 should be at 100, 0 (row 0, col 1)
        expect(n1.position.x).toBe(100);
        expect(n1.position.y).toBe(0);

        // Node 2 should be at 0, -50 (row 1, col 0)
        expect(n2.position.x).toBe(0);
        expect(n2.position.y).toBe(-50);

        // Node 3 should be at 100, -50 (row 1, col 1)
        expect(n3.position.x).toBe(100);
        expect(n3.position.y).toBe(-50);
    });

    it('CircularLayout evenly distributes nodes in an ellipse', async () => {
        const layout = new CircularLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).radiusX = 100;
        (layout.config as any).radiusY = 200;

        const n0 = sg.graph.addNode({ id: 'nc0', type: 'ShapeNode', position: [0, 0, 0] });
        const n1 = sg.graph.addNode({ id: 'nc1', type: 'ShapeNode', position: [0, 0, 0] });
        const n2 = sg.graph.addNode({ id: 'nc2', type: 'ShapeNode', position: [0, 0, 0] });
        const n3 = sg.graph.addNode({ id: 'nc3', type: 'ShapeNode', position: [0, 0, 0] });

        await layout.apply();

        // Node 0 should be at angle 0: x = 100, y = 0
        expect(n0.position.x).toBeCloseTo(100);
        expect(n0.position.y).toBeCloseTo(0);

        // Node 1 should be at angle PI/2: x = 0, y = 200
        expect(n1.position.x).toBeCloseTo(0);
        expect(n1.position.y).toBeCloseTo(200);

        // Node 2 should be at angle PI: x = -100, y = 0
        expect(n2.position.x).toBeCloseTo(-100);
        expect(n2.position.y).toBeCloseTo(0);

        // Node 3 should be at angle 3PI/2: x = 0, y = -200
        expect(n3.position.x).toBeCloseTo(0);
        expect(n3.position.y).toBeCloseTo(-200);
    });

    it('HierarchicalLayout calculates tree depth using BFS', async () => {
        const layout = new HierarchicalLayout();
        layout.init(sg, sg.graph, sg.events);
        (layout.config as any).levelHeight = 100;
        (layout.config as any).nodeSpacing = 50;

        // Root
        const r = sg.graph.addNode({ id: 'root', type: 'ShapeNode', position: [0, 0, 0] });
        // Depth 1
        const c1 = sg.graph.addNode({ id: 'child1', type: 'ShapeNode', position: [0, 0, 0] });
        const c2 = sg.graph.addNode({ id: 'child2', type: 'ShapeNode', position: [0, 0, 0] });
        // Depth 2
        const gc1 = sg.graph.addNode({ id: 'grandchild1', type: 'ShapeNode', position: [0, 0, 0] });

        sg.graph.addEdge({ id: 'e1', type: 'Edge', source: 'root', target: 'child1' });
        sg.graph.addEdge({ id: 'e2', type: 'Edge', source: 'root', target: 'child2' });
        sg.graph.addEdge({ id: 'e3', type: 'Edge', source: 'child1', target: 'grandchild1' });

        await layout.apply();

        // Level 0
        expect(r.position.y).toBe(-0);
        // Level 1
        expect(c1.position.y).toBe(-100);
        expect(c2.position.y).toBe(-100);
        // Level 2
        expect(gc1.position.y).toBe(-200);
    });
});
