import { describe, expect, it } from 'vitest';
import {
    REPRESENTATION_EASINGS,
    playRepresentationChanges,
    type RepresentationTween,
} from 'spacegraphjs/representations';

const change: RepresentationTween = { id: 'n1', from: 'dot', to: 'widget', duration: 0.5 };

describe('representation playback (P1.3)', () => {
    it('emits an eased value at each step and keeps the stable id', () => {
        const frames: { id: string; value: number }[] = [];
        const player = playRepresentationChanges([change], (tween, value) =>
            frames.push({ id: tween.id, value }),
        );

        expect(player.active).toEqual(['n1']);
        player.advance(0.25);
        expect(frames.at(-1)).toEqual({ id: 'n1', value: 0.875 });
        player.advance(0.25);
        expect(frames.at(-1)).toEqual({ id: 'n1', value: 1 });
        expect(player.done).toBe(true);
        expect(player.active).toEqual([]);
        expect(frames.every((frame) => frame.id === 'n1')).toBe(true);
    });

    it('plays every swap with its own duration and drops finished ones', () => {
        const seen: string[] = [];
        const player = playRepresentationChanges(
            [change, { id: 'n2', from: 'card', to: 'detail', duration: 1 }],
            (tween, value) => value >= 1 && seen.push(tween.id),
        );
        player.advance(0.5);
        expect(seen).toEqual(['n1']);
        expect(player.active).toEqual(['n2']);
        player.finish();
        expect(seen).toEqual(['n1', 'n2']);
        expect(player.done).toBe(true);
    });

    it('jumps straight to the final frame under reduced motion', () => {
        const values: number[] = [];
        const player = playRepresentationChanges([change], (_tween, value) => values.push(value), {
            reducedMotion: true,
        });
        expect(values).toEqual([1]);
        expect(player.done).toBe(true);
        player.advance(10);
        expect(values).toEqual([1]);
    });

    it('treats a zero duration as an instant swap', () => {
        const values: number[] = [];
        const player = playRepresentationChanges(
            [{ ...change, duration: 0 }],
            (_tween, value) => values.push(value),
        );
        expect(values).toEqual([]);
        expect(player.done).toBe(true);
    });

    it('exposes the gsap-equivalent easing family', () => {
        expect(REPRESENTATION_EASINGS.linear(0.5)).toBe(0.5);
        expect(REPRESENTATION_EASINGS['power1.out'](0.5)).toBe(0.75);
        expect(REPRESENTATION_EASINGS['power2.out'](1)).toBe(1);
        expect(REPRESENTATION_EASINGS['power2.inOut'](0.5)).toBe(0.5);
    });
});
