import * as THREE from 'three';

export class ObjectPool<T> {
  private readonly available: T[] = [];
  private readonly createFn: () => T;
  private readonly resetFn: (obj: T) => void;
  private readonly maxPoolSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 100, maxPoolSize = 10000) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxPoolSize = maxPoolSize;
    for (let i = 0; i < initialSize; i++) this.available.push(createFn());
  }

  acquire(): T {
    return this.available.pop() ?? this.createFn();
  }

  release(obj: T): void {
    if (this.available.length >= this.maxPoolSize) return;
    this.resetFn(obj);
    this.available.push(obj);
  }

  get size(): number {
    return this.available.length;
  }

  clear(): void {
    this.available.length = 0;
  }
}

export class MathPool {
  private static instance: MathPool;
  private readonly vector3Pool: ObjectPool<THREE.Vector3>;
  private readonly vector2Pool: ObjectPool<THREE.Vector2>;
  private readonly matrix4Pool: ObjectPool<THREE.Matrix4>;
  private readonly quaternionPool: ObjectPool<THREE.Quaternion>;
  private readonly colorPool: ObjectPool<THREE.Color>;
  private readonly box3Pool: ObjectPool<THREE.Box3>;

  private constructor() {
    this.vector3Pool = new ObjectPool(() => new THREE.Vector3(), v => v.set(0, 0, 0), 1000, 50000);
    this.vector2Pool = new ObjectPool(() => new THREE.Vector2(), v => v.set(0, 0), 500, 10000);
    this.matrix4Pool = new ObjectPool(() => new THREE.Matrix4(), m => m.identity(), 200, 5000);
    this.quaternionPool = new ObjectPool(() => new THREE.Quaternion(), q => q.set(0, 0, 0, 1), 500, 10000);
    this.colorPool = new ObjectPool(() => new THREE.Color(), c => c.setHex(0), 200, 5000);
    this.box3Pool = new ObjectPool(() => new THREE.Box3(), b => b.makeEmpty(), 200, 5000);
  }

  static getInstance(): MathPool {
    return MathPool.instance ?? (MathPool.instance = new MathPool());
  }

  acquireVector3(): THREE.Vector3 { return this.vector3Pool.acquire(); }
  releaseVector3(v: THREE.Vector3): void { this.vector3Pool.release(v); }
  acquireVector2(): THREE.Vector2 { return this.vector2Pool.acquire(); }
  releaseVector2(v: THREE.Vector2): void { this.vector2Pool.release(v); }
  acquireMatrix4(): THREE.Matrix4 { return this.matrix4Pool.acquire(); }
  releaseMatrix4(m: THREE.Matrix4): void { this.matrix4Pool.release(m); }
  acquireQuaternion(): THREE.Quaternion { return this.quaternionPool.acquire(); }
  releaseQuaternion(q: THREE.Quaternion): void { this.quaternionPool.release(q); }
  acquireColor(): THREE.Color { return this.colorPool.acquire(); }
  releaseColor(c: THREE.Color): void { this.colorPool.release(c); }
  acquireBox3(): THREE.Box3 { return this.box3Pool.acquire(); }
  releaseBox3(b: THREE.Box3): void { this.box3Pool.release(b); }

  clear(): void {
    this.vector3Pool.clear();
    this.vector2Pool.clear();
    this.matrix4Pool.clear();
    this.quaternionPool.clear();
    this.colorPool.clear();
    this.box3Pool.clear();
  }

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

export function withPooledVector3<T>(pool: MathPool, fn: (v: THREE.Vector3) => T): T {
  const v = pool.acquireVector3();
  try { return fn(v); } finally { pool.releaseVector3(v); }
}

export function withPooledVector2<T>(pool: MathPool, fn: (v: THREE.Vector2) => T): T {
  const v = pool.acquireVector2();
  try { return fn(v); } finally { pool.releaseVector2(v); }
}

export function withPooledMatrix4<T>(pool: MathPool, fn: (m: THREE.Matrix4) => T): T {
  const m = pool.acquireMatrix4();
  try { return fn(m); } finally { pool.releaseMatrix4(m); }
}

export function withPooledBox3<T>(pool: MathPool, fn: (b: THREE.Box3) => T): T {
  const b = pool.acquireBox3();
  try { return fn(b); } finally { pool.releaseBox3(b); }
}
