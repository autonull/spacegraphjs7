// P5.1. A deterministic cartesian matrix over discoverable axis values. Full products are enumerated;
// large ones are sampled with a documented policy. The sampler has no config or host dependency.

export interface MatrixAxis {
    readonly id: string;
    readonly values: readonly string[];
}

export interface MatrixCell {
    /** Stable, URL-like id: `axis=value&axis=value` in axis order. */
    readonly id: string;
    readonly values: Readonly<Record<string, string>>;
}

export interface SamplingPolicy {
    readonly seed?: number;
    readonly maxCells?: number;
    /** Axes that must appear in every pairwise combination when the product is sampled. */
    readonly pairWith?: readonly string[];
}

export interface CaptureMatrix {
    readonly axes: readonly string[];
    readonly total: number;
    readonly sampled: number;
    readonly strategy: 'full' | 'sampled';
    readonly seed: number;
    readonly maxCells: number;
    readonly cells: readonly MatrixCell[];
}

const cellId = (values: Readonly<Record<string, string>>): string =>
    Object.entries(values)
        .map(([axis, value]) => `${axis}=${value}`)
        .join('&');

function seeded(seed: number): () => number {
    let value = seed >>> 0;
    return () => (value = (value * 1103515245 + 12345) >>> 0) / 0x1_0000_0000;
}

/** Enumerate the full product or a seeded sample with baseline and pairwise coverage. */
export function cartesianMatrix(
    axes: readonly MatrixAxis[],
    policy: SamplingPolicy = {},
): CaptureMatrix {
    const usable = axes.filter((axis) => axis.values.length > 0);
    const ids = usable.map((axis) => axis.id);
    const seed = policy.seed ?? 1;
    const maxCells = policy.maxCells ?? 64;
    const total = usable.reduce((count, axis) => count * axis.values.length, 1);
    const baseline = Object.fromEntries(usable.map((axis) => [axis.id, axis.values[0]!]));

    if (total <= maxCells) {
        let combinations: Record<string, string>[] = [{}];
        for (const axis of usable) {
            combinations = combinations.flatMap((values) =>
                axis.values.map((value) => ({ ...values, [axis.id]: value })),
            );
        }
        const cells = combinations.map((values) => ({ id: cellId(values), values }));
        return {
            axes: ids,
            total,
            sampled: cells.length,
            strategy: 'full',
            seed,
            maxCells,
            cells,
        };
    }

    const cells = new Map<string, MatrixCell>([
        [cellId(baseline), { id: cellId(baseline), values: baseline }],
    ]);
    const add = (values: Record<string, string>) => {
        const cell = { id: cellId(values), values };
        cells.set(cell.id, cell);
    };
    const pairIds = (policy.pairWith ?? ids).filter((id) => ids.includes(id));
    for (let i = 0; i < pairIds.length && cells.size < maxCells; i++) {
        for (let j = i + 1; j < pairIds.length && cells.size < maxCells; j++) {
            const left = usable.find((axis) => axis.id === pairIds[i])!;
            const right = usable.find((axis) => axis.id === pairIds[j])!;
            for (const leftValue of left.values) {
                for (const rightValue of right.values) {
                    if (cells.size >= maxCells) break;
                    add({ ...baseline, [left.id]: leftValue, [right.id]: rightValue });
                }
            }
        }
    }

    const random = seeded(seed);
    while (cells.size < maxCells) {
        add(
            Object.fromEntries(
                usable.map((axis) => [
                    axis.id,
                    axis.values[Math.floor(random() * axis.values.length)]!,
                ]),
            ),
        );
    }
    return {
        axes: ids,
        total,
        sampled: cells.size,
        strategy: 'sampled',
        seed,
        maxCells,
        cells: [...cells.values()],
    };
}

export function hasCombination(
    matrix: CaptureMatrix,
    combination: Readonly<Record<string, string>>,
): boolean {
    return matrix.cells.some((cell) =>
        Object.entries(combination).every(([axis, value]) => cell.values[axis] === value),
    );
}

export function axisValues(matrix: CaptureMatrix, axis: string): readonly string[] {
    return [...new Set(matrix.cells.map((cell) => cell.values[axis]).filter(Boolean))];
}
