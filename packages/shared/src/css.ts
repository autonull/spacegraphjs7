/**
 * CSS utilities for SpaceGraphJS components.
 * Provides class name helpers and CSS variable access.
 */

import type { JSX } from 'solid-js';

/**
 * Concatenates class names, filtering out falsy values.
 * Similar to clsx/cn but lighter weight.
 * @param args - Class names, objects, or arrays
 * @returns Combined class string
 */
export function cx(
    ...args: Array<
        | string
        | Record<string, boolean>
        | Array<string | Record<string, boolean>>
        | null
        | undefined
    >
): string {
    const classes: string[] = [];

    for (const arg of args) {
        if (!arg) continue;

        if (typeof arg === 'string') {
            classes.push(arg);
        } else if (Array.isArray(arg)) {
            classes.push(cx(...arg));
        } else if (typeof arg === 'object') {
            for (const [key, value] of Object.entries(arg)) {
                if (value) classes.push(key);
            }
        }
    }

    return classes.join(' ');
}

/**
 * Shorthand for cx - same functionality, shorter name.
 */
export const cn = cx;

/**
 * Creates a CSS variable reference with optional fallback.
 * @param name - Variable name (without -- prefix)
 * @param fallback - Optional fallback value
 * @returns var() expression
 */
export function styleVar(name: string, fallback?: string): string {
    const varName = `--${name}`;
    return fallback ? `var(${varName}, ${fallback})` : `var(${varName})`;
}

/**
 * Creates multiple CSS variable references at once.
 * @param vars - Object mapping property names to variable names
 * @returns Style object for JSX
 */
export function styleVars(vars: Record<string, string | number>): Record<string, string> {
    const style: Record<string, string> = {};
    for (const [prop, value] of Object.entries(vars)) {
        style[prop] = String(value);
    }
    return style;
}

/**
 * Generates a unique ID for ARIA attributes.
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
let idCounter = 0;
export function generateId(prefix = 'sg'): string {
    return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a style object for a fixed-size element.
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns Style object
 */
export function fixedSize(width: number, height: number): Record<string, string> {
    return {
        width: `${width}px`,
        height: `${height}px`,
        'min-width': `${width}px`,
        'min-height': `${height}px`,
        'max-width': `${width}px`,
        'max-height': `${height}px`,
    };
}

/**
 * Creates a style object for absolute positioning.
 * @param top - Top position
 * @param left - Left position
 * @param right - Right position
 * @param bottom - Bottom position
 * @returns Style object
 */
export function absolutePosition(
    top?: number | string,
    left?: number | string,
    right?: number | string,
    bottom?: number | string,
): Record<string, string> {
    const style: Record<string, string> = { position: 'absolute' };
    if (top !== undefined) style.top = typeof top === 'number' ? `${top}px` : top;
    if (left !== undefined) style.left = typeof left === 'number' ? `${left}px` : left;
    if (right !== undefined) style.right = typeof right === 'number' ? `${right}px` : right;
    if (bottom !== undefined) style.bottom = typeof bottom === 'number' ? `${bottom}px` : bottom;
    return style;
}

/**
 * Media query helpers for responsive design.
 */
export const mediaQueries = {
    /** @media (max-width: 640px) */
    sm: '@media (max-width: 640px)',
    /** @media (max-width: 768px) */
    md: '@media (max-width: 768px)',
    /** @media (max-width: 1024px) */
    lg: '@media (max-width: 1024px)',
    /** @media (max-width: 1280px) */
    xl: '@media (max-width: 1280px)',
    /** @media (prefers-reduced-motion: reduce) */
    reducedMotion: '@media (prefers-reduced-motion: reduce)',
    /** @media (prefers-color-scheme: dark) */
    dark: '@media (prefers-color-scheme: dark)',
    /** @media (prefers-color-scheme: light) */
    light: '@media (prefers-color-scheme: light)',
} as const;

/**
 * Creates a CSS-in-JS style object for a media query.
 * @param query - Media query string
 * @param styles - Styles to apply within the query
 * @returns Style object with nested media query (for use with css-in-js libraries)
 */
export function media(query: string, styles: JSX.CSSProperties): Record<string, JSX.CSSProperties> {
    return { [query]: styles };
}
