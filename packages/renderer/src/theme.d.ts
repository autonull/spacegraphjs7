/**
 * The theme bridge: a host maps its own semantic tokens to CSS variables, the renderer reads them
 * into its palette, and the auditor checks the result against WCAG. Zero dependencies, no DOM: the
 * host supplies the reader.
 */
import type { NodeStatus, RenderTheme } from './index';
/** A renderer role mapped to the CSS variable that carries the host's value for it. */
export type SemanticTokenMap = Readonly<Record<string, string>>;
/**
 * The palette a renderer falls back to when the host maps no token of its own. It lives beside the
 * contract because a host resolves one theme for every renderer it may mount, and the host must not
 * depend on a renderer package to do it: the adapters load behind dynamic imports so a failing
 * adapter can fall through to the next one.
 */
export declare const DEFAULT_THEME: RenderTheme;
/** The roles a theme carries; every one of them resolves to a colour or a font. */
export declare const THEME_ROLES: readonly [
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
];
/** The roles that resolve to a colour. */
export type ThemeColorRole = Exclude<(typeof THEME_ROLES)[number], 'fontFamily'>;
/** The colour roles, in the order the theme lists them. */
export declare const THEME_COLOR_ROLES: readonly ThemeColorRole[];
/**
 * The CSS variable a role conventionally lives in: the role's name in kebab case under the `--sg-`
 * prefix. An adapter that maps a host's tokens reads them through this, so every renderer agrees on
 * where a role comes from.
 */
export declare function themeVariable(role: keyof RenderTheme): string;
/**
 * Resolves the renderer theme: the host's variables win, the renderer's own palette fills the gaps.
 * A token that is absent or blank keeps the default, so a missing stylesheet never yields an empty
 * theme.
 */
export declare function resolveTheme(
    tokens: SemanticTokenMap,
    read: (variable: string) => string,
    defaults: RenderTheme,
): RenderTheme;
/**
 * The theme role that carries a status' colour. Every renderer draws a status from the same role,
 * so a host maps one token and every renderer agrees.
 */
export declare function statusRole(status: NodeStatus | undefined): ThemeColorRole;
/** The theme colour that represents a status. */
export declare function statusColor(status: NodeStatus | undefined, theme: RenderTheme): string;
/** The roles the canvas draws, and the contrast each must clear. */
export type ContrastRole = 'text' | 'textMuted' | 'edge' | 'edgeMuted' | 'selection';
/** WCAG AA: 4.5:1 for text, 3:1 for the non-text cues the canvas draws. */
export declare const CONTRAST_TARGETS: Readonly<Record<ContrastRole, number>>;
export type ContrastFailure = {
    role: ContrastRole;
    ratio: number | undefined;
    target: number;
};
export type ContrastReport = {
    /** The measured ratio of every role against the canvas. */
    ratios: Record<ContrastRole, number | undefined>;
    /** The roles that miss their target. */
    failures: ContrastFailure[];
    /** Whether every role clears its target. */
    passed: boolean;
};
/** The WCAG contrast ratio of two colours; undefined when a colour cannot be parsed. */
export declare function contrastRatio(foreground: string, background: string): number | undefined;
/** Audits a resolved theme against the WCAG targets the canvas must clear. */
export declare class ContrastAuditor {
    readonly targets: Readonly<Record<ContrastRole, number>>;
    constructor(targets?: Partial<Record<ContrastRole, number>>);
    /** The measured ratio of every role against the canvas. */
    contrast(theme: RenderTheme): Record<ContrastRole, number | undefined>;
    /** The roles that miss their target. */
    failingRoles(theme: RenderTheme): ContrastRole[];
    /** The full report: the ratios, the failures, and the verdict. */
    audit(theme: RenderTheme): ContrastReport;
}
//# sourceMappingURL=theme.d.ts.map
