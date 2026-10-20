import { describe, expect, test } from 'bun:test';
import { ContrastAuditor } from '@spacegraphjs/renderer';
import { CYTOSCAPE_THEME, CYTOSCAPE_TOKENS, CytoscapeThemeBridge } from './theme';

describe('Cytoscape theme bridge', () => {
  test('the palette is legible on its own', () => {
    expect(new ContrastAuditor().failingRoles(CYTOSCAPE_THEME)).toEqual([]);
  });

  test('resolves the host variables and normalizes the colours', () => {
    const bridge = new CytoscapeThemeBridge({
      background: '--host-background',
      text: '--host-text',
      surface: '--host-surface',
    });
    const theme = bridge.resolve(
      (name) =>
        ({
          '--host-background': '#00000080',
          '--host-text': '#ffffff',
          '--host-surface': '#111111',
        })[name] ?? '',
    );

    expect(theme.background).toBe('#000000');
    expect(theme.text).toBe('#ffffff');
    expect(theme.surface).toBe('#111111');
  });

  test('keeps the token map it was given', () => {
    expect(CYTOSCAPE_TOKENS.background).toBe('--sg-background');
    expect(new CytoscapeThemeBridge().resolve(() => '').background).toBe(CYTOSCAPE_THEME.background);
  });
});
