export type FocusLens = {
    readonly octaves: ReadonlyMap<string, number>;
    readonly weights: ReadonlyMap<string, number>;
    readonly muted: ReadonlySet<string>;
};

/** One neighbourhood stays loud; the rest drop octaves and mute but keep every id. */
export const focusLens = (
    octaves: ReadonlyMap<string, number>,
    weights: ReadonlyMap<string, number>,
    neighbours: ReadonlySet<string>,
    drop = 1.5,
): FocusLens => {
    const lensOctaves = new Map<string, number>();
    const lensWeights = new Map<string, number>();
    const muted = new Set<string>();
    for (const [id, octave] of octaves) {
        const weight = weights.get(id) ?? 0;
        const inside = neighbours.has(id);
        lensOctaves.set(id, inside ? octave : Math.max(0, octave - drop));
        lensWeights.set(id, inside ? Math.min(1, weight + 0.25) : Math.max(0, weight - 0.25));
        if (!inside) muted.add(id);
    }
    return { octaves: lensOctaves, weights: lensWeights, muted };
};
