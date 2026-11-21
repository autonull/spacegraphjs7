import { DEFAULT_THEME } from '@spacegraphjs/renderer';
import { describe, expect, it } from 'vitest';
import { POLICY_PRESETS, POLICY_SCHEMA } from '../src/policy';
import { SHOTS, shotById } from '../src/shots';
import { paletteTheme, paletteVars, VIEW_PALETTES } from '../src/theme';

describe('shot catalog', () => {
    it('has unique ids and output files', () => {
        expect(new Set(SHOTS.map((shot) => shot.id)).size).toBe(SHOTS.length);
        expect(new Set(SHOTS.map((shot) => shot.file)).size).toBe(SHOTS.length);
    });

    it('only names real presets and knobs', () => {
        const presets = new Set(POLICY_PRESETS.map((preset) => preset.id));
        const knobs = new Set(POLICY_SCHEMA.knobs.map((knob) => knob.id));
        for (const shot of SHOTS) {
            if (shot.preset) expect(presets.has(shot.preset), `${shot.id}: ${shot.preset}`).toBe(true);
            for (const id of Object.keys(shot.vector ?? {}))
                expect(knobs.has(id), `${shot.id}: ${id}`).toBe(true);
        }
    });

    it('names a real preset palette for every palette shot', () => {
        const palettes = new Set(Object.keys(VIEW_PALETTES));
        for (const shot of SHOTS) {
            const preset = POLICY_PRESETS.find((entry) => entry.id === shot.preset);
            const palette = preset?.vector['theme.palette'];
            if (palette !== undefined) expect(palettes.has(String(palette))).toBe(true);
        }
    });

    it('resolves a shot by id and ignores unknown ids', () => {
        expect(shotById('node-detail')?.title).toBe('Node detail');
        expect(shotById('missing')).toBeUndefined();
        expect(shotById(null)).toBeUndefined();
    });
});

describe('view palettes', () => {
    it('maps each palette to per-kind and backdrop variables', () => {
        for (const id of Object.keys(VIEW_PALETTES)) {
            const vars = paletteVars(id);
            expect(vars['--kind-run']).toMatch(/^#/);
            expect(vars['--kind-error']).toMatch(/^#/);
            expect(vars['--view-grid']).toContain('rgba');
        }
    });

    it('varies renderer roles without touching the HUD base theme', () => {
        const neon = paletteTheme(DEFAULT_THEME, 'neon');
        expect(neon.accent).not.toBe(DEFAULT_THEME.accent);
        expect(neon.background).toBe(DEFAULT_THEME.background);
        expect(neon.fontFamily).toBe(DEFAULT_THEME.fontFamily);
    });

    it('falls back to mono for an unknown palette', () => {
        expect(paletteTheme(DEFAULT_THEME, 'missing')).toEqual(paletteTheme(DEFAULT_THEME, 'mono'));
    });
});
