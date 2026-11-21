// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { ContrastAuditor, DEFAULT_THEME, type RenderTheme } from '@spacegraphjs/renderer';
import { cardMarkup } from '../src/adapter';
import { POLICY_SCHEMA, defaultVector } from '../src/policy';
import { VIEW_PALETTES, paletteTheme, paletteVars } from '../src/theme';

const LIGHT_THEME: RenderTheme = {
    ...DEFAULT_THEME,
    background: '#f7f7f7',
    surface: '#ffffff',
    surfaceMuted: '#eeeeee',
    text: '#161616',
    textMuted: '#5c5c5c',
    border: '#cccccc',
};

const card = {
    id: 'pi:local:x',
    kind: 'message',
    label: 'a message',
    status: 'complete' as const,
    scope: 'unit-1',
    focusRole: 'focus' as const,
};

describe('semantic view palette', () => {
    test('every palette publishes the five attention roles', () => {
        for (const id of Object.keys(VIEW_PALETTES)) {
            const vars = paletteVars(id);
            for (const role of ['focus', 'context', 'causal', 'scope', 'severity'])
                expect(vars[`--view-${role}`]).toMatch(/^#/);
        }
    });

    test('every palette passes the contrast audit in both themes', () => {
        const auditor = new ContrastAuditor();
        for (const id of Object.keys(VIEW_PALETTES)) {
            expect(auditor.failingRoles(paletteTheme(DEFAULT_THEME, id)), `dark ${id}`).toEqual([]);
            expect(auditor.failingRoles(paletteTheme(LIGHT_THEME, id)), `light ${id}`).toEqual([]);
        }
    });
});

describe('card shape language', () => {
    test('cards carry a structural layer and a focus role on every rung', () => {
        for (const rung of ['overview', 'execution', 'detail'] as const) {
            const html = cardMarkup(card, rung, { count: 0, dimmed: false });
            expect(html).toContain('class="rung-shape"');
            expect(html).toContain('data-focus="focus"');
            expect(html).toContain('data-portal="unit-1"');
            expect(html).not.toContain('data-radius');
        }
    });

    test('severity and focus leave the dashed canvas outline suppressed', () => {
        const failed = cardMarkup(
            { ...card, kind: 'error', status: 'failed' as const, focusRole: 'none' as const },
            'detail',
            { count: 0, dimmed: false },
        );
        expect(failed).toContain('data-status="failed"');
        expect(failed).toContain('data-focus="none"');
        expect(failed).toContain('class="rung-shape"');
    });
});

describe('grammar policy defaults', () => {
    test('ribbons rank causal relations and salience sizing stays bounded', () => {
        const vector = defaultVector(POLICY_SCHEMA);
        expect(vector['emphasis.ribbonKinds']).toBe('causal');
        expect(vector['emphasis.salienceSize']).toBe(1.15);
        expect(vector['theme.backdrop']).toBe('grid');
    });
});
