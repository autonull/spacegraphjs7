// builder/base.ts - Base builder with fluent API
export abstract class BaseBuilder<T> {
  protected spec: T;

  protected constructor(spec: T) {
    this.spec = spec;
  }

  data(data: Record<string, unknown>): this {
    this.mergeData(data);
    return this;
  }

  build(): T {
    return this.spec;
  }

  toSpec(): T {
    return this.spec;
  }

  val(): T {
    return this.toSpec();
  }

  get(): T {
    return this.toSpec();
  }

  transform(fn: (spec: T) => T): this {
    this.spec = fn(this.spec);
    return this;
  }

  validate(fn: (spec: T) => boolean): this {
    if (!fn(this.spec)) throw new Error('Validation failed');
    return this;
  }

  protected mergeData(updates: Record<string, unknown>): void {
    (this.spec as any).data = { ...((this.spec as any).data ?? {}), ...updates };
  }
}

export type GenericBuilder<T> = new (...args: unknown[]) => BaseBuilder<T> & { build(): T };
