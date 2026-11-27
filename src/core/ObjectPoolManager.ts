export class ObjectPoolManager<T> {
    private pool: Map<string, T[]> = new Map();

    public registerPool(poolKey: string): void {
        this.pool.set(poolKey, this.pool.get(poolKey) ?? []);
    }

    public get(poolKey: string): T | null {
        return this.pool.get(poolKey)?.pop() ?? null;
    }

    public release(poolKey: string, obj: T): void {
        const objects = this.pool.get(poolKey) ?? [];
        objects.push(obj);
        this.pool.set(poolKey, objects);
    }

    public clear(disposeFn?: (obj: T) => void): void {
        if (disposeFn) {
            for (const objects of this.pool.values()) {
                for (const obj of objects) {
                    disposeFn(obj);
                }
            }
        }
        this.pool.clear();
    }
}
