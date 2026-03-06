import * as THREE from 'three';

export interface Poolable {
    reset(): void;
}

/**
 * A generic fixed-size or dynamic object pool to prevent allocation thrashing.
 */
export class ObjectPool<T> {
    private readonly createFn: () => T;
    private readonly resetFn?: (obj: T) => void;
    private readonly pool: T[] = [];
    private readonly maxSize: number;

    constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize = 0) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
    }

    /**
     * Acquire an object from the pool, or create a new one if empty.
     */
    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.createFn();
    }

    /**
     * Release an object back to the pool.
     */
    release(obj: T): void {
        if (this.resetFn) {
            this.resetFn(obj);
        } else if ((obj as any).reset && typeof (obj as any).reset === 'function') {
            (obj as Poolable).reset();
        }

        if (this.maxSize === 0 || this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
    }

    /**
     * Clear the pool, allowing objects to be garbage collected.
     */
    clear(): void {
        this.pool.length = 0;
    }

    get size(): number {
        return this.pool.length;
    }
}

/**
 * Central manager for specific object pools.
 */
export class MathPool {
    private static instance: MathPool;
    private pools = new Map<string, ObjectPool<any>>();

    private constructor() {}

    /**
     * Get the singleton instance.
     */
    static getInstance(): MathPool {
        if (!MathPool.instance) {
            MathPool.instance = new MathPool();
            MathPool.instance.createThreeJSPools();
        }
        return MathPool.instance;
    }

    /**
     * Create default pools for common Three.js math objects.
     */
    private createThreeJSPools(): void {
        // Vector3 Pool
        this.pools.set(
            'Vector3',
            new ObjectPool<THREE.Vector3>(
                () => new THREE.Vector3(),
                (v) => v.set(0, 0, 0),
            ),
        );

        // Matrix4 Pool
        this.pools.set(
            'Matrix4',
            new ObjectPool<THREE.Matrix4>(
                () => new THREE.Matrix4(),
                (m) => m.identity(),
            ),
        );

        // Color Pool
        this.pools.set(
            'Color',
            new ObjectPool<THREE.Color>(
                () => new THREE.Color(),
                (c) => c.setHex(0xffffff),
            ),
        );

        // Quaternion Pool
        this.pools.set(
            'Quaternion',
            new ObjectPool<THREE.Quaternion>(
                () => new THREE.Quaternion(),
                (q) => q.identity(),
            ),
        );
    }

    /**
     * Retrieve a specific pool by name.
     */
    getPool<T>(name: string): ObjectPool<T> | undefined {
        return this.pools.get(name) as ObjectPool<T>;
    }

    /**
     * Acquire a Vector3 instance.
     */
    acquireVector3(): THREE.Vector3 {
        return this.pools.get('Vector3')!.acquire();
    }

    /**
     * Release a Vector3 instance.
     */
    releaseVector3(v: THREE.Vector3): void {
        this.pools.get('Vector3')!.release(v);
    }

    /**
     * Acquire a Matrix4 instance.
     */
    acquireMatrix4(): THREE.Matrix4 {
        return this.pools.get('Matrix4')!.acquire();
    }

    /**
     * Release a Matrix4 instance.
     */
    releaseMatrix4(m: THREE.Matrix4): void {
        this.pools.get('Matrix4')!.release(m);
    }

    /**
     * Clear all pools.
     */
    clearAll(): void {
        for (const pool of this.pools.values()) {
            pool.clear();
        }
    }
}
