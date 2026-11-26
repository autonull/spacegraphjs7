import { describe, expect, test } from 'vitest';
import { FrameClock } from '../src/frame-clock';

describe('FrameClock', () => {
    test('starts once and measures elapsed seconds between frames', () => {
        const clock = new FrameClock();
        expect(clock.running).toBe(false);

        clock.start(1_000);
        clock.start(2_000);
        expect(clock.running).toBe(true);
        expect(clock.frame(1_020)).toBeCloseTo(0.02);
        expect(clock.frame(1_120)).toBeCloseTo(0.05);
    });

    test('counts ticks and samples a positive frame rate', () => {
        const clock = new FrameClock();
        clock.start(0);
        clock.tick();
        clock.sample(clock.frame(100));

        expect(clock.ticks).toBe(1);
        expect(clock.fps).toBeGreaterThan(0);
        expect(clock.fps).toBeLessThanOrEqual(10);
    });

    test('stop clears the running state', () => {
        const clock = new FrameClock();
        clock.start(0);
        clock.stop();

        expect(clock.running).toBe(false);
    });
});
