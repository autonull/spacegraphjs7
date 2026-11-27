// @vitest-environment node
import { DEFAULT_THEME, THEME_ROLES } from '@spacegraphjs/renderer';
import { describe, expect, it } from 'vitest';
import {
    darkTokens,
    DESIGN_TOKEN_THEME_VARS,
    readDesignTokenTheme,
    themeFromDesignTokens,
} from './tokens';

describe('design token → renderer theme bridge', () => {
    it('maps every renderer role to one canonical variable', () => {
        for (const role of THEME_ROLES) expect(DESIGN_TOKEN_THEME_VARS[role]).toBeTruthy();
        expect(DESIGN_TOKEN_THEME_VARS.surface).toBe('--sg-colors-card');
        expect(DESIGN_TOKEN_THEME_VARS.textMuted).toBe('--sg-colors-muted-foreground');
        expect(DESIGN_TOKEN_THEME_VARS.error).toBe('--sg-colors-destructive');
        expect(DESIGN_TOKEN_THEME_VARS.focus).toBe('--sg-colors-ring');
    });

    it('reads a theme from CSS variables and keeps defaults for blanks', () => {
        const values: Record<string, string> = {
            '--sg-colors-background': '#000000',
            '--sg-colors-card': '#141414',
            '--sg-colors-success': '#5ed6a8',
            '--sg-font-family': 'monospace',
        };
        const theme = readDesignTokenTheme((variable) => values[variable] ?? '');
        expect(theme.background).toBe('#000000');
        expect(theme.surface).toBe('#141414');
        expect(theme.success).toBe('#5ed6a8');
        expect(theme.fontFamily).toBe('monospace');
        expect(theme.text).toBe(DEFAULT_THEME.text);
    });

    it('resolves the same roles directly from a token object', () => {
        const tokens = {
            ...darkTokens,
            colors: {
                ...darkTokens.colors,
                background: '#0f0e0c',
                card: '#191713',
                destructive: '#d98379',
                success: '#8fb98a',
                edge: '#6a6254',
                selection: '#d7a45f',
            },
        };
        const theme = themeFromDesignTokens(tokens, {
            defaults: { ...DEFAULT_THEME, fontSize: 15 },
        });
        expect(theme).toMatchObject({
            background: '#0f0e0c',
            surface: '#191713',
            error: '#d98379',
            success: '#8fb98a',
            edge: '#6a6254',
            selection: '#d7a45f',
            fontSize: 15,
        });
    });
});
