// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nodeSize } from '../src/adapter';
import { measurePresence, type PresenceInput } from '../src/policy/measurement';
import { POLICY_SCHEMA } from '../src/policy/schema';
import { resolvePolicy } from '../src/policy/resolve';
import { presenceBaseline, presenceVariant } from '../scripts/baseline';

const values = resolvePolicy(POLICY_SCHEMA).vector;
const nodes = [
    { id: 'a', kind: 'run', label: 'alpha' },
    { id: 'b', kind: 'action', label: 'beta' },
];
const positions = new Map([
    ['a', { x: 0, y: 0, z: 0 }],
    ['b', { x: 240, y: 0, z: 0 }],
]);
const input: PresenceInput = {
    id: 'probe',
    nodes,
    positions,
    viewport: { width: 1000, height: 600 },
    values,
    sizeOf: (kind, dense) => nodeSize(kind, true, dense),
    padding: 40,
};

describe('visual presence measurement', () => {
    it('reports finite, bounded measures without a target value', () => {
        const sample = measurePresence(input);
        expect(sample.id).toBe('probe');
        expect(sample.nodes).toBe(2);
        expect(sample.octave).toBe(0);
        expect(Number.isFinite(sample.occupancy)).toBe(true);
        expect(sample.occupancy).toBeGreaterThan(0);
        expect(sample.labelCoverage).toBeGreaterThanOrEqual(0);
        expect(sample.labelCoverage).toBeLessThanOrEqual(1);
    });

    it('grows with octave and stays deterministic', () => {
        const far = measurePresence({ ...input, octave: -1 });
        const mid = measurePresence(input);
        const near = measurePresence({ ...input, octave: 1 });
        expect(far.occupancy).toBeLessThan(mid.occupancy);
        expect(mid.occupancy).toBeLessThan(near.occupancy);
        expect(measurePresence(input)).toEqual(mid);
    });

    it('skips nodes that have no solved position', () => {
        const sample = measurePresence({
            ...input,
            positions: new Map([['a', positions.get('a')!]]),
        });
        expect(sample.nodes).toBe(1);
    });

    it('captures the fit matrix and cockpit as a baseline report', () => {
        const report = presenceBaseline();
        expect(report.version).toBe(1);
        expect(report.method).toContain('Offline');
        expect(report.samples).toHaveLength(7);
        expect(report.samples.map((sample) => sample.id)).toEqual(
            expect.arrayContaining(['fit-wide-far', 'fit-wide-mid', 'fit-narrow-near', 'cockpit']),
        );
        for (const sample of report.samples) {
            expect(Number.isFinite(sample.occupancy)).toBe(true);
            expect(Number.isFinite(sample.labelCoverage)).toBe(true);
        }
    });
});

describe('scale-aware packing comparison', () => {
    it('raises mid and near coverage without packing the topology view', () => {
        const comparison = presenceVariant();
        expect(comparison.incumbent.samples).toHaveLength(comparison.samples.length);
        const incumbent = new Map(comparison.incumbent.samples.map((sample) => [sample.id, sample]));
        for (const sample of comparison.samples) {
            const before = incumbent.get(sample.id)!;
            const midOrNear = sample.octave >= 0;
            if (midOrNear) {
                expect(sample.occupancy).toBeGreaterThan(before.occupancy);
                expect(sample.labelCoverage).toBeGreaterThanOrEqual(before.labelCoverage);
            } else {
                expect(sample.occupancy).toBe(before.occupancy);
                expect(sample.labelCoverage).toBe(before.labelCoverage);
            }
        }
    });
});
