// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { agentDomain, type AgentView } from '@spacegraphjs/agent';
import { buildScopeTree, ScopeSimulation } from 'spacegraphjs/layout';
import { fixtureID, fixtureKernel } from '../src/fixture';
import { agentScopes } from '../src/scopes';

const view = () => agentDomain.build(fixtureKernel());
const options = { seed: 7, gap: 190, depthStep: 220, nodePadding: 36 } as const;

describe('agentScopes', () => {
    it('builds a validated tree with portal nodes and cross-scope edges', () => {
        const scopes = agentScopes(view());
        const tree = buildScopeTree(scopes.specs);

        expect(tree.byPath.size).toBe(scopes.specs.length);
        expect([...scopes.nodeById.keys()]).toHaveLength(view().nodes.length);
        expect([...scopes.specs.flatMap((spec) => spec.nodes)].some((node) => node.scope)).toBe(true);
        expect(scopes.specs.flatMap((spec) => spec.edges ?? []).some((edge) => edge.target.includes('/'))).toBe(true);
        expect(scopes.specs.flatMap((spec) => spec.edges ?? []).some((edge) => edge.kind === 'inferred-cause')).toBe(false);
        for (const [qualified, id] of scopes.nodeById) {
            expect(scopes.qualifiedById.get(id)).toBe(qualified);
        }
    });

    it('keeps a node id stable while its qualified path follows reparenting', () => {
        const agentView = view();
        const node = agentView.nodes.find((item) => item.id.endsWith(':verify'))!;
        const moved: AgentView = {
            ...agentView,
            nodes: agentView.nodes.map((item) =>
                item.id === node.id ? { ...item, data: { ...item.data, unitId: '1' } } : item,
            ),
            edges: agentView.edges.map((edge) =>
                edge.target === node.id && edge.kind === 'contains'
                    ? { ...edge, source: fixtureID('local', '1') }
                    : edge,
            ),
        };
        const before = agentScopes(agentView);
        const after = agentScopes(moved);
        expect(after.nodeById.get(after.qualifiedById.get(node.id)!)).toBe(node.id);
        expect(before.qualifiedById.get(node.id)).not.toBe(after.qualifiedById.get(node.id));
        expect(buildScopeTree(after.specs).nodePaths.has(after.qualifiedById.get(node.id)!)).toBe(true);
    });

    it('converges to the same rest state for the same seed and event stream', () => {
        const specs = agentScopes(view()).specs;
        const advance = () => {
            const simulation = new ScopeSimulation({ layout: options, forces: { repulsion: 1800 } });
            simulation.setSpecs(specs);
            for (let step = 0; step < 600 && !simulation.settled; step++) simulation.advance(1 / 60);
            expect(simulation.settled).toBe(true);
            return simulation.view().positions;
        };
        const first = advance();
        const second = advance();
        expect([...first.keys()].sort()).toEqual([...second.keys()].sort());
        for (const [id, position] of first) {
            const other = second.get(id)!;
            expect(Math.abs(position.x - other.x)).toBeLessThan(1e-6);
            expect(Math.abs(position.y - other.y)).toBeLessThan(1e-6);
            expect(Math.abs(position.z - other.z)).toBeLessThan(1e-6);
        }
    });

    it('warm-starts appended nodes without moving the existing rest state', () => {
        const simulation = new ScopeSimulation({ layout: options });
        simulation.setSpecs(agentScopes(view()).specs);
        simulation.settle();
        const before = new Map(simulation.view().positions);
        const appended = agentScopes(view());
        simulation.setSpecs(appended.specs);
        simulation.settle();
        for (const [id, position] of before) {
            expect(simulation.view().positions.get(id)).toEqual(position);
        }
    });
});
