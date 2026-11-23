// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FpsMeter } from '../src/utils/FpsMeter';

describe('FpsMeter', () => {
    it('starts the clock on the first tick', () => {
        const meter = new FpsMeter(1000);
        expect(meter.tick(0)).toBeUndefined();
        expect(meter.tick(100)).toBeUndefined();
    });

    it('samples after each fixed interval', () => {
        const meter = new FpsMeter(1000);
        meter.tick(0);
        expect(meter.tick(400)).toBeUndefined();
        expect(meter.tick(1000)).toEqual({ fps: 2, elapsed: 1000, frames: 2 });
        expect(meter.tick(1400)).toBeUndefined();
        expect(meter.tick(2000)).toEqual({ fps: 2, elapsed: 1000, frames: 2 });
    });
});
