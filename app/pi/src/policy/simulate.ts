// Offline re-simulation tier. Rebuilds the deterministic fixture under a policy vector, settles the
// geometry solver with vision feedback, then re-scores the fixed human events against the new
// legibility. The human interaction never changes; only the machine-side layout and vision are re-run.

import { agentDomain } from '@spacegraphjs/agent';
import { sampleDepth, type DepthMode } from 'spacegraphjs/depth';
import { ScopeSimulation } from 'spacegraphjs/layout';
import { FIXTURE_ID, fixtureKernel } from '../fixture';
import { replaySession, type EventScorer, type ReplayStrategy } from '../recorder';
import { agentScopes } from '../scopes';
import { scoreVision, type Position, type VisionScores } from './host';
import type { PolicyVector } from './schema';

const SEED = 7;
const BAND = 1;
const AXIS = 'turn' as const;

export interface SimulatedFixture {
    readonly positions: ReadonlyMap<string, Position>;
    readonly vision: VisionScores;
}

const axisValue = (turns: readonly string[], unitId: string | undefined): number => {
    const index = unitId ? turns.indexOf(unitId) : -1;
    return turns.length > 1 ? (index < 0 ? 0 : index / (turns.length - 1)) : 0;
};

/** Depth is a renderer capability; offline legibility measures x/y crowding in a flat projection. */
const flatten = (positions: ReadonlyMap<string, Position>): ReadonlyMap<string, Position> =>
    new Map([...positions].map(([id, position]) => [id, { ...position, z: 0 }]));

/** Rest-state geometry of the fixture under a vector, including two vision-feedback retargets. */
export const simulateFixture = (vector: PolicyVector): SimulatedFixture => {
    const view = agentDomain.build(fixtureKernel());
    const scopes = agentScopes(view);
    const simulation = new ScopeSimulation({
        instant: true,
        layout: {
            seed: SEED,
            gap: Number(vector['geometry.gap']),
            depthStep: Number(vector['depth.step']),
            nodePadding: Number(vector['geometry.padding']),
        },
        forces: {
            repulsion: Number(vector['geometry.repulsion']),
            attraction: 0.018,
            cooling: 0.94,
            maxBodies: 120,
        },
    });
    simulation.setSpecs(scopes.specs, { band: BAND });
    simulation.settle();

    const turns = [...(view.turns ?? [])];
    const continuum = {
        mode: vector['depth.mode'] as DepthMode,
        axis: AXIS,
        strength: 1,
        spread: 180,
    };
    const positionsOf = (): Map<string, Position> => {
        const positions = new Map<string, Position>();
        for (const [qualified, point] of simulation.view().positions) {
            const id = scopes.nodeById.get(qualified);
            if (!id) continue;
            const node = view.nodes.find((candidate) => candidate.id === id);
            const unitId = typeof node?.data?.unitId === 'string' ? node.data.unitId : undefined;
            const offset = sampleDepth(continuum, axisValue(turns, unitId), 1200).offset;
            positions.set(id, { x: point.x, y: point.y, z: point.z + offset });
        }
        return positions;
    };

    let positions = positionsOf();
    let vision = scoreVision(flatten(positions));
    for (let cycle = 0; cycle < 2; cycle++) {
        simulation.setPolicy({ band: BAND, vision });
        simulation.settle();
        positions = positionsOf();
        vision = scoreVision(flatten(positions));
    }
    return { positions, vision };
};

/**
 * Simulation-backed offline replay. Geometry, depth and vision knobs now reach the score through
 * the re-simulated legibility; success, wrong turns and travel stay tied to the recorded human event.
 */
export const simulateAndScore: ReplayStrategy = (recording, vector, scorer) => {
    if (recording.fixture !== FIXTURE_ID) return replaySession(recording, vector, scorer);
    const { vision } = simulateFixture(vector);
    const rescore: EventScorer = (event, policy) => {
        const partial = scorer(event, policy);
        return 'legibility' in partial ? { ...partial, legibility: vision.legibility } : partial;
    };
    return replaySession(recording, vector, rescore);
};
