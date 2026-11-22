import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agentDomain } from '@spacegraphjs/agent';
import { ScopeSimulation, type Position } from 'spacegraphjs/layout';
import { nodeSize } from '../src/adapter';
import {
    computeGraphLayout,
    graphShape,
    GRAPH_LAYOUTS,
    layoutTargets,
    scopeByNode,
    type GraphLayoutMode,
} from '../src/graph-layout';
import { fixtureKernel, richFixtureKernel } from '../src/fixture';
import {
    measurePresence,
    type PresenceReport,
    type PresenceSample,
} from '../src/policy/measurement';
import { POLICY_PRESETS } from '../src/policy/presets';
import { resolvePolicy } from '../src/policy/resolve';
import { POLICY_SCHEMA } from '../src/policy/schema';
import { SHOTS } from '../src/shots';
import { agentScopes } from '../src/scopes';

const LAYOUT = { seed: 7, gap: 160, depthStep: 64, nodePadding: 20 } as const;
type Scenario = 'canonical' | 'rich';

/** Solve the positions the host would feed the simulation for one graph view and scenario. */
const solve = (mode: GraphLayoutMode, scenario: Scenario) => {
    const view = agentDomain.build(scenario === 'rich' ? richFixtureKernel() : fixtureKernel());
    const scopes = agentScopes(view, { packed: true });
    const layout = computeGraphLayout(view, mode);
    const simulation = new ScopeSimulation({ instant: true, layout: LAYOUT });
    simulation.setSpecs(scopes.specs);
    simulation.setLayoutTargets(layoutTargets(layout, scopes.qualifiedById));
    const positions = new Map(
        [...simulation.positions].flatMap(([qualified, position]) => {
            const id = scopes.nodeById.get(qualified);
            return id ? ([[id, position]] as const) : [];
        }),
    );
    return { view, scopes, positions };
};

export const positionsFor = (
    mode: GraphLayoutMode,
    scenario: Scenario = 'rich',
): Map<string, Position> => solve(mode, scenario).positions;

/** Measure every graph view from the solved positions the host would feed the simulation. */
export function measure(
    scenario: Scenario = 'rich',
): Record<string, ReturnType<typeof graphShape>> {
    const baseline = solve('freeform', scenario);
    const scopeOfNode = scopeByNode(baseline.scopes.specs);
    const results: Record<string, ReturnType<typeof graphShape>> = {};

    for (const mode of GRAPH_LAYOUTS) {
        const { view, positions } = mode === 'freeform' ? baseline : solve(mode, scenario);
        results[mode] = graphShape(view, positions, (edge) => {
            const from = scopeOfNode.get(edge.source);
            const to = scopeOfNode.get(edge.target);
            return Boolean(from && to && from !== to);
        });
    }
    return results;
}

/** Offline presence baseline for the fit matrix and the flagship cockpit, before any scale change. */
export function presenceBaseline(): PresenceReport {
    const positions = positionsFor('freeform');
    const nodes = agentDomain
        .build(richFixtureKernel())
        .nodes.map((node) => ({ id: node.id, kind: node.kind, label: node.label }));
    const samples: PresenceSample[] = SHOTS.filter(
        (shot) => (shot.fit && shot.octave !== undefined) || shot.id === 'cockpit',
    ).map((shot) => {
        const preset = POLICY_PRESETS.find((entry) => entry.id === shot.preset);
        const values = resolvePolicy(POLICY_SCHEMA, preset ? { preset: preset.vector } : {}).vector;
        return measurePresence({
            id: shot.id,
            nodes,
            positions,
            viewport: shot.viewport ?? { width: 1600, height: 1000 },
            values,
            sizeOf: (kind, dense) => nodeSize(kind, true, dense),
            octave: shot.octave ?? 0,
            padding: shot.padding ?? 40,
        });
    });
    return {
        version: 1,
        method:
            'Offline orthographic projection of solved freeform card bounds with adaptive insets; ' +
            'sums clipped card areas and checks projected label sizes against the policy floor. ' +
            'Host chrome is not subtracted; this is a comparable baseline, not a pixel readback.',
        samples,
    };
}

if (process.argv[1]?.endsWith('baseline.ts')) {
    if (process.argv.includes('--presence')) {
        const report = presenceBaseline();
        const file = resolve(
            import.meta.dirname,
            '../../../docs/screenshots/presence-baseline.json',
        );
        writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
        console.log(JSON.stringify(report, null, 2));
    } else {
        console.log(JSON.stringify(measure(), null, 2));
    }
}
