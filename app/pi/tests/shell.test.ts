// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { contrastRatio, type RenderNode } from '@spacegraphjs/renderer';
import { filterCommands, contextualInstruments, HUD_TOKENS, shellTokenCSS } from '../src/shell';

const node = (kind: string, status?: RenderNode['status']): RenderNode => ({
    id: kind,
    kind,
    label: kind,
    position: [0, 0, 0],
    status,
});

describe('the shell token layer', () => {
    it('resolves the grayscale HUD in both themes', () => {
        expect(HUD_TOKENS.dark!.colors.background).toBe('#000000');
        expect(HUD_TOKENS.light!.colors.background).toBe('#f7f7f7');
        expect(HUD_TOKENS.dark!.radii.none).toBe('0px');
        expect(HUD_TOKENS.dark!.fontSizes.micro).toBe('11px');
        expect(HUD_TOKENS.dark!.fontSizes.nano).toBe('10px');
        expect(HUD_TOKENS.dark!.spacing.hair).toBe('2px');
    });

    it('emits both selectors with no inline chrome constants', () => {
        const css = shellTokenCSS();
        expect(css).toContain(':root {');
        expect(css).toContain(":root[data-theme='light'] {");
        expect(css).toContain('--sg-colors-background: #000000;');
        expect(css).toContain('--sg-font-sizes-micro: 11px;');
        expect(css).not.toContain('--pi-');
    });
});

describe('the command surface filter', () => {
    const commands = [
        { id: 'a', label: 'Descend', group: 'navigate' },
        { id: 'b', label: 'Ascent of a node', group: 'navigate' },
        { id: 'c', label: 'Toggle catalog', group: 'interface' },
    ];

    it('returns every command for an empty query', () => {
        expect(filterCommands(commands, '')).toEqual(commands);
    });

    it('ranks prefix matches above substring matches', () => {
        expect(filterCommands(commands, 'desc').map((command) => command.id)).toEqual(['a']);
        expect(filterCommands(commands, 'node').map((command) => command.id)).toEqual(['b']);
        expect(filterCommands(commands, 'toggle').map((command) => command.id)).toEqual(['c']);
    });
});

describe('contextual instrument selection', () => {
    it('keeps two instruments per node kind', () => {
        for (const kind of ['error', 'approval', 'artifact', 'run', 'message', 'unknown']) {
            expect(contextualInstruments(node(kind)).length).toBeLessThanOrEqual(2);
        }
    });

    it('uses the failure and approval pair for their kinds', () => {
        expect(contextualInstruments(node('message', 'error'))).toEqual(['status', 'logtail']);
        expect(contextualInstruments(node('approval'))).toEqual(['status', 'controls']);
        expect(contextualInstruments(node('artifact'))).toEqual(['diff', 'status']);
    });
});

describe('the HUD contrast and ergonomic gate', () => {
    it('keeps text and status roles legible on every HUD surface in both themes', () => {
        for (const tokens of Object.values(HUD_TOKENS)) {
            const colors = tokens.colors;
            const surfaces = [colors.background, colors.card, colors.popover, colors.muted];
            for (const surface of surfaces) {
                expect(contrastRatio(colors.foreground, surface)!).toBeGreaterThanOrEqual(4.5);
                expect(contrastRatio(colors.mutedForeground, surface)!).toBeGreaterThanOrEqual(4.5);
                expect(contrastRatio(colors.primaryForeground, colors.primary)!).toBeGreaterThanOrEqual(4.5);
                expect(contrastRatio(colors.accentForeground, colors.accent)!).toBeGreaterThanOrEqual(4.5);
            }
            for (const status of [colors.destructive, colors.success, colors.warning]) {
                expect(contrastRatio(status, colors.card)!).toBeGreaterThanOrEqual(3);
            }
        }
    });

    it('publishes the ergonomic target as a token', () => {
        expect(HUD_TOKENS.dark!.spacing.target).toBe('44px');
        expect(shellTokenCSS()).toContain('--sg-spacing-target: 44px');
    });
});
