import { describe, expect, test } from 'bun:test';
import { ContrastAuditor } from '@spacegraphjs/renderer';
import { RENDERER_THEME, resolveRendererTheme } from './theme';

describe('SpaceGraph renderer theme', () => {
  test('the palette is legible on its own', () => {
    expect(new ContrastAuditor().failingRoles(RENDERER_THEME)).toEqual([]);
  });

  test('the host variables win and the palette fills the gaps', () => {
    const values: Record<string, string> = { '--host-background': '#000000', '--host-text': '#ffffff' };
    const theme = resolveRendererTheme(
      { background: '--host-background', text: '--host-text' },
      (name) => values[name] ?? '',
    );

    expect(theme.background).toBe('#000000');
    expect(theme.text).toBe('#ffffff');
    expect(theme.surface).toBe(RENDERER_THEME.surface);
    expect(theme.fontSize).toBe(13);
  });
});
