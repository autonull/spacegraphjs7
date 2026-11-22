import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FluxEdge } from '../src/edges/FluxEdge';
import type { Node } from '../src/nodes/Node';

const node = (x: number, y: number): Node =>
    ({ id: `n-${x}`, position: new THREE.Vector3(x, y, 0), getWorldPosition: (v: THREE.Vector3) => v.set(x, y, 0) }) as unknown as Node;

describe('FluxEdge', () => {
    it('builds a curved tapered filament with endpoints inset', () => {
        const edge = new FluxEdge(undefined, { id: 'e', source: 'a', target: 'b', type: 'FluxEdge', data: { weight: 0.8, minRadius: 4, maxRadius: 30, color: 0x00ffcc, inset: 0.12, halo: 0.6 } }, node(0, 0), node(100, 0));
        edge.update();
        const positions = (edge.mesh.geometry.attributes.position as THREE.BufferAttribute).array;
        const colors = (edge.mesh.geometry.attributes.color as THREE.BufferAttribute).array;
        const first = positions.slice(0, 3);
        const last = positions.slice(-3);
        expect(first[0]).toBeGreaterThan(0);
        expect(last[0]).toBeLessThan(100);
        expect(Array.from(positions).every(Number.isFinite)).toBe(true);
        expect(colors[3]).toBeGreaterThan(0);
        edge.dispose();
    });
});
