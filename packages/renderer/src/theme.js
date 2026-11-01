/**
 * The theme bridge: a host maps its own semantic tokens to CSS variables, the renderer reads them
 * into its palette, and the auditor checks the result against WCAG. Zero dependencies, no DOM: the
 * host supplies the reader.
 */
import { contrastRatioOf, relativeLuminance } from './color';
/**
 * The palette a renderer falls back to when the host maps no token of its own. It lives beside the
 * contract because a host resolves one theme for every renderer it may mount, and the host must not
 * depend on a renderer package to do it: the adapters load behind dynamic imports so a failing
 * adapter can fall through to the next one.
 */
export const DEFAULT_THEME = {
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
export const THEME_ROLES = [
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
/** The colour roles, in the order the theme lists them. */
export const THEME_COLOR_ROLES = THEME_ROLES.filter((role) => role !== 'fontFamily');
/**
 * The CSS variable a role conventionally lives in: the role's name in kebab case under the `--sg-`
 * prefix. An adapter that maps a host's tokens reads them through this, so every renderer agrees on
 * where a role comes from.
 */
export function themeVariable(role) {
    return `--sg-${role.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`;
}
/**
 * Resolves the renderer theme: the host's variables win, the renderer's own palette fills the gaps.
 * A token that is absent or blank keeps the default, so a missing stylesheet never yields an empty
 * theme.
 */
export function resolveTheme(tokens, read, defaults) {
    const resolved = { ...defaults };
    for (const role of THEME_ROLES) {
        const variable = tokens[role];
        if (!variable)
            continue;
        const value = read(variable).trim();
        if (value)
            resolved[role] = value;
    }
    return resolved;
}
/**
 * The theme role that carries a status' colour. Every renderer draws a status from the same role,
 * so a host maps one token and every renderer agrees.
 */
export function statusRole(status) {
    switch (status) {
        case 'success':
            return 'success';
        case 'warning':
            return 'warning';
        case 'error':
            return 'error';
        case 'running':
        case 'pending':
            return 'accent';
        default:
            return 'surfaceMuted';
    }
}
/** The theme colour that represents a status. */
export function statusColor(status, theme) {
    return theme[statusRole(status)];
}
/** WCAG AA: 4.5:1 for text, 3:1 for the non-text cues the canvas draws. */
export const CONTRAST_TARGETS = {
    text: 4.5,
    textMuted: 4.5,
    edge: 3,
    edgeMuted: 3,
    selection: 3,
};
function channel(hex) {
    const match = hex.trim().match(/^#([0-9a-f]{6})$/i);
    if (!match)
        return undefined;
    const value = match[1];
    return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
}
function luminance(hex) {
    const rgb = channel(hex);
    if (!rgb)
        return undefined;
    return relativeLuminance(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}
/** The WCAG contrast ratio of two colours; undefined when a colour cannot be parsed. */
export function contrastRatio(foreground, background) {
    const a = luminance(foreground);
    const b = luminance(background);
    if (a === undefined || b === undefined)
        return undefined;
    return contrastRatioOf(a, b);
}
/** Audits a resolved theme against the WCAG targets the canvas must clear. */
export class ContrastAuditor {
    targets;
    constructor(targets = {}) {
        this.targets = { ...CONTRAST_TARGETS, ...targets };
    }
    /** The measured ratio of every role against the canvas. */
    contrast(theme) {
        return Object.fromEntries(Object.keys(CONTRAST_TARGETS).map((role) => [
            role,
            contrastRatio(theme[role], theme.background),
        ]));
    }
    /** The roles that miss their target. */
    failingRoles(theme) {
        return this.audit(theme).failures.map((failure) => failure.role);
    }
    /** The full report: the ratios, the failures, and the verdict. */
    audit(theme) {
        const ratios = this.contrast(theme);
        const failures = Object.keys(this.targets)
            .filter((role) => (ratios[role] ?? 0) < this.targets[role])
            .map((role) => ({ role, ratio: ratios[role], target: this.targets[role] }));
        return { ratios, failures, passed: failures.length === 0 };
    }
}
