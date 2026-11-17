// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ScaleDomain, type ScaleStop } from '../src/zoom';

const STOPS: readonly ScaleStop[] = [
    { id: 'overview', at: 0, label: 'Overview', importance: 0.1, transitionDuration: 0.5 },
    { id: 'execution', at: 0.34, label: 'Execution', importance: 0.4 },
    { id: 'detail', at: 0.67, label: 'Detail', importance: 0.7 },
    { id: 'micro', at: 1, label: 'Micro', importance: 1 },
];

const perspective = { min: 50, max: 2000, closerIsLarger: false };
const orthographic = { min: 0.01, max: 100, closerIsLarger: true };

describe('ScaleDomain', () => {
    it('samples a continuous position and interpolated semantic importance', () => {
        const domain = new ScaleDomain({ stops: STOPS, range: perspective });
        const sample = domain.sample(0.5);
        expect(sample.stop).toBe('execution');
        expect(sample.position).toBeCloseTo(1.4848, 3);
        expect(sample.importance).toBeCloseTo(0.5455, 3);
        expect(sample.transitionDuration).toBe(0);
        expect(domain.sample(1)).toMatchObject({ stop: 'micro', position: 3, importance: 1 });
    });

    it('delegates band resolution and hysteresis to ZoomBands', () => {
        const domain = new ScaleDomain({ stops: STOPS, range: perspective, hysteresis: 0.05 });
        const listener = vi.fn();
        domain.onChange(listener);
        expect(domain.feedNormalized(0.33).stop).toBe('overview');
        expect(domain.feedNormalized(0.35).stop).toBe('overview');
        expect(domain.feedNormalized(0.4).stop).toBe('execution');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('keeps an anchor invariant and round-trips the camera target', () => {
        for (const range of [perspective, orthographic]) {
            const domain = new ScaleDomain({ stops: STOPS, range });
            const from = domain.sample(0.2);
            const to = domain.sample(0.8);
            const anchor = { world: { x: 10, y: 4, z: -2 }, target: { x: 0, y: 0, z: 0 } };
            const moved = domain.anchoredTarget(from, to, anchor);
            const back = domain.anchoredTarget(to, from, { ...anchor, target: moved });
            expect(back.x).toBeCloseTo(anchor.target.x);
            expect(back.y).toBeCloseTo(anchor.target.y);
            expect(back.z).toBeCloseTo(anchor.target.z);
            const raw = (range.min + range.max) / 2;
            expect(domain.rawAt(domain.normalizedAt(raw))).toBeCloseTo(raw);
        }
    });

    it('is deterministic across instances and rejects invalid stops', () => {
        const sequence = [0.1, 0.4, 0.9, 0.4];
        const trace = () => {
            const domain = new ScaleDomain({ stops: STOPS, range: perspective });
            return sequence.map((value) => domain.feedNormalized(value));
        };
        expect(trace()).toEqual(trace());
        expect(() => new ScaleDomain({ stops: [STOPS[0]!], range: perspective })).toThrow();
        expect(
            () =>
                new ScaleDomain({
                    stops: [STOPS[0]!, { id: 'gapped', at: 0.9 }],
                    range: perspective,
                }),
        ).toThrow();
    });
});
