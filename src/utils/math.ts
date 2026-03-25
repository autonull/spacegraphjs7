export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

export function lerpVector3(
    out: { x: number; y: number; z: number },
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    t: number,
): { x: number; y: number; z: number } {
    out.x = lerp(a.x, b.x, t);
    out.y = lerp(a.y, b.y, t);
    out.z = lerp(a.z, b.z, t);
    return out;
}

export function isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
}

export function mergeDeep<T extends Record<string, unknown>>(
    target: T,
    ...sources: Partial<T>[]
): T {
    for (const source of sources) {
        if (!source) continue;
        for (const key in source) {
            const targetValue = target[key];
            const sourceValue = source[key];
            if (isObject(targetValue) && isObject(sourceValue)) {
                target[key] = mergeDeep(
                    targetValue as Record<string, unknown>,
                    sourceValue as Record<string, unknown>,
                ) as T[Extract<keyof T, string>];
            } else {
                target[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }
    }
    return target;
}

export function toHexColor(numColor: number | string): string {
    if (typeof numColor === 'string') {
        if (numColor.startsWith('#')) return numColor;
        if (numColor.startsWith('rgb')) {
            const match = numColor.match(/\d+/g);
            if (match && match.length >= 3) {
                const r = parseInt(match[0], 10).toString(16).padStart(2, '0');
                const g = parseInt(match[1], 10).toString(16).padStart(2, '0');
                const b = parseInt(match[2], 10).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`;
            }
        }
        return numColor;
    }
    if (typeof numColor !== 'number' || isNaN(numColor)) {
        return '#ffffff';
    }
    const hex = Math.floor(numColor).toString(16).padStart(6, '0');
    return `#${hex}`;
}

export function randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
    return Math.floor(randomRange(min, max + 1));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

export function mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
