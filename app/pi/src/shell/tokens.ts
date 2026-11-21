import {
    darkTokens,
    defaultTokens,
    generateTokenCSS,
    type DesignTokens,
} from '@spacegraphjs/shared/tokens';

type ShellColors = DesignTokens['colors'] & {
    readonly success: string;
    readonly warning: string;
    readonly edge: string;
    readonly edgeMuted: string;
    readonly selection: string;
};
type ShellFontSizes = DesignTokens['fontSizes'] & { readonly micro: string; readonly nano: string };
type ShellSpacing = DesignTokens['spacing'] & { readonly hair: string };

export type ShellTokens = DesignTokens & {
    readonly colors: ShellColors;
    readonly fontSizes: ShellFontSizes;
    readonly spacing: ShellSpacing;
    readonly fontFamily: string;
};

const tokenSet = (base: DesignTokens, colors: Partial<ShellColors>): ShellTokens => ({
    ...base,
    colors: { ...base.colors, ...colors } as ShellColors,
    fontSizes: { ...base.fontSizes, micro: '10px', nano: '9px' },
    spacing: { ...base.spacing, hair: '2px' },
    radii: Object.fromEntries(
        Object.keys(base.radii).map((key) => [key, '0px']),
    ) as DesignTokens['radii'],
    lineHeights: { tight: '1.1', normal: '1.4', relaxed: '1.75', compact: '1.2' },
    fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace',
});

/** Pi's grayscale HUD is one token theme; view palettes stay host policy data. */
export const HUD_TOKENS: Readonly<Record<'dark' | 'light', ShellTokens>> = {
    dark: tokenSet(darkTokens, {
        primary: '#d4d4d4',
        primaryForeground: '#000000',
        secondary: '#222222',
        muted: '#222222',
        mutedForeground: '#a3a3a3',
        accent: '#d4d4d4',
        accentForeground: '#000000',
        destructive: '#ff7a90',
        destructiveForeground: '#000000',
        border: '#3a3a3a',
        input: '#3a3a3a',
        ring: '#ffffff',
        background: '#000000',
        foreground: '#f2f2f2',
        card: '#141414',
        cardForeground: '#f2f2f2',
        popover: '#141414',
        popoverForeground: '#f2f2f2',
        success: '#5ed6a8',
        warning: '#f5c46b',
        edge: '#6b6b6b',
        edgeMuted: '#3a3a3a',
        selection: '#e5e5e5',
    }),
    light: tokenSet(defaultTokens, {
        primary: '#3f3f3f',
        primaryForeground: '#ffffff',
        secondary: '#eeeeee',
        muted: '#eeeeee',
        mutedForeground: '#5c5c5c',
        accent: '#3f3f3f',
        accentForeground: '#ffffff',
        destructive: '#bd2645',
        destructiveForeground: '#ffffff',
        border: '#cccccc',
        input: '#cccccc',
        ring: '#000000',
        background: '#f7f7f7',
        foreground: '#161616',
        card: '#ffffff',
        cardForeground: '#161616',
        popover: '#ffffff',
        popoverForeground: '#161616',
        success: '#12805c',
        warning: '#93610b',
        edge: '#6b6b6b',
        edgeMuted: '#b3b3b3',
        selection: '#2b2b2b',
    }),
};

const themeCSS = (tokens: ShellTokens, selector: string): string =>
    generateTokenCSS(tokens)
        .replace(
            /--sg-([a-zA-Z0-9-]+):/g,
            (_, name: string) => `--sg-${name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}:`,
        )
        .replace(':root', selector);

/** One style element owns every chrome token; the host stylesheet only reads `--sg-*`. */
export const shellTokenCSS = (): string =>
    [
        themeCSS(HUD_TOKENS.dark!, ':root'),
        themeCSS(HUD_TOKENS.light!, ":root[data-theme='light']"),
    ].join('\n');

export const installShellTokens = (doc: Document): void => {
    if (doc.getElementById('shell-tokens')) return;
    const style = doc.createElement('style');
    style.id = 'shell-tokens';
    style.textContent = shellTokenCSS();
    doc.head.append(style);
};
