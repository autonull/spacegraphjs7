// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nodeSize } from '../src/adapter';
import {
    DENSE_LABEL_PX,
    denseType,
    presetById,
    resolvePolicy,
    POLICY_SCHEMA,
    adaptiveInsets,
    aspectChanged,
    FIT_OCTAVES,
} from '../src/policy';

describe('adaptive fit target', () => {
    it('derives insets from the short side and biases narrow canvases vertically', () => {
        const wide = adaptiveInsets(1600, 1000, 40);
        const narrow = adaptiveInsets(900, 1000, 40);
        expect(wide.top).toBeGreaterThan(0);
        expect(wide.left).toBe(wide.top);
        expect(narrow.left).toBeLessThan(narrow.top);
    });

    it('refits only on a material aspect change and spans three octaves', () => {
        expect(aspectChanged(1.6, 1.56)).toBe(false);
        expect(aspectChanged(1.6, 0.9)).toBe(true);
        expect(aspectChanged(0, 0.9)).toBe(false);
        expect(FIT_OCTAVES).toEqual([-1, 0, 1]);
    });
});

describe('opt-in dense typography', () => {
    it('stays off at the default label floor and on at the preset floor', () => {
        const defaults = Object.fromEntries(POLICY_SCHEMA.knobs.map((knob) => [knob.id, knob.default]));
        expect(denseType(defaults)).toBe(false);
        expect(defaults['ladder.minLabelPx']).toBeLessThan(DENSE_LABEL_PX);
        const preset = presetById('dense-type')!;
        const resolved = resolvePolicy(POLICY_SCHEMA, { preset: preset.vector });
        expect(resolved.values['ladder.minLabelPx']).toBe(DENSE_LABEL_PX);
        expect(resolved.provenance['ladder.minLabelPx']).toBe('preset');
        expect(denseType(resolved.values)).toBe(true);
    });

    it('tightens card height without truncating labels or changing dots', () => {
        const [wide, high] = nodeSize('run', true);
        const [denseWide, denseHigh] = nodeSize('run', true, true);
        expect(denseWide).toBe(wide);
        expect(denseHigh).toBeLessThan(high);
        expect(nodeSize('artifact', false, true)).toEqual(nodeSize('artifact', false));
    });
});
