import { describe, expect, test } from 'bun:test';
import { ContrastAuditor, DEFAULT_THEME, resolveTheme } from '@spacegraphjs/renderer';

describe('SpaceGraph renderer theme', () => {
    test('the palette is legible on its own', () => {
        expect(new ContrastAuditor().failingRoles(DEFAULT_THEME)).toEqual([]);
    });

    test('the host variables win and the palette fills the gaps', () => {
        const tokens = {
            background: '--host-background',
            text: '--host-text',
            textMuted: '--host-text-muted',
            fontFamily: '--host-font',
        };
        const values: Record<string, string> = {
            '--host-background': '#000000',
            '--host-text': '#ffffff',
            '--host-text-muted': '#aaaaaa',
            '--host-font': 'Inter, sans-serif',
        };
        const theme = resolveTheme(tokens, (name) => values[name] ?? '', DEFAULT_THEME);

        expect(theme.background).toBe('#000000');
        expect(theme.text).toBe('#ffffff');
        expect(theme.textMuted).toBe('#aaaaaa');
        expect(theme.fontFamily).toBe('Inter, sans-serif');
        expect(theme.surface).toBe(DEFAULT_THEME.surface);
        expect(theme.fontSize).toBe(13);
    });
});
