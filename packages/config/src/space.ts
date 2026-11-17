import type { AxisDescriptor, ConfigValue } from './types';

/** An ordered set of axis descriptors. Insertion order is the display order. */
export class ConfigSpace {
    readonly axes: readonly AxisDescriptor[];
    readonly #byId: ReadonlyMap<string, AxisDescriptor>;

    constructor(axes: readonly AxisDescriptor[] = []) {
        this.axes = axes;
        this.#byId = new Map(axes.map((axis) => [axis.id, axis]));
    }

    ids(): string[] {
        return this.axes.map((axis) => axis.id);
    }

    get(id: string): AxisDescriptor | undefined {
        return this.#byId.get(id);
    }

    has(id: string): boolean {
        return this.#byId.has(id);
    }

    values(id: string): readonly ConfigValue[] {
        return this.get(id)?.values ?? [];
    }

    /** First declared value, or the descriptor default when it is declared. */
    fallback(id: string): ConfigValue | undefined {
        const axis = this.get(id);
        if (!axis) return undefined;
        const values = axis.values;
        if (values.length === 0) return undefined;
        const candidate = axis.default ?? values[0];
        return values.includes(candidate ?? '') ? candidate : values[0];
    }

    defaultValues(): Readonly<Record<string, ConfigValue>> {
        return Object.fromEntries(
            this.axes.flatMap((axis) => {
                const value = this.fallback(axis.id);
                return value === undefined ? [] : [[axis.id, value] as const];
            }),
        );
    }
}
