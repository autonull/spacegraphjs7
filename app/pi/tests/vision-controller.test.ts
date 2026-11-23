// @vitest-environment node
import type { ScopePolicyInput } from 'spacegraphjs/layout';
import { describe, expect, it } from 'vitest';
import type { Position } from '../src/policy/host';
import { VisionController, type VisionHost } from '../src/vision-controller';

const overlapping = (): Map<string, Position> =>
    new Map([
        ['a', { x: 0, y: 0, z: 0 }],
        ['b', { x: 10, y: 10, z: 0 }],
    ]);

const fixture = () => {
    let positions = new Map<string, Position>();
    const policies: ScopePolicyInput[] = [];
    let syncs = 0;
    const host: VisionHost = {
        global: false,
        positions: () => positions,
        focus: () => 'run:1',
        band: () => 2,
        setPolicy: (input) => policies.push(input),
        syncClock: () => {
            syncs++;
        },
        paint: () => {},
    };
    return { host, policies, syncs: () => syncs, setPositions: (value: Map<string, Position>) => { positions = value; } };
};

describe('VisionController', () => {
    it('samples on the 0.4s cadence, not on every advance', () => {
        const f = fixture();
        const vision = new VisionController(f.host);
        f.setPositions(overlapping());

        vision.advance(0.3);
        expect(f.policies).toHaveLength(0);

        vision.advance(0.1);
        expect(f.policies).toHaveLength(1);
        expect(f.policies[0]).toMatchObject({ band: 2, focus: 'run:1' });
        expect(vision.scores).toEqual({ overlap: 0.125, legibility: 0.92 });
        expect(f.syncs()).toBe(1);
    });

    it('publishes only when the scores move beyond the thresholds', () => {
        const f = fixture();
        const vision = new VisionController(f.host);
        f.setPositions(overlapping());

        vision.sample();
        vision.sample();

        expect(f.policies).toHaveLength(1);
    });

    it('carries the configured strategy without contacting an analyzer', () => {
        const vision = new VisionController(fixture().host);
        expect(vision.strategy).toBe('heuristics');
        vision.strategy = 'onnx';
        expect(vision.strategy).toBe('onnx');
    });
});
