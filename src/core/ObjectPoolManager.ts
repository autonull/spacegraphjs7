export class ObjectPoolManager<T> {
  private pool: Map<string, T[]> = new Map();

  // Create a new pool for a specific type or signature
  public registerPool(poolKey: string): void {
      if (!this.pool.has(poolKey)) {
          this.pool.set(poolKey, []);
      }
  }

  // Get an object from the pool, or null if the pool is empty
  public get(poolKey: string): T | null {
      const objects = this.pool.get(poolKey);
      if (objects && objects.length > 0) {
          return objects.pop()!;
      }
      return null;
  }

  // Release an object back into the pool
  public release(poolKey: string, obj: T): void {
      let objects = this.pool.get(poolKey);
      if (!objects) {
          objects = [];
          this.pool.set(poolKey, objects);
      }
      objects.push(obj);
  }

  // Clear all objects in the pool, optionally calling a dispose function on each
  public clear(disposeFn?: (obj: T) => void): void {
      if (disposeFn) {
          this.pool.forEach(objects => {
              objects.forEach(obj => disposeFn(obj));
          });
      }
      this.pool.clear();
  }
}
