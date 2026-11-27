import { contrastRatio, type RenderTheme } from '@spacegraphjs/renderer';
import { readDesignTokenTheme } from '@spacegraphjs/shared/tokens';

export const readTheme = (
    read: (variable: string) => string = (variable) =>
        getComputedStyle(document.documentElement).getPropertyValue(variable),
): RenderTheme => readDesignTokenTheme(read);

interface ViewPalette {
    readonly accent: string;
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly edge: string;
    readonly edgeMuted: string;
    readonly selection: string;
    readonly focus: string;
    readonly context: string;
    readonly causal: string;
    readonly scope: string;
    readonly severity: string;
    readonly kinds: Readonly<Record<string, string>>;
    readonly grid: string;
    readonly star: string;
}

/** View palettes are data. The HUD stays grayscale; only the graph consumes these colors. */
export const VIEW_PALETTES: Readonly<Record<string, ViewPalette>> = {
    mono: {
        accent: '#d4d4d4',
        success: '#5ed6a8',
        warning: '#f5c46b',
        error: '#ff7a90',
        edge: '#6b6b6b',
        edgeMuted: '#3a3a3a',
        selection: '#e5e5e5',
        focus: '#ffffff',
        context: '#7a7a7a',
        causal: '#d2d2d2',
        scope: '#8ab4ff',
        severity: '#ff7a90',
        kinds: {
            run: '#d2d2d2',
            unit: '#8ab4ff',
            message: '#f0c674',
            artifact: '#7fd6a8',
            file: '#7fd6a8',
            tool: '#c9a6ff',
            'read-tool': '#c9a6ff',
            error: '#ff8aa0',
            approval: '#9ad9ff',
        },
        grid: 'rgba(212, 212, 212, 0.09)',
        star: 'rgba(255, 255, 255, 0.35)',
    },
    neon: {
        accent: '#4df3ff',
        success: '#39ffb0',
        warning: '#ffd166',
        error: '#ff5c8a',
        edge: '#3f8fa8',
        edgeMuted: '#1d3f47',
        selection: '#4df3ff',
        focus: '#b8fbff',
        context: '#3f8fa8',
        causal: '#4df3ff',
        scope: '#7aa2ff',
        severity: '#ff5c8a',
        kinds: {
            run: '#4df3ff',
            unit: '#7aa2ff',
            message: '#ffd166',
            artifact: '#39ffb0',
            file: '#39ffb0',
            tool: '#c77dff',
            'read-tool': '#c77dff',
            error: '#ff5c8a',
            approval: '#5cf2ff',
        },
        grid: 'rgba(77, 243, 255, 0.12)',
        star: 'rgba(140, 250, 255, 0.5)',
    },
    ember: {
        accent: '#ffb35c',
        success: '#9be36b',
        warning: '#ffd166',
        error: '#ff4d4d',
        edge: '#8a533d',
        edgeMuted: '#40271f',
        selection: '#ffb35c',
        focus: '#ffe0b8',
        context: '#8a533d',
        causal: '#ffb35c',
        scope: '#ff8f6b',
        severity: '#ff4d4d',
        kinds: {
            run: '#ffb35c',
            unit: '#ff8f6b',
            message: '#ffd166',
            artifact: '#9be36b',
            file: '#9be36b',
            tool: '#ff6b9d',
            'read-tool': '#ff6b9d',
            error: '#ff4d4d',
            approval: '#ffd08a',
        },
        grid: 'rgba(255, 179, 92, 0.11)',
        star: 'rgba(255, 208, 138, 0.45)',
    },
    aurora: {
        accent: '#8ff0d0',
        success: '#5ce0a0',
        warning: '#c7f56b',
        error: '#ff7aa2',
        edge: '#3d8f7a',
        edgeMuted: '#1e453d',
        selection: '#8ff0d0',
        focus: '#d9fff2',
        context: '#3d8f7a',
        causal: '#8ff0d0',
        scope: '#6bb8ff',
        severity: '#ff7aa2',
        kinds: {
            run: '#8ff0d0',
            unit: '#6bb8ff',
            message: '#c7f56b',
            artifact: '#5ce0a0',
            file: '#5ce0a0',
            tool: '#a78bfa',
            'read-tool': '#a78bfa',
            error: '#ff7aa2',
            approval: '#8ff0d0',
        },
        grid: 'rgba(143, 240, 208, 0.1)',
        star: 'rgba(190, 255, 235, 0.45)',
    },
    circuit: {
        accent: '#5ad1ff',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        edge: '#2f6b8f',
        edgeMuted: '#17394d',
        selection: '#5ad1ff',
        focus: '#cff4ff',
        context: '#2f6b8f',
        causal: '#5ad1ff',
        scope: '#3b82f6',
        severity: '#f87171',
        kinds: {
            run: '#5ad1ff',
            unit: '#3b82f6',
            message: '#fbbf24',
            artifact: '#34d399',
            file: '#34d399',
            tool: '#818cf8',
            'read-tool': '#818cf8',
            error: '#f87171',
            approval: '#67e8f9',
        },
        grid: 'rgba(90, 209, 255, 0.11)',
        star: 'rgba(180, 235, 255, 0.4)',
    },
};

const paletteOf = (id: string): ViewPalette => VIEW_PALETTES[id] ?? VIEW_PALETTES.mono!;

/** Pure view → CSS mapping; the host sets these variables, CSS does the painting. */
export const paletteVars = (id: string): Readonly<Record<string, string>> => {
    const palette = paletteOf(id);
    return {
        ...Object.fromEntries(
            Object.entries(palette.kinds).map(([kind, color]) => [`--kind-${kind}`, color]),
        ),
        '--view-focus': palette.focus,
        '--view-context': palette.context,
        '--view-causal': palette.causal,
        '--view-scope': palette.scope,
        '--view-severity': palette.severity,
        '--view-grid': palette.grid,
        '--view-star': palette.star,
    };
};

const legible = (color: string, base: RenderTheme, fallback: string): string => {
    if ((contrastRatio(color, base.background) ?? 0) >= 3) return color;
    for (const candidate of [fallback, base.textMuted, base.text])
        if ((contrastRatio(candidate, base.background) ?? 0) >= 3) return candidate;
    return color;
};

/** The causal role is palette data already published to CSS; ribbons reuse the same value. */
export const paletteCausal = (base: RenderTheme, id: string): string =>
    legible(paletteOf(id).causal, base, base.accent);

/** Stable per-scope colors come from the same palette; no new knob or contract field. */
export const paletteScopeColors = (base: RenderTheme, id: string): readonly string[] => {
    const palette = paletteOf(id);
    const distinct = Object.values(palette.kinds).filter(
        (color) => color !== palette.causal && color !== palette.scope,
    );
    return [palette.scope, ...distinct.slice(0, 4)].map((color) => legible(color, base, base.accent));
};

/** The renderer theme varies the view palette, not the HUD tokens; low-contrast roles fall back. */
export const paletteTheme = (base: RenderTheme, id: string): RenderTheme => {
    const palette = paletteOf(id);
    return {
        ...base,
        accent: legible(palette.accent, base, base.accent),
        success: legible(palette.success, base, base.success),
        warning: legible(palette.warning, base, base.warning),
        error: legible(palette.error, base, base.error),
        edge: legible(palette.edge, base, base.edge),
        edgeMuted: legible(palette.edgeMuted, base, base.edgeMuted),
        selection: legible(palette.selection, base, base.selection),
        focus: legible(palette.focus, base, base.focus),
    };
};
