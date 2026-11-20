import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ScopesPlugin, visionScores } from '../src/plugins/ScopesPlugin';
import { buildScopeTree, layoutScopes, type ScopeSpec } from '../src/layout';
import type { Node } from '../src/nodes/Node';
import type { SpaceGraph } from '../src/SpaceGraph';
import type { VisionReport } from '../src/vision/types';

type Host = {
    sg: SpaceGraph;
    nodes: Map<string, Node>;
    frame: ReturnType<typeof vi.fn>;
    listeners: Map<string, (payload: any) => void>;
};

const makeNode = (id: string): Node =>
    ({
        id,
        position: new THREE.Vector3(),
        object: { position: { copy: vi.fn() } },
        data: {},
        isPinned: () => false,
    }) as unknown as Node;

const makeHost = (ids: string[], zoom = 0): Host => {
    const nodes = new Map(ids.map((id) => [id, makeNode(id)]));
    const frame = vi.fn();
    const listeners = new Map<string, (payload: any) => void>();
    const events = {
        on: (name: string, callback: (payload: any) => void) => {
            listeners.set(name, callback);
            return { dispose: () => listeners.delete(name) };
        },
        emit: vi.fn(),
    };
    const sg = {
        zoom,
        reducedMotion: false,
        selection: { list: [] as string[] },
        requestFrame: frame,
        events,
        graph: { nodes, addNode: vi.fn() },
    } as unknown as SpaceGraph;
    return { sg, nodes, frame, listeners };
};

const specs: ScopeSpec[] = [
    { id: 'root', strategy: 'grid', nodes: [{ id: 'a', size: [100, 40] }, { id: 'b', size: [100, 40] }] },
];

describe('ScopesPlugin', () => {
    it('leaves the graph alone when it has no specs', () => {
        const host = makeHost([]);
        const plugin = new ScopesPlugin();
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        plugin.onPreRender(1 / 60);

        expect(host.frame).not.toHaveBeenCalled();
        expect(plugin.simulation.positions.size).toBe(0);
    });

    it('writes solved positions into matching graph nodes when animation is off', () => {
        const host = makeHost(['root/a', 'root/b']);
        const plugin = new ScopesPlugin({ specs, animate: false, policy: false });
        plugin.init(host.sg, host.sg.graph, host.sg.events);
        const target = layoutScopes(buildScopeTree(specs)).positions;

        plugin.onPreRender(1 / 60);

        for (const [id, position] of target) {
            const node = host.nodes.get(id)!;
            expect(node.position.toArray()).toEqual([position.x, position.y, position.z]);
        }
        expect(host.frame).not.toHaveBeenCalled();
    });

    it('animates toward the target and keeps requesting frames until settled', () => {
        const host = makeHost(['root/a', 'root/b']);
        const plugin = new ScopesPlugin({ specs, policy: false });
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        plugin.onPreRender(1 / 60);

        expect(plugin.simulation.settled).toBe(false);
        expect(host.frame).toHaveBeenCalled();
        expect(host.nodes.get('root/a')!.position.length()).toBeGreaterThan(0);
    });

    it('maps qualified ids and creates missing nodes on request', () => {
        const host = makeHost([]);
        const plugin = new ScopesPlugin({
            specs,
            createNodes: true,
            nodeId: (qualified) => qualified.replace('/', ':'),
            policy: false,
        });
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        expect(host.sg.graph.addNode).toHaveBeenCalledTimes(2);
        plugin.onPreRender(1 / 60);
        expect(plugin.simulation.positions.has('root/a')).toBe(true);
    });

    it('respects reduced motion unless instant is explicitly set', () => {
        const host = makeHost(['root/a', 'root/b']);
        host.sg.reducedMotion = true;
        const plugin = new ScopesPlugin({ specs, policy: false });
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        expect(plugin.simulation.settled).toBe(true);

        const explicit = new ScopesPlugin({
            specs,
            policy: false,
            simulation: { instant: false },
        });
        explicit.init(host.sg, host.sg.graph, host.sg.events);
        expect(explicit.simulation.settled).toBe(false);
    });

    it('pins the focused node when followFocus is enabled', () => {
        const host = makeHost(['root/a', 'root/b']);
        host.sg.selection.list = ['root/a'];
        const plugin = new ScopesPlugin({ specs, followFocus: true });
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        expect(plugin.simulation.pinned.has('root/a')).toBe(true);
        expect(plugin.simulation.pinned.has('root')).toBe(true);
    });

    it('reads zoom as an activation band', () => {
        const deep: ScopeSpec[] = [
            { id: 'root', nodes: [{ id: 'p', scope: 'child' }] },
            { id: 'child', parent: 'root', nodes: [{ id: 'q', scope: 'grandchild' }] },
            { id: 'grandchild', parent: 'child', nodes: [{ id: 'x' }] },
        ];
        const host = makeHost([], 0);
        const plugin = new ScopesPlugin({ specs: deep, followZoom: true, bandOf: () => 0 });
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        expect(plugin.simulation.view().frames.get('root/child')!.active).toBe(true);
        expect(plugin.simulation.view().frames.get('root/child/grandchild')!.active).toBe(false);
    });

    it('lets host signals override the follow switches', () => {
        const host = makeHost(['root/a'], 1);
        host.sg.selection.list = ['root/a'];
        const plugin = new ScopesPlugin({
            specs,
            followFocus: true,
            signals: () => ({ focus: 'root/b' }),
        });
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        expect(plugin.simulation.pinned.has('root/b')).toBe(true);
        expect(plugin.simulation.pinned.has('root/a')).toBe(false);
    });

    it('feeds vision reports into the policy', () => {
        const host = makeHost(['root/a', 'root/b']);
        const plugin = new ScopesPlugin({ specs, followVision: true, animate: false });
        plugin.init(host.sg, host.sg.graph, host.sg.events);
        const callback = host.listeners.get('vision:analysis-complete');
        expect(callback).toBeDefined();

        const report = {
            overlap: { overlapCount: 8 },
            legibility: { averageContrast: 0 },
        } as unknown as VisionReport;
        callback!(report);

        plugin.applySignals();
        plugin.onPreRender(1 / 60);
        expect(plugin.simulation.settled).toBe(true);
    });

    it('exposes each frame through onFrame', () => {
        const host = makeHost(['root/a', 'root/b']);
        const onFrame = vi.fn();
        const plugin = new ScopesPlugin({ specs, policy: false, onFrame });
        plugin.init(host.sg, host.sg.graph, host.sg.events);

        plugin.onPreRender(1 / 60);

        expect(onFrame).toHaveBeenCalledOnce();
        expect(onFrame.mock.calls[0][0].positions.has('root/a')).toBe(true);
    });
});

describe('visionScores', () => {
    it('maps overlap count and contrast into unit scores', () => {
        const report = {
            overlap: { overlapCount: 12 },
            legibility: { averageContrast: 2.25 },
        } as unknown as VisionReport;

        expect(visionScores(report)).toEqual({ overlap: 1, legibility: 0.5 });
    });
});
