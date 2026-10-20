/**
 * The theme bridge: a host maps its own semantic tokens to CSS variables, the renderer reads them
 * into its palette, and the auditor checks the result against WCAG. Zero dependencies, no DOM: the
 * host supplies the reader.
 */

import type { RenderTheme } from './index';

/** A renderer role mapped to the CSS variable that carries the host's value for it. */
export type SemanticTokenMap = Readonly<Record<string, string>>;

/**
 * The palette a renderer falls back to when the host maps no token of its own. It lives beside the
 * contract because a host resolves one theme for every renderer it may mount, and the host must not
 * depend on a renderer package to do it: the adapters load behind dynamic imports so a failing
 * adapter can fall through to the next one.
 */
export const DEFAULT_THEME: RenderTheme = {
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

/** The roles a theme carries; every one of them resolves to a colour or a font. */
const THEME_ROLES = [
  'background',
  'surface',
  'surfaceMuted',
  'text',
  'textMuted',
  'border',
  'accent',
  'success',
  'warning',
  'error',
  'edge',
  'edgeMuted',
  'selection',
  'focus',
  'fontFamily',
] as const satisfies readonly (keyof RenderTheme)[];

/**
 * Resolves the renderer theme: the host's variables win, the renderer's own palette fills the gaps.
 * A token that is absent or blank keeps the default, so a missing stylesheet never yields an empty
 * theme.
 */
export function resolveTheme(
  tokens: SemanticTokenMap,
  read: (variable: string) => string,
  defaults: RenderTheme,
): RenderTheme {
  const resolved = { ...defaults };

  for (const role of THEME_ROLES) {
    const variable = tokens[role];

    if (!variable) continue;

    const value = read(variable).trim();

    if (value) resolved[role] = value;
  }

  return resolved;
}

/** The roles the canvas draws, and the contrast each must clear. */
export type ContrastRole = 'text' | 'textMuted' | 'edge' | 'edgeMuted' | 'selection';

/** WCAG AA: 4.5:1 for text, 3:1 for the non-text cues the canvas draws. */
export const CONTRAST_TARGETS: Readonly<Record<ContrastRole, number>> = {
  text: 4.5,
  textMuted: 4.5,
  edge: 3,
  edgeMuted: 3,
  selection: 3,
};

export type ContrastFailure = { role: ContrastRole; ratio: number | undefined; target: number };

export type ContrastReport = {
  /** The measured ratio of every role against the canvas. */
  ratios: Record<ContrastRole, number | undefined>;
  /** The roles that miss their target. */
  failures: ContrastFailure[];
  /** Whether every role clears its target. */
  passed: boolean;
};

function channel(hex: string): [number, number, number] | undefined {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i);

  if (!match) return undefined;
  const value = match[1]!;

  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(hex: string): number | undefined {
  const rgb = channel(hex);

  if (!rgb) return undefined;
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two colours; undefined when a colour cannot be parsed. */
export function contrastRatio(foreground: string, background: string): number | undefined {
  const a = luminance(foreground);
  const b = luminance(background);

  if (a === undefined || b === undefined) return undefined;

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Audits a resolved theme against the WCAG targets the canvas must clear. */
export class ContrastAuditor {
  readonly targets: Readonly<Record<ContrastRole, number>>;

  constructor(targets: Partial<Record<ContrastRole, number>> = {}) {
    this.targets = { ...CONTRAST_TARGETS, ...targets };
  }

  /** The measured ratio of every role against the canvas. */
  contrast(theme: RenderTheme): Record<ContrastRole, number | undefined> {
    return {
      text: contrastRatio(theme.text, theme.background),
      textMuted: contrastRatio(theme.textMuted, theme.background),
      edge: contrastRatio(theme.edge, theme.background),
      edgeMuted: contrastRatio(theme.edgeMuted, theme.background),
      selection: contrastRatio(theme.selection, theme.background),
    };
  }

  /** The roles that miss their target. */
  failingRoles(theme: RenderTheme): ContrastRole[] {
    return this.audit(theme).failures.map((failure) => failure.role);
  }

  /** The full report: the ratios, the failures, and the verdict. */
  audit(theme: RenderTheme): ContrastReport {
    const ratios = this.contrast(theme);
    const failures = (Object.keys(this.targets) as ContrastRole[])
      .filter((role) => (ratios[role] ?? 0) < this.targets[role])
      .map((role) => ({ role, ratio: ratios[role], target: this.targets[role] }));

    return { ratios, failures, passed: failures.length === 0 };
  }
}
