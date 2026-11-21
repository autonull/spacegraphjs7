// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CrossTraceLink } from '../src/cross-trace';
import { createWorldHost, type WorldHostDomain } from '../src/world-host';
import { buildWorldFixture } from '../src/world-fixture';

const domains: readonly WorldHostDomain[] = [
    {
        id: 'agent',
        nodes: [
            { id: 'agent:r:run', label: 'Run', kind: 'run' },
            { id: 'agent:r:session', label: 'Session', kind: 'artifact' },
            { id: 'agent:r:read', label: 'Read', kind: 'action' },
        ],
        edges: [{ id: 'a1', source: 'agent:r:run', target: 'agent:r:session' }],
    },
    {
        id: 'workflow',
        nodes: [{ id: 'workflow:wf:compile' }, { id: 'workflow:wf:r1' }, { id: 'workflow:wf:out' }],
        edges: [{ id: 'w1', source: 'workflow:wf:compile', target: 'workflow:wf:out' }],
    },
    {
        id: 'filesystem',
        nodes: [
            { id: 'filesystem:c1:session' },
            { id: 'filesystem:c1:edit' },
            { id: 'filesystem:c1:bundle' },
        ],
    },
    { id: 'data', nodes: [{ id: 'data:p1:auc' }, { id: 'data:p1:gbdt' }] },
];

const links: readonly CrossTraceLink[] = [
    {
        id: 'cross:session:compile',
        from: ['agent', 'agent:r:session'],
        to: ['workflow', 'workflow:wf:compile'],
    },
    {
        id: 'cross:artifact:file',
        from: ['workflow', 'workflow:wf:out'],
        to: ['filesystem', 'filesystem:c1:session'],
    },
    {
        id: 'cross:change:metric',
        from: ['filesystem', 'filesystem:c1:edit'],
        to: ['data', 'data:p1:auc'],
    },
];

const host = () => createWorldHost(domains, { links });

describe('one-canvas world host', () => {
    it('feeds one simulation and one path-qualified model', () => {
        const world = host();
        const model = world.renderModel();
        const portals = model.nodes.filter((node) => node.kind === 'portal');
        const domainNodes = model.nodes.filter((node) => node.kind !== 'portal');

        expect(portals.map((node) => node.id)).toEqual([
            'world/portal:agent',
            'world/portal:workflow',
            'world/portal:filesystem',
            'world/portal:data',
        ]);
        expect(domainNodes).toHaveLength(11);
        expect(domainNodes.every((node) => node.id.startsWith('world/domain:'))).toBe(true);
        expect(model.nodes.every((node) => node.position.every(Number.isFinite))).toBe(true);
        expect(model.nodes.every((node) => node.kind !== 'InterGraphEdge')).toBe(true);
    });

    it('keeps domains isolated by path-qualified ids and portal parentage', () => {
        const model = host().renderModel();
        const byId = new Map(model.nodes.map((node) => [node.id, node]));

        for (const node of model.nodes) {
            if (node.kind === 'portal') continue;
            const domain = node.data?.domain;
            expect(node.parent).toBe(`world/portal:${domain}`);
            expect(node.id.startsWith(`world/domain:${domain}/`)).toBe(true);
        }
        expect(byId.get('world/domain:agent/agent:r:session')?.data?.domain).toBe('agent');
        expect(byId.get('world/domain:data/data:p1:auc')?.data?.domain).toBe('data');
    });

    it('renders cross-domain links as ordinary edges inside the one graph', () => {
        const edges = host().renderModel().edges;
        const cross = edges.filter((edge) => edge.kind === 'cross-domain');
        expect(cross.map((edge) => edge.id)).toEqual(links.map((link) => link.id));
        expect(cross.every((edge) => edge.style === 'dashed')).toBe(true);
        expect(cross[0]?.source).toBe('world/domain:agent/agent:r:session');
        expect(cross[0]?.target).toBe('world/domain:workflow/workflow:wf:compile');
    });

    it('collapses a cross-domain trace into one ordered camera path', () => {
        const world = host();
        expect(world.trace('data:p1:auc', 'backward')).toEqual([
            'world/domain:data/data:p1:auc',
            'world/domain:filesystem/filesystem:c1:edit',
            'world/domain:filesystem/filesystem:c1:session',
            'world/domain:workflow/workflow:wf:out',
            'world/domain:workflow/workflow:wf:compile',
            'world/domain:agent/agent:r:session',
        ]);
        expect(world.traceSteps('data:p1:auc', 'backward').map((step) => step.via)).toEqual([
            undefined,
            'cross:change:metric',
            'scope:c1',
            'cross:artifact:file',
            'scope:wf',
            'cross:session:compile',
        ]);
        expect(world.focusPositions('data:p1:auc', 'backward')).toHaveLength(6);
    });

    it('is deterministic under the seeded single position authority', () => {
        const a = host().renderModel();
        const b = host().renderModel();
        expect(a.nodes.map((node) => [node.id, node.position])).toEqual(
            b.nodes.map((node) => [node.id, node.position]),
        );
    });

    it('binds the shared four-domain fixture into one world model', () => {
        const fixture = buildWorldFixture();
        const world = createWorldHost(fixture.domains, { links: fixture.links });
        const model = world.renderModel();
        const domainNodes = model.nodes.filter((node) => node.kind !== 'portal');

        expect(fixture.domains.map((domain) => domain.id)).toEqual([
            'agent',
            'workflow',
            'filesystem',
            'data',
        ]);
        expect(model.nodes.filter((node) => node.kind === 'portal')).toHaveLength(4);
        expect(domainNodes.length).toBe(
            fixture.domains.reduce((total, domain) => total + domain.nodes.length, 0),
        );
        expect(world.trace('data:p1:auc', 'backward')).toHaveLength(6);
    });
});
