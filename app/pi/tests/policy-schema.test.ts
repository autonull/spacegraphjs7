// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    POLICY_PRESETS,
    POLICY_SCHEMA,
    coerceValue,
    decodePolicyVector,
    defaultVector,
    encodePolicyVector,
    knobByID,
    panelControls,
    presetVector,
    resolvePolicy,
    sanitizeVector,
    withLayer,
} from '../src/policy';

const vector = (overrides: Record<string, string | number | boolean> = {}) => ({
    ...Object.fromEntries(POLICY_SCHEMA.knobs.map((knob) => [knob.id, knob.default])),
    ...overrides,
});

describe('policy schema', () => {
    it('describes every family with typed, bounded knobs', () => {
        expect(POLICY_SCHEMA.knobs.length).toBeGreaterThan(20);
        for (const knob of POLICY_SCHEMA.knobs) {
            expect(knob.id).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
            expect(knob.description.length).toBeGreaterThan(0);
            expect(knob.rationale.length).toBeGreaterThan(0);
            if (knob.type === 'number') {
                expect(knob.default).toBeGreaterThanOrEqual(knob.min);
                expect(knob.default).toBeLessThanOrEqual(knob.max);
            }
            if (knob.type === 'enum') expect(knob.options).toContain(knob.default);
        }
        expect(knobByID(POLICY_SCHEMA, 'bands.overviewMax')?.family).toBe('bands');
        expect(defaultVector(POLICY_SCHEMA)['depth.mode']).toBe('flat');
        expect(defaultVector(POLICY_SCHEMA)['depth.step']).toBe(40);
        expect(knobByID(POLICY_SCHEMA, 'ladder.minLabelPx')?.default).toBe(14);
    });

    it('coerces once at the boundary and drops invalid values', () => {
        const number = knobByID(POLICY_SCHEMA, 'camera.verbMs')!;
        expect(coerceValue(number, '250')).toBe(250);
        expect(coerceValue(number, 99999)).toBe(3000);
        expect(coerceValue(number, 'nope')).toBeUndefined();
        const flag = knobByID(POLICY_SCHEMA, 'navigation.minimap')!;
        expect(coerceValue(flag, 'false')).toBe(false);
        const enumeration = knobByID(POLICY_SCHEMA, 'theme.variant')!;
        expect(coerceValue(enumeration, 'sepia')).toBeUndefined();
        expect(sanitizeVector(POLICY_SCHEMA, { 'camera.verbMs': 200, unknown: 1 })).toEqual({
            'camera.verbMs': 200,
        });
    });
});

describe('policy resolution', () => {
    it('applies fixed precedence and records provenance per knob', () => {
        const layers = {
            preset: { 'camera.verbMs': 400, 'theme.variant': 'light' },
            experiment: { 'camera.verbMs': 500 },
            url: { 'camera.verbMs': 600 },
            panel: { 'camera.verbMs': 700 },
        };
        const resolved = resolvePolicy(POLICY_SCHEMA, layers);
        expect(resolved.values['camera.verbMs']).toBe(700);
        expect(resolved.provenance['camera.verbMs']).toBe('panel');
        expect(resolved.values['theme.variant']).toBe('light');
        expect(resolved.provenance['theme.variant']).toBe('preset');
        expect(resolved.values['geometry.gap']).toBe(190);
        expect(resolved.provenance['geometry.gap']).toBe('defaults');
    });

    it('merges one layer without mutating the others', () => {
        const first = withLayer(POLICY_SCHEMA, {}, 'preset', { 'bands.detailMin': 2.4 });
        const second = withLayer(POLICY_SCHEMA, first, 'panel', { 'bands.detailMin': 3 });
        expect(first.preset?.['bands.detailMin']).toBe(2.4);
        expect(second.preset?.['bands.detailMin']).toBe(2.4);
        expect(resolvePolicy(POLICY_SCHEMA, second).values['bands.detailMin']).toBe(3);
    });

    it('round-trips a compact vector and exposes it to the panel', () => {
        const original = vector({ 'camera.verbMs': 250, 'navigation.minimap': false });
        const encoded = encodePolicyVector(POLICY_SCHEMA, original);
        expect(encoded.startsWith('p1.')).toBe(true);
        expect(decodePolicyVector(POLICY_SCHEMA, encoded)).toEqual(original);
        const resolved = resolvePolicy(POLICY_SCHEMA, { panel: original });
        const groups = panelControls(POLICY_SCHEMA, resolved);
        expect(groups.length).toBeGreaterThan(10);
        const camera = groups.find((group) => group.family === 'camera')!;
        expect(camera.controls.find((item) => item.knob.id === 'camera.verbMs')?.source).toBe('panel');
    });
});

describe('preset gallery', () => {
    it('makes every preset a data-only vector with a question', () => {
        expect(POLICY_PRESETS.every((preset) => preset.question.length > 0)).toBe(true);
        const quiet = presetVector(POLICY_SCHEMA, 'quiet')!;
        expect(quiet['camera.verbMs']).toBe(250);
        expect(resolvePolicy(POLICY_SCHEMA, { preset: quiet }).values['navigation.minimap']).toBe(false);
        expect(presetVector(POLICY_SCHEMA, 'missing')).toBeUndefined();
    });
});
