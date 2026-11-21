import { describe, expect, it } from 'vitest';
import { ForceCore } from '../../src/layout';

const plainNodes = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
        id: `node-${i}`,
        position: { x: 0, y: 0, z: 0 },
    }));

describe('ForceCore.initializePositions', () => {
    it('randomizes plain-object positions without requiring a Vector3.set method', () => {
        const core = new ForceCore({ randomize: true, seed: 7, iterations: 0 });
        const nodes = plainNodes(8);

        core.initializePositions(nodes, () => false);

        for (const node of nodes) {
            expect(Number.isFinite(node.position.x)).toBe(true);
            expect(Number.isFinite(node.position.y)).toBe(true);
            expect(Number.isFinite(node.position.z)).toBe(true);
            expect(node.position).not.toEqual({ x: 0, y: 0, z: 0 });
        }
    });

    it('randomizes deterministically for a fixed seed and preserves previous positions', () => {
        const seed = 7;
        const first = plainNodes(8);
        const second = plainNodes(8);
        new ForceCore({ randomize: true, seed, iterations: 0 }).initializePositions(
            first,
            () => false,
        );
        new ForceCore({ randomize: true, seed, iterations: 0 }).initializePositions(
            second,
            () => false,
        );
        expect(first).toEqual(second);

        const previous = new Map([['node-0', { x: 11, y: 22, z: 33 }]]);
        const restored = plainNodes(2);
        new ForceCore({ randomize: true, seed, iterations: 0 }).initializePositions(
            restored,
            () => false,
            previous,
        );
        expect(restored[0]!.position).toEqual({ x: 11, y: 22, z: 33 });
    });
});
