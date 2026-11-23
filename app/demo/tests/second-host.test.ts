import { describe, expect, it } from 'vitest';
import type { VisionLoopAnalyzers, VisionReport } from 'spacegraphjs/vision';
import { SecondHost } from '../second-host';

const report = (): VisionReport => ({
    legibility: { wcagAA: true, averageContrast: 7, failures: [] },
    overlap: { hasOverlaps: false, overlapCount: 0, overlaps: [] },
    hierarchy: { hasRoot: true, rootIds: ['root'], depth: 2, levels: [], score: 100 },
    ergonomics: {
        fittsLawCompliant: true,
        averageTargetSize: 60,
        smallTargets: [],
        score: 100,
    },
    overall: { score: 100, grade: 'A', issues: [] },
});

const analyzers = (): VisionLoopAnalyzers => ({
    strategy: 'heuristics',
    analyze: async () => report(),
});

describe('second reference host', () => {
    it('drives camera verbs through the promoted handler and reports the rest unsupported', () => {
        const host = new SecondHost();
        host.setFlight([10, 20, 30]);
        host.fly(1);
        expect(host.moves.some((move) => move.startsWith('flyTo:'))).toBe(true);
        expect(host.viewport.center).toEqual([10, 20, 30]);

        host.setTracePath([
            [0, 0, 0],
            [4, 0, 0],
        ]);
        host.follow(1);
        expect(host.moves.some((move) => move.startsWith('trace:'))).toBe(true);
        expect(host.viewport.center).toEqual([4, 0, 0]);

        const unsupported = host.cameraMotion.reportUnsupported().map((item) => item.id);
        expect(unsupported).toContain('sweep');
        expect(unsupported).not.toContain('flyTo');
        expect(unsupported).not.toContain('trace');
    });

    it('gates the representation rung on activity and legibility', () => {
        const host = new SecondHost();
        expect(host.chooseLevel(0.9, 0.9)).toBe('execution');
        host.level = 'detail';
        expect(host.chooseLevel(0, 0.4)).toBe('execution');
    });

    it('suspends and restores the authority through the promoted play session', () => {
        const host = new SecondHost();
        host.addEnergy(2.5);
        expect(host.play('orbit')).toBe(true);
        expect(host.settings).toMatchObject({ enabled: true, collide: false });
        expect(host.playSession.energy).toBe(2.5);
        expect(host.reconcile()).toBe(true);
        expect(host.settings.enabled).toBe(false);
        expect(host.playSession.active).toBe(false);
        expect(host.playSession.energy).toBe(0);
    });

    it('recognizes gestures through the promoted touch recognizer', () => {
        const host = new SecondHost();
        host.setFlight([10, 20, 30]);
        host.dispatchTouch({ x: 0, y: 0, at: 0 }, 'down');
        host.dispatchTouch({ x: 0, y: -100, at: 20 }, 'move');
        expect(host.dispatchTouch({ x: 0, y: -100, at: 30 }, 'up')).toBe('swipeUp');
        expect(host.touchActions).toEqual(['swipeUp']);
        expect(host.moves.some((move) => move.startsWith('flyTo:'))).toBe(true);
    });

    it('runs the library vision loop without owning layout state', async () => {
        const offline = new SecondHost();
        expect(offline.visionLoop.reportUnsupported()).toHaveLength(1);

        const host = new SecondHost(analyzers());
        const cycle = await host.visionLoop.cycle();
        expect(cycle?.scores.overlap).toBe(0);
        expect(host.visionLoop.strategy).toBe('heuristics');
    });
});
