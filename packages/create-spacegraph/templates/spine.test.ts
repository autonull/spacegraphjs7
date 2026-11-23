// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PRESETS, SCENARIOS, Recorder, decode, defaults, encode, preset, resolve, scene } from '../src/spine';

describe('generated experiment spine', () => {
    it('resolves knobs with provenance and fixed precedence', () => {
        const result = resolve({ window: 120 }, { surface: 'map' }, { window: 200 });
        expect(result.values.window).toBe(200);
        expect(result.provenance.window).toBe('panel');
        expect(result.provenance.surface).toBe('url');
        expect(result.provenance.emphasis).toBe('defaults');
        expect(defaults().surface).toBe('hybrid');
    });

    it('round-trips a permalink vector and records neutral events', () => {
        const values = { ...defaults(), window: 90, minimap: false };
        const encoded = encode(values);
        expect(decode(encoded)).toEqual(values);
        expect(decode('nope')).toBeUndefined();
        const recorder = new Recorder();
        recorder.record('surfaceOpen', values);
        recorder.record('answer', values);
        expect(recorder.replay()).toEqual({ surfaceOpen: 1, answer: 1 });
        expect(PRESETS.length).toBeGreaterThan(1);
        expect(preset('quiet')?.minimap).toBe(false);
    });

    it('declares scenarios as data with a lookup', () => {
        expect(SCENARIOS.length).toBeGreaterThan(1);
        expect(scene('agent-chapters')?.layout).toBe('chapters');
        expect(scene('missing')).toBeUndefined();
        for (const entry of SCENARIOS) expect(entry.file).toMatch(/^scenario-.*\.png$/);
    });
});
