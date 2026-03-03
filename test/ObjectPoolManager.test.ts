import { describe, it, expect, vi } from 'vitest';
import { ObjectPoolManager } from '../src/core/ObjectPoolManager';

describe('ObjectPoolManager', () => {
    it('should initialize a new pool', () => {
        const pool = new ObjectPoolManager<{ id: number }>();
        pool.registerPool('test-pool');
        expect(pool.get('test-pool')).toBeNull();
    });

    it('should store and retrieve objects', () => {
        const pool = new ObjectPoolManager<{ id: number }>();
        const obj1 = { id: 1 };
        const obj2 = { id: 2 };

        pool.release('test-pool', obj1);
        pool.release('test-pool', obj2);

        // Uses LIFO strategy, last added should be retrieved first
        expect(pool.get('test-pool')).toBe(obj2);
        expect(pool.get('test-pool')).toBe(obj1);
        expect(pool.get('test-pool')).toBeNull();
    });

    it('should clear objects and call disposeFn', () => {
        const pool = new ObjectPoolManager<{ id: number, disposed: boolean }>();
        const obj1 = { id: 1, disposed: false };
        const obj2 = { id: 2, disposed: false };

        pool.release('pool-A', obj1);
        pool.release('pool-B', obj2);

        const disposeSpy = vi.fn((obj: { id: number, disposed: boolean }) => {
            obj.disposed = true;
        });

        pool.clear(disposeSpy);

        expect(disposeSpy).toHaveBeenCalledTimes(2);
        expect(obj1.disposed).toBe(true);
        expect(obj2.disposed).toBe(true);

        expect(pool.get('pool-A')).toBeNull();
        expect(pool.get('pool-B')).toBeNull();
    });
});
