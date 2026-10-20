import { describe, expect, test } from 'bun:test';
import {
  ContrastAuditor,
  contrastRatio,
  resolveTheme,
  type RenderTheme,
  type SemanticTokenMap,
} from './index';

const DEFAULTS: RenderTheme = {
  background: '#101014',
  surface: '#1b1b22',
  surfaceMuted: '#2a2a33',
  text: '#f5f5f7',
  textMuted: '#a0a0aa',
  border: '#3a3a44',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  edge: '#6b7280',
  edgeMuted: '#a0a0aa',
  selection: '#60a5fa',
  focus: '#93c5fd',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
};

const TOKENS: SemanticTokenMap = {
  background: '--host-background',
  text: '--host-text',
  textMuted: '--host-text-muted',
  fontFamily: '--host-font',
};

describe('theme bridge', () => {
  test('the host variables win and the defaults fill the gaps', () => {
    const values: Record<string, string> = {
      '--host-background': '#000000',
      '--host-text': '#ffffff',
      '--host-text-muted': '#aaaaaa',
      '--host-font': 'Inter, sans-serif',
    };
    const theme = resolveTheme(TOKENS, (name) => values[name] ?? '', DEFAULTS);

    expect(theme.background).toBe('#000000');
    expect(theme.text).toBe('#ffffff');
    expect(theme.textMuted).toBe('#aaaaaa');
    expect(theme.fontFamily).toBe('Inter, sans-serif');
    expect(theme.surface).toBe(DEFAULTS.surface);
    expect(theme.fontSize).toBe(13);
  });

  test('a blank or absent token keeps the default', () => {
    const theme = resolveTheme(TOKENS, () => '   ', DEFAULTS);

    expect(theme.background).toBe(DEFAULTS.background);
    expect(theme.text).toBe(DEFAULTS.text);
  });
});

describe('contrast auditor', () => {
  test('computes WCAG ratios and ignores unparseable colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('var(--x)', '#ffffff')).toBeUndefined();
  });

  test('measures every role against the canvas', () => {
    const ratios = new ContrastAuditor().contrast(DEFAULTS);

    expect(ratios.text).toBeGreaterThan(4.5);
    expect(ratios.textMuted).toBeGreaterThan(4.5);
    expect(ratios.edge).toBeGreaterThan(3);
  });

  test('reports the roles that miss their target', () => {
    const auditor = new ContrastAuditor();
    const light: RenderTheme = {
      ...DEFAULTS,
      background: '#ffffff',
      text: '#1a1a1c',
      textMuted: '#5c5c66',
      edge: '#6b7280',
      edgeMuted: '#f2f2f2',
      selection: '#2563eb',
    };
    const report = auditor.audit(light);

    expect(report.passed).toBe(false);
    expect(report.failures.map((failure) => failure.role)).toEqual(['edgeMuted']);
    expect(report.failures[0]?.target).toBe(3);
    expect(auditor.failingRoles(light)).toEqual(['edgeMuted']);
  });

  test('takes the targets from the caller', () => {
    const strict = new ContrastAuditor({ text: 21 });

    expect(strict.failingRoles(DEFAULTS)).toContain('text');
  });
});
