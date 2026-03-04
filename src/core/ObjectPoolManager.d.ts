export declare class ObjectPoolManager<T> {
    private pool;
    registerPool(poolKey: string): void;
    get(poolKey: string): T | null;
    release(poolKey: string, obj: T): void;
    clear(disposeFn?: (obj: T) => void): void;
}
