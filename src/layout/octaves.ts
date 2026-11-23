import type { Position } from './strategies';

export interface OctaveScale {
    readonly octave: number;
    readonly scale: number;
}

export interface OctaveLayoutOptions {
    readonly card: readonly [number, number];
    /** Deepest descendant level; level 0 keeps the full card size. */
    readonly maxDepth?: number;
    /** Child-ring radius as a multiple of the parent card width. */
    readonly radiusFactor?: number;
    /** Root-ring radius as a multiple of the parent card width. */
    readonly rootRadiusFactor?: number;
    readonly phase?: number;
}

export interface OctaveLayout {
    readonly positions: ReadonlyMap<string, Position>;
    readonly octaves: ReadonlyMap<string, OctaveScale>;
    readonly bounds: { readonly min: Position; readonly max: Position };
}

/**
 * Place a containment hierarchy at halving world scales: a root at 1x, its children at 1/2x,
 * grandchildren at 1/4x. The same ring rule at every level makes the structure self-similar, so
 * one frame shows the whole range and zooming in promotes each smaller ring to a readable card.
 * The caller owns the parent map and all domain vocabulary.
 */
export function octaveLayout(
    ids: readonly string[],
    parentOf: ReadonlyMap<string, string>,
    options: OctaveLayoutOptions,
): OctaveLayout {
    const known = new Set(ids);
    const children = new Map<string, string[]>();
    const roots: string[] = [];
    for (const id of ids) {
        const parent = parentOf.get(id);
        if (parent && known.has(parent) && parent !== id) {
            const siblings = children.get(parent) ?? [];
            siblings.push(id);
            children.set(parent, siblings);
        } else roots.push(id);
    }

    const positions = new Map<string, Position>();
    const octaves = new Map<string, OctaveScale>();
    const visited = new Set<string>();
    const maxDepth = options.maxDepth ?? 2;
    const radiusFactor = options.radiusFactor ?? 0.85;
    const rootRadiusFactor = options.rootRadiusFactor ?? 0.6;

    const place = (id: string, octave: number, x: number, y: number): void => {
        if (visited.has(id)) return;
        visited.add(id);
        const scale = 2 ** octave;
        positions.set(id, { x, y, z: 0 });
        octaves.set(id, { octave, scale });
        if (octave <= -maxDepth) return;
        const siblings = children.get(id) ?? [];
        if (!siblings.length) return;
        const radius = options.card[0] * scale * radiusFactor;
        const phase = (options.phase ?? 0) + octave * 0.37;
        siblings.forEach((child, index) => {
            const angle = (2 * Math.PI * index) / siblings.length + phase;
            place(child, octave - 1, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        });
    };

    const rootRadius = options.card[0] * rootRadiusFactor;
    roots.forEach((id, index) => {
        const angle = (2 * Math.PI * index) / roots.length;
        place(
            id,
            0,
            Math.cos(angle) * rootRadius,
            Math.sin(angle) * rootRadius,
        );
    });
    for (const id of ids) if (!visited.has(id)) place(id, 0, 0, 0);

    const xs = [...positions.values()].map((point) => point.x);
    const ys = [...positions.values()].map((point) => point.y);
    return {
        positions,
        octaves,
        bounds: {
            min: { x: Math.min(...xs), y: Math.min(...ys), z: 0 },
            max: { x: Math.max(...xs), y: Math.max(...ys), z: 0 },
        },
    };
}
