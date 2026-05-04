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

// ============= Color Interpolation =============
export function lerpColor(c1: number, c2: number, t: number): number {
    const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
    const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
}

export function lerpColorHex(c1: string, c2: string, t: number): string {
    const rgb1 = hexToRgb(c1), rgb2 = hexToRgb(c2);
    if (!rgb1 || !rgb2) return c1;
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
    return rgbToHex(r, g, b);
}

// ============= Color Blending =============
export function blendColors(c1: number, c2: number, mode: 'multiply' | 'screen' | 'overlay' = 'multiply'): number {
    const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
    const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
    let r: number, g: number, b: number;
    switch (mode) {
        case 'screen':
            r = 255 - ((255 - r1) * (255 - r2)) / 255;
            g = 255 - ((255 - g1) * (255 - g2)) / 255;
            b = 255 - ((255 - b1) * (255 - b2)) / 255;
            break;
        case 'overlay':
            r = r1 < 128 ? (2 * r1 * r2) / 255 : 255 - (2 * (255 - r1) * (255 - r2)) / 255;
            g = g1 < 128 ? (2 * g1 * g2) / 255 : 255 - (2 * (255 - g1) * (255 - g2)) / 255;
            b = b1 < 128 ? (2 * b1 * b2) / 255 : 255 - (2 * (255 - b1) * (255 - b2)) / 255;
            break;
        default: // multiply
            r = (r1 * r2) / 255;
            g = (g1 * g2) / 255;
            b = (b1 * b2) / 255;
    }
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// ============= HSL Manipulation =============
export function hexToHsl(hex: number): { h: number; s: number; l: number } {
    const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number): number {
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

export function adjustHue(hex: number, degrees: number): number {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex((h + degrees / 360) % 1, s, l);
}

export function adjustSaturation(hex: number, delta: number): number {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, clamp(s + delta, 0, 1), l);
}

export function adjustLightness(hex: number, delta: number): number {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, s, clamp(l + delta, 0, 1));
}

export function darken(hex: number, amount: number = 0.1): number {
    return adjustLightness(hex, -amount);
}

export function lighten(hex: number, amount: number = 0.1): number {
    return adjustLightness(hex, amount);
}

export function saturate(hex: number, amount: number = 0.1): number {
    return adjustSaturation(hex, amount);
}

export function desaturate(hex: number, amount: number = 0.1): number {
    return adjustSaturation(hex, -amount);
}

// ============= Gradient Utilities =============
export interface ColorStop {
    offset: number;
    color: number | string;
}

export function generateGradient(
    stops: ColorStop[],
    steps: number = 10,
): number[] {
    const result: number[] = [];
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        let prevStop = stops[0], nextStop = stops[stops.length - 1];
        for (let j = 0; j < stops.length - 1; j++) {
            if (t >= stops[j].offset && t <= stops[j + 1].offset) {
                prevStop = stops[j];
                nextStop = stops[j + 1];
                break;
            }
        }
        const localT = (t - prevStop.offset) / (nextStop.offset - prevStop.offset || 1);
        const getRgbValue = (color: number | string): number => {
            if (typeof color === 'number') return color;
            const rgb = hexToRgb(color);
            if (!rgb) return 0;
            return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
        };
        const c1 = getRgbValue(prevStop.color);
        const c2 = getRgbValue(nextStop.color);
        result.push(lerpColor(c1, c2, localT));
    }
    return result;
}

// ============= Color Palette Generation =============
export function generatePalette(
    baseColor: number,
    count: number,
    mode: 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic' = 'analogous',
): number[] {
    const { h, s, l } = hexToHsl(baseColor);
    const palette: number[] = [];
    const angles: number[] = {
        analogous: [0, 30, -30, 60, -60],
        complementary: [0, 180],
        triadic: [0, 120, 240],
        'split-complementary': [0, 150, 210],
        tetradic: [0, 90, 180, 270],
    }[mode];
    for (let i = 0; i < count; i++) {
        const angle = angles[i % angles.length] || 0;
        const lightness = l + (i - Math.floor(count / 2)) * 0.1;
        palette.push(hslToHex((h + angle / 360 + 1) % 1, s, clamp(lightness, 0.1, 0.9)));
    }
    return palette;
}

export function generateGradientPalette(startColor: number, endColor: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => lerpColor(startColor, endColor, i / (count - 1)));
}

// ============= CSS Gradient String =============
export function toCssGradient(type: 'linear' | 'radial', stops: ColorStop[], angle?: number): string {
    const cssStops = stops.map(s => `${typeof s.color === 'number' ? toHexColor(s.color) : s.color} ${(s.offset * 100).toFixed(0)}%`).join(', ');
    if (type === 'linear') {
        return `linear-gradient(${angle ?? 180}deg, ${cssStops})`;
    }
    return `radial-gradient(circle, ${cssStops})`;
}

// ============= Parse Named Colors =============
const NAMED_COLORS: Record<string, string> = {
    red: '#ff0000', green: '#00ff00', blue: '#0000ff', yellow: '#ffff00',
    cyan: '#00ffff', magenta: '#ff00ff', white: '#ffffff', black: '#000000',
    orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', gray: '#808080',
    grey: '#808080', navy: '#000080', teal: '#008080', olive: '#808000',
    maroon: '#800000', silver: '#c0c0c0', lime: '#00ff00', aqua: '#00ffff',
};

export function parseColor(color: string | number): number {
    if (typeof color === 'number') return color;
    if (color.startsWith('#')) return parseInt(color.slice(1), 16);
    if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match?.length >= 3) return (parseInt(match[0]) << 16) | (parseInt(match[1]) << 8) | parseInt(match[2]);
    }
    const named = NAMED_COLORS[color.toLowerCase()];
    return named ? parseInt(named.slice(1), 16) : 0;
}
