export type Instruments = {
    readonly octaves: Readonly<Record<string, number>>;
    readonly weights: Readonly<Record<string, number>>;
    readonly edgeKinds: Readonly<Record<string, number>>;
    readonly omitted: number;
};

export const tally = (values: readonly string[]): Readonly<Record<string, number>> =>
    values.reduce<Record<string, number>>((counts, value) => {
        counts[value] = (counts[value] ?? 0) + 1;
        return counts;
    }, {});

/** Instrument counts are read from the rendered model; no hidden state is written. */
export const instrumentsFor = (source: {
    readonly bands: readonly string[];
    readonly weights: Readonly<Record<string, number>>;
    readonly edgeKinds: readonly string[];
    readonly omitted: number;
}): Instruments => ({
    octaves: tally(source.bands),
    weights: { ...source.weights },
    edgeKinds: tally(source.edgeKinds),
    omitted: source.omitted,
});
