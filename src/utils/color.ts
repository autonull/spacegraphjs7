import type * as THREE from 'three';
import { clamp } from './math';

/** The red, green, and blue channels of a packed colour. */
function unpackRgb(value: number): [number, number, number] {
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** A packed colour from three channels. */
function packRgb(r: number, g: number, b: number): number {
    return (r << 16) | (g << 8) | b;
}

/** WCAG 2.1 linearisation of a channel already in 0..1. */
const linearChannel = (channel: number): number =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/**
 * WCAG 2.1 relative luminance per https://www.w3.org/WAI/GL/wiki/Relative_luminance
 * The contract package owns the same primitive; the core keeps its own because the boundary test
 * holds the core free of the contract.
 */
const relativeLuminance = (r: number, g: number, b: number): number =>
    0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);

/**
 * WCAG contrast ratio between two luminance values: `(L1 + 0.05) / (L2 + 0.05)`, L1 lighter.
 * Accepts either THREE.Color or raw RGB channels in 0..1.
 */
export function getRelativeLuminance(
    color: THREE.Color | { r: number; g: number; b: number },
): number {
    return relativeLuminance(color.r, color.g, color.b);
}

/** WCAG contrast ratio between two relative luminance values. */
export const getContrastRatio = (l1: number, l2: number): number =>
    (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

/**
 * Darken a hex/number color until it meets WCAG AA contrast (4.5:1) against white text.
 * Returns the original color if already compliant, or 0x333333 as fallback.
 */
export function getCompliantColor(
    hexColor: number,
    textLuminance = 1,
    minRatio = 4.5,
    maxIterations = 20,
): number {
    let [r, g, b] = unpackRgb(hexColor);

    let ratio = getContrastRatio(relativeLuminance(r, g, b), textLuminance);
    let iterations = 0;
    while (ratio < minRatio && iterations < maxIterations) {
        r = Math.max(0, Math.floor(r * 0.9));
        g = Math.max(0, Math.floor(g * 0.9));
        b = Math.max(0, Math.floor(b * 0.9));
        ratio = getContrastRatio(relativeLuminance(r, g, b), textLuminance);
        iterations++;
    }

    return ratio < minRatio ? 0x333333 : packRgb(r, g, b);
}

export function hexToRgb(
    hex: string | number,
): { r: number; g: number; b: number; a?: number } | null {
    if (typeof hex === 'number') {
        const [r, g, b] = unpackRgb(hex);
        return { r, g, b };
    }
    if (hex.startsWith('rgb')) {
        const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            return {
                r: clamp(Number.parseInt(match[1], 10), 0, 255),
                g: clamp(Number.parseInt(match[2], 10), 0, 255),
                b: clamp(Number.parseInt(match[3], 10), 0, 255),
                a: match[4] ? Number.parseFloat(match[4]) : undefined,
            };
        }
    }
    let normalized = hex;
    if (normalized.startsWith('#') && normalized.length === 4) {
        normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(normalized);
    if (result) {
        return {
            r: Number.parseInt(result[1], 16),
            g: Number.parseInt(result[2], 16),
            b: Number.parseInt(result[3], 16),
            a: result[4] ? Number.parseInt(result[4], 16) / 255 : undefined,
        };
    }
    return null;
}

/** A packed hex colour or a CSS colour as a CSS colour string. */
export function toCssColor(value: string | number): string {
    return typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value;
}

/**
 * The colour a surface's data carries, as a CSS colour. A falsy colour — black included — is
 * skipped, as it always has been: the result is undefined.
 */
export function dataColor(value: string | number | undefined): string | undefined {
    return value ? toCssColor(value) : undefined;
}

// ============= Parse Named Colors =============
const NAMED_COLORS: Record<string, string> = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    white: '#ffffff',
    black: '#000000',
    orange: '#ffa500',
    purple: '#800080',
    pink: '#ffc0cb',
    gray: '#808080',
    grey: '#808080',
    navy: '#000080',
    teal: '#008080',
    olive: '#808000',
    maroon: '#800000',
    silver: '#c0c0c0',
    lime: '#00ff00',
    aqua: '#00ffff',
};

export function parseColor(color: string | number): number {
    if (typeof color === 'number') return color & 0xffffff;
    const hex = color.trim();
    if (hex.startsWith('#') || hex.startsWith('rgb')) {
        const rgb = hexToRgb(hex);
        return rgb ? packRgb(rgb.r, rgb.g, rgb.b) : 0;
    }
    const named = NAMED_COLORS[hex.toLowerCase()];
    return named ? Number.parseInt(named.slice(1), 16) : 0;
}
