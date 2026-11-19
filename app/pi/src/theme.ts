import { DEFAULT_THEME, resolveTheme, type RenderTheme } from '@spacegraphjs/renderer';

const TOKENS = {
    background: '--pi-background',
    surface: '--pi-surface',
    surfaceMuted: '--pi-surface-muted',
    text: '--pi-text',
    textMuted: '--pi-text-muted',
    border: '--pi-border',
    accent: '--pi-accent',
    success: '--pi-success',
    warning: '--pi-warning',
    error: '--pi-error',
    edge: '--pi-edge',
    edgeMuted: '--pi-edge-muted',
    selection: '--pi-selection',
    focus: '--pi-focus',
} as const;

export const readTheme = (read: (variable: string) => string = (variable) =>
    getComputedStyle(document.documentElement).getPropertyValue(variable)): RenderTheme =>
    resolveTheme(TOKENS, read, DEFAULT_THEME);
