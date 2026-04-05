export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(value, max));

export const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;

export const isObject = (item: unknown): item is Record<string, unknown> =>
    item !== null && typeof item === 'object' && !Array.isArray(item);

export function mergeDeep<T extends Record<string, unknown>>(
    target: T,
    ...sources: Partial<T>[]
): T {
    for (const source of sources) {
        if (!source) continue;
        for (const key in source) {
            const targetValue = target[key];
            const sourceValue = source[key];
            target[key] =
                isObject(targetValue) && isObject(sourceValue)
                    ? (mergeDeep(
                          targetValue as Record<string, unknown>,
                          sourceValue as Record<string, unknown>,
                      ) as T[Extract<keyof T, string>])
                    : (sourceValue as T[Extract<keyof T, string>]);
        }
    }
    return target;
}

export const randomRange = (min: number, max: number): number => Math.random() * (max - min) + min;

export const randomInt = (min: number, max: number): number =>
    Math.floor(randomRange(min, max + 1));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
};

export const mapRange = (
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
): number =>
    inMax === inMin ? outMin : ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

export function safeClone<T>(obj: T): T {
    if (obj == null) return obj;
    try {
        return structuredClone(obj);
    } catch {
        return JSON.parse(JSON.stringify(obj));
    }
}
