export function getLuminance(r: number, g: number, b: number): number {
    const clamped = [
        Math.max(0, Math.min(255, r)),
        Math.max(0, Math.min(255, g)),
        Math.max(0, Math.min(255, b)),
    ];
    const a = clamped.map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
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
                r: Math.max(0, Math.min(255, parseInt(match[1], 10))),
                g: Math.max(0, Math.min(255, parseInt(match[2], 10))),
                b: Math.max(0, Math.min(255, parseInt(match[3], 10))),
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

export function getColorsByFrequency(colors: string[]): string[] {
    const counts = new Map<string, number>();
    for (const c of colors) {
        counts.set(c, (counts.get(c) || 0) + 1);
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map((x) => x[0]);
}
