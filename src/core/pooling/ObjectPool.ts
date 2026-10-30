import { Box3, Matrix4, Vector2, Vector3 } from 'three';

export class ObjectPool<T> {
  readonly available: T[] = [];
  readonly createFn: () => T;
  readonly resetFn: (obj: T) => void;
  readonly maxPoolSize: number;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize = 100,
    maxPoolSize = 10000
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxPoolSize = maxPoolSize;
    for (let i = 0; i < initialSize; i++) this.available.push(createFn());
  }

  private _acquiredCount = 0;

  get acquiredCount(): number {
    return this._acquiredCount;
  }

  get size(): number {
    return this.available.length;
  }

  get poolSize(): number {
    return this.available.length;
  }

  acquire(): T {
    this._acquiredCount++;
    return this.available.pop() ?? this.createFn();
  }

  release(obj: T): void {
    if (this.available.length >= this.maxPoolSize) return;
    this.resetFn(obj);
    this.available.push(obj);
  }

  clear(): void {
    this.available.length = 0;
  }

  stats(): { available: number; acquired: number; utilization: number } {
    const total = this.maxPoolSize;
    return {
      available: this.available.length,
      acquired: this._acquiredCount,
      utilization: total > 0 ? (total - this.available.length) / total : 0,
    };
  }
}

export class MathPool {
  private static instance: MathPool;
  readonly vector3Pool: ObjectPool<Vector3>;
  readonly vector2Pool: ObjectPool<Vector2>;
  readonly matrix4Pool: ObjectPool<Matrix4>;
  readonly box3Pool: ObjectPool<Box3>;

  private constructor() {
    this.vector3Pool = new ObjectPool(
      () => new Vector3(),
      (v) => v.set(0, 0, 0),
      1000,
      50000
    );
    this.vector2Pool = new ObjectPool(
      () => new Vector2(),
      (v) => v.set(0, 0),
      500,
      10000
    );
    this.matrix4Pool = new ObjectPool(
      () => new Matrix4(),
      (m) => m.identity(),
      200,
      5000
    );
    this.box3Pool = new ObjectPool(
      () => new Box3(),
      (b) => b.makeEmpty(),
      200,
      5000
    );
  }

  static getInstance(): MathPool {
    return MathPool.instance ?? (MathPool.instance = new MathPool());
  }

  acquireVector3(): Vector3 {
    return this.vector3Pool.acquire();
  }

  releaseVector3(v: Vector3): void {
    this.vector3Pool.release(v);
  }

  acquireVector2(): Vector2 {
    return this.vector2Pool.acquire();
  }

  releaseVector2(v: Vector2): void {
    this.vector2Pool.release(v);
  }

  acquireMatrix4(): Matrix4 {
    return this.matrix4Pool.acquire();
  }

  releaseMatrix4(m: Matrix4): void {
    this.matrix4Pool.release(m);
  }

  acquireBox3(): Box3 {
    return this.box3Pool.acquire();
  }

  releaseBox3(b: Box3): void {
    this.box3Pool.release(b);
  }

  clear(): void {
    this.vector3Pool.clear();
    this.vector2Pool.clear();
    this.matrix4Pool.clear();
    this.box3Pool.clear();
  }

  getStats(): Record<string, number> {
    return {
      vector3: this.vector3Pool.size,
      vector2: this.vector2Pool.size,
      matrix4: this.matrix4Pool.size,
      box3: this.box3Pool.size,
    };
  }
}

function pooled<V, R>(acquire: () => V, release: (value: V) => void, fn: (value: V) => R): R {
  const value = acquire();
  try {
    return fn(value);
  } finally {
    release(value);
  }
}

export const withPooledVector3 = <T>(pool: MathPool, fn: (v: Vector3) => T): T =>
  pooled(
    () => pool.acquireVector3(),
    (v) => pool.releaseVector3(v),
    fn
  );

export const withPooledVector2 = <T>(pool: MathPool, fn: (v: Vector2) => T): T =>
  pooled(
    () => pool.acquireVector2(),
    (v) => pool.releaseVector2(v),
    fn
  );

export const withPooledMatrix4 = <T>(pool: MathPool, fn: (m: Matrix4) => T): T =>
  pooled(
    () => pool.acquireMatrix4(),
    (m) => pool.releaseMatrix4(m),
    fn
  );

export const withPooledBox3 = <T>(pool: MathPool, fn: (b: Box3) => T): T =>
  pooled(
    () => pool.acquireBox3(),
    (b) => pool.releaseBox3(b),
    fn
  );
