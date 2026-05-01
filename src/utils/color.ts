import * as THREE from 'three';
import { clamp, sortByFrequency } from './math';
export { sortByFrequency };

/**
 * WCAG 2.1 relative luminance per https://www.w3.org/WAI/GL/wiki/Relative_luminance
 * Accepts either THREE.Color or raw 0-255 RGB values.
 */
export function getRelativeLuminance(
    color: THREE.Color | { r: number; g: number; b: number },
): number {
    const r =
        'r' in color
            ? (color as { r: number; g: number; b: number }).r
            : (color as THREE.Color).r / 255;
    const g =
        'g' in color
            ? (color as { r: number; g: number; b: number }).g
            : (color as THREE.Color).g / 255;
    const b =
        'b' in color
            ? (color as { r: number; g: number; b: number }).b
            : (color as THREE.Color).b / 255;

    const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * WCAG contrast ratio between two luminance values.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is lighter.
 */
export function getContrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

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
    let r = (hexColor >> 16) & 255;
    let g = (hexColor >> 8) & 255;
    let b = hexColor & 255;

    let currentLuminance = getRelativeLuminance({ r, g, b });
    let ratio = getContrastRatio(currentLuminance, textLuminance);

    let iterations = 0;
    while (ratio < minRatio && iterations < maxIterations) {
        r = Math.max(0, Math.floor(r * 0.9));
        g = Math.max(0, Math.floor(g * 0.9));
        b = Math.max(0, Math.floor(b * 0.9));
        currentLuminance = getRelativeLuminance({ r, g, b });
        ratio = getContrastRatio(currentLuminance, textLuminance);
        iterations++;
    }

    return ratio < minRatio ? 0x333333 : (r << 16) | (g << 8) | b;
}

export function hexToRgb(
    hex: string | number,
): { r: number; g: number; b: number; a?: number } | null {
    if (typeof hex === 'number') {
        return {
            r: (hex >> 16) & 255,
            g: (hex >> 8) & 255,
            b: hex & 255,
        };
    }
    if (hex.startsWith('rgba')) {
        const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            return {
                r: clamp(parseInt(match[1], 10), 0, 255),
                g: clamp(parseInt(match[2], 10), 0, 255),
                b: clamp(parseInt(match[3], 10), 0, 255),
                a: match[4] ? parseFloat(match[4]) : undefined,
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
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: result[4] ? parseInt(result[4], 16) / 255 : undefined,
        };
    }
    return null;
}

export function toHexColor(numColor: number | string): string {
    if (typeof numColor === 'string') {
        if (numColor.startsWith('#')) return numColor;
        if (numColor.startsWith('rgb')) {
            const match = numColor.match(/\d+/g);
            if (match?.length && match.length >= 3) {
                const [r, g, b] = match
                    .slice(0, 3)
                    .map((v) => clamp(parseInt(v, 10), 0, 255).toString(16).padStart(2, '0'));
                return `#${r}${g}${b}`;
            }
        }
        return numColor;
    }
    if (typeof numColor !== 'number' || isNaN(numColor) || numColor < 0) return '#000000';
    return `#${Math.floor(numColor).toString(16).padStart(6, '0')}`;
}

export function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (clamp(r, 0, 255) << 16) + (clamp(g, 0, 255) << 8) + clamp(b, 0, 255)).toString(16).slice(1)}`;
}
