import { describe, expect, it } from 'vitest';
import {
    ScopeSimulation,
    buildScopeTree,
    layoutScopes,
    type Position,
    type ScopeSpec,
} from '../../src/layout';

const simple: ScopeSpec[] = [
    { id: 'root', strategy: 'grid', nodes: [{ id: 'a', size: [100, 40] }, { id: 'b', size: [100, 40] }] },
];

const targetOf = (specs: readonly ScopeSpec[]) => layoutScopes(buildScopeTree(specs));

describe('scope simulation', () => {
    it('converges to the solved target and then sleeps', () => {
        const sim = new ScopeSimulation();
        sim.setSpecs(simple);
        expect(sim.settled).toBe(false);

        for (let i = 0; i < 180; i++) sim.advance(1 / 60);

        const target = targetOf(simple);
        expect(sim.settled).toBe(true);
        expect(sim.energy).toBe(0);
        for (const [id, position] of target.positions) {
            expect(sim.positions.get(id)).toEqual(position);
        }
    });

    it('is deterministic for the same specs and steps', () => {
        const a = new ScopeSimulation();
        const b = new ScopeSimulation();
        a.setSpecs(simple);
        b.setSpecs(simple);
        for (let i = 0; i < 12; i++) {
            a.advance(1 / 60);
            b.advance(1 / 60);
        }

        expect([...a.positions]).toEqual([...b.positions]);
        expect(a.steps).toBe(b.steps);
    });

    it('holds pinned bodies at the target throughout the motion', () => {
        const target = targetOf(simple).positions.get('root/a')!;
        const sim = new ScopeSimulation({ pinned: new Set(['root/a']) });

        sim.setSpecs(simple);
        sim.advance(1 / 60);
        expect(sim.positions.get('root/a')).toEqual(target);

        for (let i = 0; i < 120; i++) sim.advance(1 / 60);
        expect(sim.positions.get('root/a')).toEqual(target);
    });

    it('spawns new bodies at their owning scope origin', () => {
        const sim = new ScopeSimulation();
        sim.setSpecs([
            { id: 'root', nodes: [{ id: 'portal', scope: 'child' }] },
            { id: 'child', parent: 'root', nodes: [{ id: 'x' }] },
        ]);
        const view = sim.view();

        expect(view.positions.get('root/portal')).toEqual({ x: 0, y: 0, z: 0 });
        expect(view.frames.get('root/child')!.origin).toEqual({ x: 0, y: 0, z: 0 });
        expect(sim.settled).toBe(false);
    });

    it('does not jitter once settled', () => {
        const sim = new ScopeSimulation({ instant: true });
        sim.setSpecs(simple);
        const before = [...sim.positions];

        sim.advance(5);

        expect([...sim.positions]).toEqual(before);
        expect(sim.settled).toBe(true);
    });

    it('snaps to the target with the instant option', () => {
        const sim = new ScopeSimulation({ instant: true });
        sim.setSpecs(simple);
        const target = targetOf(simple);

        expect(sim.settled).toBe(true);
        for (const [id, position] of target.positions) {
            expect(sim.positions.get(id)).toEqual(position);
        }
    });

    it('caps catch-up steps to avoid a spiral', () => {
        const sim = new ScopeSimulation({ maxSteps: 2 });
        sim.setSpecs(simple);

        sim.advance(10);

        expect(sim.steps).toBe(2);
    });

    it('wakes sleeping bodies when the target changes', () => {
        const sim = new ScopeSimulation();
        sim.setSpecs([{ id: 'root', strategy: 'grid', nodes: [{ id: 'a', size: [100, 40] }] }]);
        sim.settle();
        const before = sim.positions.get('root/a')!;

        sim.setSpecs([{ id: 'root', strategy: 'force', nodes: [{ id: 'a', size: [100, 40] }] }]);
        expect(sim.settled).toBe(false);
        sim.advance(1 / 60);
        expect(sim.positions.get('root/a')).not.toEqual(before);
    });

    it('loses energy while converging', () => {
        const sim = new ScopeSimulation();
        sim.setSpecs(simple);

        const first = (() => {
            sim.advance(1 / 60);
            return sim.energy;
        })();
        for (let i = 0; i < 120; i++) sim.advance(1 / 60);

        expect(first).toBeGreaterThan(sim.energy);
        expect(sim.energy).toBe(0);
    });

    it('projects edges from animated endpoints until they settle', () => {
        const specs: ScopeSpec[] = [
            {
                id: 'root',
                nodes: [{ id: 'a' }, { id: 'portal', scope: 'child' }],
                edges: [{ id: 'bridge', source: 'a', target: 'child/x' }],
            },
            { id: 'child', parent: 'root', nodes: [{ id: 'x' }] },
        ];
        const sim = new ScopeSimulation();
        sim.setSpecs(specs);

        const moving = sim.view().edges.find((edge) => edge.id === 'bridge')!;
        sim.settle();
        const resting = sim.view().edges.find((edge) => edge.id === 'bridge')!;
        const target = targetOf(specs).edges.find((edge) => edge.id === 'bridge')!;

        expect(moving.from).toEqual({ x: 0, y: 0, z: 0 });
        expect(resting.from).toEqual(target.from);
        expect(resting.to).toEqual(target.to);
    });

    it('derives locals from animated frames', () => {
        const sim = new ScopeSimulation({ instant: true });
        sim.setSpecs([
            { id: 'root', scale: 2, nodes: [{ id: 'a', size: [80, 40] }] },
        ]);
        const view = sim.view();
        const origin = view.frames.get('root')!.origin;

        const local = view.locals.get('root/a') as Position;
        const world = view.positions.get('root/a')!;
        expect(world.x).toBeCloseTo(origin.x + 2 * local.x);
        expect(world.y).toBeCloseTo(origin.y + 2 * local.y);
    });
});
