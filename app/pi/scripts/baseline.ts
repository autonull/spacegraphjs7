import { agentDomain } from '@spacegraphjs/agent';
import { ScopeSimulation } from 'spacegraphjs/layout';
import {
    computeGraphLayout,
    graphShape,
    GRAPH_LAYOUTS,
    layoutTargets,
    scopeByNode,
} from '../src/graph-layout';
import { fixtureKernel, richFixtureKernel } from '../src/fixture';
import { agentScopes } from '../src/scopes';

const LAYOUT = { seed: 7, gap: 160, depthStep: 64, nodePadding: 20 } as const;

/** Measure every graph view from the solved positions the host would feed the simulation. */
export function measure(scenario: 'canonical' | 'rich' = 'rich'): Record<string, ReturnType<typeof graphShape>> {
    const view = agentDomain.build(scenario === 'rich' ? richFixtureKernel() : fixtureKernel());
    const scopes = agentScopes(view, { packed: true });
    const scopeOfNode = scopeByNode(scopes.specs);
    const results: Record<string, ReturnType<typeof graphShape>> = {};

    for (const mode of GRAPH_LAYOUTS) {
        const layout = computeGraphLayout(view, mode);
        const sim = new ScopeSimulation({ instant: true, layout: LAYOUT });
        sim.setSpecs(scopes.specs);
        sim.setLayoutTargets(layoutTargets(layout, scopes.qualifiedById));
        const positions = new Map(
            [...sim.positions].flatMap(([qualified, position]) => {
                const id = scopes.nodeById.get(qualified);
                return id ? ([[id, position]] as const) : [];
            }),
        );
        results[mode] = graphShape(view, positions, (edge) => {
            const from = scopeOfNode.get(edge.source);
            const to = scopeOfNode.get(edge.target);
            return Boolean(from && to && from !== to);
        });
    }
    return results;
}

if (process.argv[1]?.endsWith('baseline.ts')) console.log(JSON.stringify(measure(), null, 2));
