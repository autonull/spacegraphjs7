// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    CAMERA_VERBS,
    CameraVerbRegistry,
    DEFAULT_CAMERA_POLICY,
    MOTION_VERBS,
    MotionDirector,
    SPRING_PRESETS,
    contentZoomBounds,
    orbitEnabled,
    playMotion,
    springEasing,
    type CameraAdapter,
    type MotionFrame,
    type MotionStep,
} from 'spacegraphjs/motion';

const steps: MotionStep[] = [
    { id: 'a', verb: 'arrive', target: 'camera', from: 0, to: 1, duration: 1 },
    { id: 'b', verb: 'emphasize', target: 'emphasis', from: 1, to: 0, duration: 1 },
];

function adapterLog() {
    const calls: string[] = [];
    const adapter: CameraAdapter = {
        fit: (ids, duration) => calls.push(`fit:${ids?.join(',') ?? ''}:${duration}`),
        focus: (id, duration) => calls.push(`focus:${id}:${duration}`),
        flyTo: (position, target) => calls.push(`flyTo:${position.join(',')}:${target.join(',')}`),
        orbit: (amount) => calls.push(`orbit:${amount}`),
        zoom: (amount) => calls.push(`zoom:${amount}`),
        reset: () => calls.push('reset'),
    };
    return { calls, adapter };
}

describe('motion director (P4.1)', () => {
    it('declares every named verb and no library default', () => {
        expect(MOTION_VERBS).toEqual([
            'arrive',
            'emphasize',
            'trace',
            'flyTo',
            'sweep',
            'follow',
            'decay',
            'compact',
        ]);
    });

    it('plays staggered steps with eased values and stable ids', () => {
        const seen: MotionFrame[] = [];
        const playback = playMotion(steps, (frame) => seen.push(frame), {
            ease: 'linear',
            stagger: 0.5,
        });
        expect(playback.duration).toBe(1.5);
        expect(playback.advance(0.25)).toHaveLength(1);
        expect(playback.advance(0.5)).toHaveLength(2);
        expect(seen[0]?.step.id).toBe('a');
        expect(seen[0]?.value).toBeCloseTo(0.25);
        expect(playback.active).toEqual(['a', 'b']);
        playback.finish();
        expect(seen.at(-1)?.value).toBeCloseTo(0);
        expect(playback.done).toBe(true);
    });

    it('emits only final frames under reduced motion', () => {
        const seen: MotionFrame[] = [];
        const playback = playMotion(steps, (frame) => seen.push(frame), { reducedMotion: true });
        expect(playback.done).toBe(true);
        expect(seen.map((frame) => frame.value)).toEqual([1, 0]);
        expect(playback.advance(1)).toHaveLength(0);
    });

    it('routes frames only to verbs a host registered', () => {
        const applied: string[] = [];
        const director = new MotionDirector().register('arrive', (frame) =>
            applied.push(frame.step.id),
        );
        const playback = director.play(steps, { reducedMotion: true });
        expect(playback.frames).toHaveLength(2);
        expect(applied).toEqual(['a']);
        expect(director.verbs()).toEqual(['arrive']);
    });

    it('provides analytic spring curves with stable endpoints', () => {
        const spring = springEasing(SPRING_PRESETS.snappy);
        expect(spring(0)).toBeCloseTo(0);
        expect(spring(1)).toBeCloseTo(1);
    });
});

describe('camera verbs (P4.2)', () => {
    it('sequences neutral defaults against the host adapter', () => {
        const { calls, adapter } = adapterLog();
        const registry = new CameraVerbRegistry();
        registry.run({ verb: 'fit', ids: ['n1'], duration: 2 }, adapter);
        registry.run({ verb: 'focus', ids: ['n2'] }, adapter);
        registry.run({ verb: 'zoom', amount: 1.5 }, adapter);
        registry.run({ verb: 'reset' }, adapter);
        expect(calls).toEqual(['fit:n1:2', 'focus:n2:1', 'zoom:1.5', 'reset']);
        expect([...CAMERA_VERBS]).toContain('orbit');
    });

    it('lets a host override a verb without editing the library', () => {
        const { calls, adapter } = adapterLog();
        const registry = new CameraVerbRegistry().register('orbit', (command, target) =>
            target.orbit((command.amount ?? 0) * 2, 0),
        );
        registry.run({ verb: 'orbit', amount: 0.25 }, adapter);
        expect(calls).toEqual(['orbit:0.5']);
    });

    it('exposes orthographic orbit and content-relative zoom as policy, not default', () => {
        expect(orbitEnabled(true)).toBe(false);
        expect(orbitEnabled(true, { ...DEFAULT_CAMERA_POLICY, orbitInOrthographic: true })).toBe(
            true,
        );
        expect(orbitEnabled(false)).toBe(true);
        expect(contentZoomBounds(10).min).toBeCloseTo(10 / 3);
        expect(contentZoomBounds(10).max).toBe(25);
        expect(
            contentZoomBounds(10, { ...DEFAULT_CAMERA_POLICY, contentRelativeZoom: false }),
        ).toEqual({
            min: 0.01,
            max: 100,
        });
    });
});
