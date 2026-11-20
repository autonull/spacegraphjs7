import { describe, expect, test } from 'vitest';
import {
    decodePermalink,
    encodePermalink,
    isRevealHash,
    type PermalinkState,
} from '../src/permalink';

const state: PermalinkState = {
    surface: 'hybrid',
    arrangement: 'side',
    depth: 'orbit',
    depthAxis: 'turn',
    level: 'auto',
    focus: 'turn-3:action-4',
    viewport: { zoom: 1.25, center: [-12.5, 40, 7] },
    filter: 'failed',
};

describe('full-state permalinks', () => {
    test('round-trips exactly', () => {
        const hash = encodePermalink(state);
        expect(hash.startsWith('#s=')).toBe(true);
        expect(decodePermalink(hash)).toEqual(state);
    });

    test('keeps #graph:<id> as the reveal-only subset', () => {
        expect(isRevealHash('#graph:action-4')).toBe(true);
        expect(isRevealHash('#s=%7B%22surface%22')).toBe(false);
        expect(decodePermalink('#graph:action-4')).toBeNull();
    });

    test('rejects malformed and partial state instead of guessing', () => {
        expect(decodePermalink('#s=not-json')).toBeNull();
        expect(decodePermalink('#s=%7B%22surface%22%3A%22map%22%7D')).toBeNull();
        expect(decodePermalink('')).toBeNull();
    });

    test('encodes within the 2 ms budget', () => {
        const start = performance.now();
        for (let i = 0; i < 500; i++) decodePermalink(encodePermalink(state));
        expect((performance.now() - start) / 500).toBeLessThan(2);
    });
});
