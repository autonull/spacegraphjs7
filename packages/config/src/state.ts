import { ConfigSpace } from './space';
import type { ConfigValue } from './types';

/** Immutable, URL-encodable snapshot of one value per axis. */
export class ConfigState {
    readonly #values: ReadonlyMap<string, ConfigValue>;
    readonly #space: ConfigSpace;

    private constructor(space: ConfigSpace, values: ReadonlyMap<string, ConfigValue>) {
        this.#space = space;
        this.#values = values;
    }

    static from(space: ConfigSpace, overrides: Record<string, ConfigValue> = {}): ConfigState {
        const entries = Object.entries(space.defaultValues()).map(
            ([id, value]): [string, ConfigValue] => [id, overrides[id] ?? value],
        );
        return new ConfigState(space, new Map(entries) as ReadonlyMap<string, ConfigValue>);
    }

    static fromRecord(space: ConfigSpace, record: Readonly<Record<string, ConfigValue>>): ConfigState {
        return new ConfigState(space, new Map(Object.entries(record)));
    }

    static fromSearch(space: ConfigSpace, search: string): ConfigState {
        const params = new URLSearchParams(search.replace(/^#/, ''));
        const overrides: Record<string, ConfigValue> = {};
        for (const [id, value] of params) {
            if (space.has(id) && space.values(id).includes(value)) overrides[id] = value;
        }
        return ConfigState.from(space, overrides);
    }

    get space(): ConfigSpace {
        return this.#space;
    }

    get(id: string): ConfigValue | undefined {
        return this.#values.get(id);
    }

    set(id: string, value: ConfigValue): ConfigState {
        if (!this.#space.has(id) || !this.#space.values(id).includes(value)) return this;
        if (this.#values.get(id) === value) return this;
        return new ConfigState(this.#space, new Map([...this.#values, [id, value]]));
    }

    toRecord(): Readonly<Record<string, ConfigValue>> {
        return Object.fromEntries(this.#values);
    }

    toSearch(): string {
        const params = new URLSearchParams();
        for (const id of this.#space.ids()) {
            const value = this.#values.get(id);
            if (value !== undefined) params.set(id, value);
        }
        return params.toString();
    }

    toHash(): string {
        return `#${this.toSearch()}`;
    }

    equals(other: ConfigState): boolean {
        const ids = this.#space.ids();
        const otherIds = other.space.ids();
        if (ids.length !== otherIds.length || ids.some((id, index) => id !== otherIds[index])) {
            return false;
        }
        return ids.every((id) => this.#values.get(id) === other.get(id));
    }
}
