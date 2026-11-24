import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CORE_COVERAGE, SCENARIOS, scenarioOps } from '../src/scenarios';
import { SHOTS } from '../src/shots';
import { forkOps } from '../src/translator';

const ALLOWED_EDGES = new Set([
    'orders', 'owns', 'waiting.on', 'sleeps-on', 'delegates', 'retry',
    'checkpoint', 'fork', 'forkedFrom',
]);

describe('named durable scenarios', () => {
    it.each(SCENARIOS.map((entry) => [entry.id, entry] as const))('%s folds deterministically with stable ids', (_id, entry) => {
        const ops = scenarioOps(entry);
        expect(scenarioOps(entry)).toEqual(ops);
        const nodeIDs = ops.flatMap((op) => (op.op === 'add-node' ? [op.node.id] : []));
        expect(new Set(nodeIDs).size).toBe(nodeIDs.length);
        const edgeKinds = ops.flatMap((op) => (op.op === 'add-edge' ? [op.edge.kind] : []));
        expect(edgeKinds.every((kind) => ALLOWED_EDGES.has(kind))).toBe(true);
        const extra = entry.fork ? forkOps(1, entry.view.conversation.id, '1-answer') : [];
        const all = [...ops, ...extra];
        for (const id of entry.expected.nodes)
            expect(all.some((op) => op.op === 'add-node' && op.node.id === id), id).toBe(true);
        for (const kind of entry.expected.edges)
            expect(all.some((op) => op.op === 'add-edge' && op.edge.kind === kind), kind).toBe(true);
    });

    it('gives every scenario a URL shot and a tracked file name', () => {
        const shots = new Map(SHOTS.map((shot) => [shot.id, shot]));
        for (const entry of SCENARIOS) {
            expect(shots.get(entry.id)?.file).toBe(`pi-durable/${entry.id}.png`);
            expect(shots.get(entry.id)?.rail ?? 'graph').toBe(entry.rail);
        }
    });

    it('names a scenario and an existing test for every Core coverage row', () => {
        const dir = resolve(import.meta.dirname);
        const tests = new Set(readdirSync(dir));
        for (const row of CORE_COVERAGE) {
            const scenario = SCENARIOS.find((entry) => entry.row === row.row || entry.id === row.scenario);
            expect(scenario?.id, row.row).toBe(row.scenario);
            expect(tests.has(row.test), row.test).toBe(true);
            expect(existsSync(resolve(dir, row.test)), row.test).toBe(true);
        }
    });
});
