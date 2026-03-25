// SpaceGraphJS v7.0 - Object Pool System
// Generic object pooling for performance-critical paths

/**
 * Generic object pool
 * Pre-allocates objects and reuses them to reduce GC pressure
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private initialSize: number;
  private maxPoolSize: number;

  /**
   * Create an object pool
   * @param createFn - Function to create new instances
   * @param resetFn - Function to reset objects before returning to pool
   * @param initialSize - Number of objects to pre-allocate (default: 100)
   * @param maxPoolSize - Maximum pool size (default: 10000)
   */
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 100,
    maxPoolSize: number = 10000
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.initialSize = initialSize;
    this.maxPoolSize = maxPoolSize;

    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn());
    }
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    
    // Pool exhausted - create new instance
    return this.createFn();
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (this.available.length >= this.maxPoolSize) {
      // Pool at capacity - don't keep the object
      return;
    }

    this.resetFn(obj);
    this.available.push(obj);
  }

  /**
   * Get the number of available objects in the pool
   */
  get size(): number {
    return this.available.length;
  }

  /**
   * Clear all pooled objects
   */
  clear(): void {
    this.available = [];
  }
}

/**
 * Math object pools for Three.js types
 */
import * as THREE from 'three';

export class MathPool {
  private static instance: MathPool;

  private vector3Pool: ObjectPool<THREE.Vector3>;
  private vector2Pool: ObjectPool<THREE.Vector2>;
  private matrix4Pool: ObjectPool<THREE.Matrix4>;
  private quaternionPool: ObjectPool<THREE.Quaternion>;
  private colorPool: ObjectPool<THREE.Color>;
  private box3Pool: ObjectPool<THREE.Box3>;

  private constructor() {
    this.vector3Pool = new ObjectPool(
      () => new THREE.Vector3(),
      (v) => v.set(0, 0, 0),
      1000,
      50000
    );

    this.vector2Pool = new ObjectPool(
      () => new THREE.Vector2(),
      (v) => v.set(0, 0),
      500,
      10000
    );

    this.matrix4Pool = new ObjectPool(
      () => new THREE.Matrix4(),
      (m) => m.identity(),
      200,
      5000
    );

    this.quaternionPool = new ObjectPool(
      () => new THREE.Quaternion(),
      (q) => q.set(0, 0, 0, 1),
      500,
      10000
    );

    this.colorPool = new ObjectPool(
      () => new THREE.Color(),
      (c) => c.setHex(0x000000),
      200,
      5000
    );

    this.box3Pool = new ObjectPool(
      () => new THREE.Box3(),
      (b) => b.makeEmpty(),
      200,
      5000
    );
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MathPool {
    if (!MathPool.instance) {
      MathPool.instance = new MathPool();
    }
    return MathPool.instance;
  }

  // Vector3 operations
  acquireVector3(): THREE.Vector3 {
    return this.vector3Pool.acquire();
  }

  releaseVector3(v: THREE.Vector3): void {
    this.vector3Pool.release(v);
  }

  // Vector2 operations
  acquireVector2(): THREE.Vector2 {
    return this.vector2Pool.acquire();
  }

  releaseVector2(v: THREE.Vector2): void {
    this.vector2Pool.release(v);
  }

  // Matrix4 operations
  acquireMatrix4(): THREE.Matrix4 {
    return this.matrix4Pool.acquire();
  }

  releaseMatrix4(m: THREE.Matrix4): void {
    this.matrix4Pool.release(m);
  }

  // Quaternion operations
  acquireQuaternion(): THREE.Quaternion {
    return this.quaternionPool.acquire();
  }

  releaseQuaternion(q: THREE.Quaternion): void {
    this.quaternionPool.release(q);
  }

  // Color operations
  acquireColor(): THREE.Color {
    return this.colorPool.acquire();
  }

  releaseColor(c: THREE.Color): void {
    this.colorPool.release(c);
  }

  // Box3 operations
  acquireBox3(): THREE.Box3 {
    return this.box3Pool.acquire();
  }

  releaseBox3(b: THREE.Box3): void {
    this.box3Pool.release(b);
  }

  /**
   * Clear all pools
   */
  clear(): void {
    this.vector3Pool.clear();
    this.vector2Pool.clear();
    this.matrix4Pool.clear();
    this.quaternionPool.clear();
    this.colorPool.clear();
    this.box3Pool.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): Record<string, number> {
    return {
      vector3: this.vector3Pool.size,
      vector2: this.vector2Pool.size,
      matrix4: this.matrix4Pool.size,
      quaternion: this.quaternionPool.size,
      color: this.colorPool.size,
      box3: this.box3Pool.size
    };
  }
}

/**
 * Helper for pooled operations in hot paths
 * Usage:
 *   const result = withPooledVector3(mathPool, (v) => {
 *     v.copy(a).sub(b);
 *     return v.length();
 *   });
 */
export function withPooledVector3<T>(
  pool: MathPool,
  fn: (v: THREE.Vector3) => T
): T {
  const v = pool.acquireVector3();
  try {
    return fn(v);
  } finally {
    pool.releaseVector3(v);
  }
}

export function withPooledVector2<T>(
  pool: MathPool,
  fn: (v: THREE.Vector2) => T
): T {
  const v = pool.acquireVector2();
  try {
    return fn(v);
  } finally {
    pool.releaseVector2(v);
  }
}

export function withPooledMatrix4<T>(
  pool: MathPool,
  fn: (m: THREE.Matrix4) => T
): T {
  const m = pool.acquireMatrix4();
  try {
    return fn(m);
  } finally {
    pool.releaseMatrix4(m);
  }
}

export function withPooledBox3<T>(
  pool: MathPool,
  fn: (b: THREE.Box3) => T
): T {
  const b = pool.acquireBox3();
  try {
    return fn(b);
  } finally {
    pool.releaseBox3(b);
  }
}
