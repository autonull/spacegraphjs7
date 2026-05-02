// builder/base.ts - Base builder with fluent API
export abstract class BaseBuilder<T> {
    protected spec: T;

    constructor(spec: T) {
        this.spec = spec;
    }

    data(data: Record<string, unknown>): this {
        (this.spec as any).data = { ...(this.spec as any).data, ...data };
        return this;
    }

    build(): T { return this.spec; }
    toSpec(): T { return this.spec; }
    val(): T { return this.spec; }
    get(): T { return this.spec; }

    protected mergeData(updates: Record<string, unknown>): void {
        (this.spec as any).data = { ...((this.spec as any).data ?? {}), ...updates };
    }

    transform(fn: (spec: T) => T): this {
        this.spec = fn(this.spec);
        return this;
    }

    validate(fn: (spec: T) => boolean): this {
        if (!fn(this.spec)) throw new Error('Validation failed');
        return this;
    }
}

export type GenericBuilder<T> = new (...args: unknown[]) => BaseBuilder<T> & { build(): T };