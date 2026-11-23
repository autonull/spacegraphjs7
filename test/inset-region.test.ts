import { describe, expect, test } from 'vitest';
import { insetRegion, normalizeInsets } from 'spacegraphjs/utils';

describe('inset helpers', () => {
    test('normalizeInsets fills omitted sides with zero', () => {
        expect(normalizeInsets()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
        expect(normalizeInsets({ left: 12, top: 8 })).toEqual({
            left: 12,
            top: 8,
            right: 0,
            bottom: 0,
        });
    });

    test('insetRegion returns the usable box and its top-left offset', () => {
        expect(
            insetRegion({ width: 1000, height: 800 }, { left: 40, top: 20, right: 60, bottom: 80 }),
        ).toEqual({
            width: 900,
            height: 700,
            left: 40,
            top: 20,
        });
        expect(insetRegion({ width: 1000, height: 800 })).toEqual({
            width: 1000,
            height: 800,
            left: 0,
            top: 0,
        });
    });

    test('insetRegion rejects a non-positive area', () => {
        expect(insetRegion({ width: 100, height: 100 }, { left: 80, right: 30 })).toBeUndefined();
        expect(insetRegion({ width: 100, height: 100 }, { top: 100, bottom: 0 })).toBeUndefined();
    });
});
