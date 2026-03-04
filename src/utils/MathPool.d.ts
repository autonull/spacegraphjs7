import * as THREE from 'three';
export interface Poolable {
    reset(): void;
}
/**
 * A generic fixed-size or dynamic object pool to prevent allocation thrashing.
 */
export declare class ObjectPool<T> {
    private readonly createFn;
    private readonly resetFn?;
    private readonly pool;
    private readonly maxSize;
    constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize?: number);
    /**
     * Acquire an object from the pool, or create a new one if empty.
     */
    acquire(): T;
    /**
     * Release an object back to the pool.
     */
    release(obj: T): void;
    /**
     * Clear the pool, allowing objects to be garbage collected.
     */
    clear(): void;
    get size(): number;
}
/**
 * Central manager for specific object pools.
 */
export declare class MathPool {
    private static instance;
    private pools;
    private constructor();
    /**
     * Get the singleton instance.
     */
    static getInstance(): MathPool;
    /**
     * Create default pools for common Three.js math objects.
     */
    private createThreeJSPools;
    /**
     * Retrieve a specific pool by name.
     */
    getPool<T>(name: string): ObjectPool<T> | undefined;
    /**
     * Acquire a Vector3 instance.
     */
    acquireVector3(): THREE.Vector3;
    /**
     * Release a Vector3 instance.
     */
    releaseVector3(v: THREE.Vector3): void;
    /**
     * Acquire a Matrix4 instance.
     */
    acquireMatrix4(): THREE.Matrix4;
    /**
     * Release a Matrix4 instance.
     */
    releaseMatrix4(m: THREE.Matrix4): void;
    /**
     * Clear all pools.
     */
    clearAll(): void;
}
