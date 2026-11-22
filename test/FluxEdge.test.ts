import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FluxEdge } from '../src/edges/FluxEdge';
import type { Node } from '../src/nodes/Node';

const node = (x: number, y: number, z = 0): Node =>
    ({ id: `n-${x}`, position: new THREE.Vector3(x, y, z), getWorldPosition: (v: THREE.Vector3) => v.set(x, y, z) }) as unknown as Node;

const corridor = (y: number) => [
    { x: 0, y, z: 0 },
    { x: 50, y, z: 0 },
    { x: 100, y, z: 0 },
];

const midY = (edge: FluxEdge): number => {
    const positions = edge.mesh.geometry.attributes.position as THREE.BufferAttribute;
    return (positions.getY(12) + positions.getY(13)) / 2;
};

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

    it('routes a tapered ribbon through a declared corridor', () => {
        const edge = new FluxEdge(
            undefined,
            {
                id: 'e', source: 'a', target: 'b', type: 'FluxEdge',
                data: { curve: 0, path: [[50, 200, 0]] },
            },
            node(0, 0), node(100, 0),
        );
        edge.update();
        const positions = edge.mesh.geometry.attributes.position as THREE.BufferAttribute;
        const mid = 6;
        const midY = (positions.getY(mid * 2) + positions.getY(mid * 2 + 1)) / 2;
        expect(midY).toBeGreaterThan(100);
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        edge.dispose();
    });

    it('falls back to the direct bow for an empty path', () => {
        const edge = new FluxEdge(
            undefined,
            { id: 'e', source: 'a', target: 'b', type: 'FluxEdge', data: { curve: 0, path: [] } },
            node(0, 0), node(100, 0),
        );
        edge.update();
        expect(midY(edge)).toBeCloseTo(0, 1);
        edge.dispose();
    });

    it('routes the object waypoints emitted by bundleCorridor with fixed topology and tint', () => {
        const edge = new FluxEdge(
            undefined,
            {
                id: 'e', source: 'a', target: 'b', type: 'FluxEdge',
                data: { curve: 0, color: 0x8ff0d0, ribbon: { path: corridor(240) } },
            },
            node(0, 0), node(100, 0),
        );
        edge.update();
        expect(midY(edge)).toBeGreaterThan(200);
        const positions = edge.mesh.geometry.attributes.position as THREE.BufferAttribute;
        expect(positions.count).toBe(26);
        expect(edge.mesh.geometry.index!.count).toBe(72);
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        expect((edge.mesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x8ff0d0);
        edge.dispose();
    });

    it('places the arrowhead along the corridor without a color attribute on the arrow', () => {
        const edge = new FluxEdge(
            undefined,
            {
                id: 'e', source: 'a', target: 'b', type: 'FluxEdge',
                data: { curve: 0, ribbon: { path: corridor(240) }, arrowhead: 'target' },
            },
            node(0, 0), node(100, 0),
        );
        edge.update();
        expect(edge.arrow.visible).toBe(true);
        expect(edge.arrow.position.y).toBeGreaterThan(50);
        expect(edge.arrow.position.x).toBeGreaterThan(80);
        expect(edge.arrow.geometry.getAttribute('color')).toBeUndefined();
        expect(edge.mesh.geometry.getAttribute('color')?.itemSize).toBe(4);
        edge.dispose();
    });

    it('reroutes when the declared corridor is replaced and ignores malformed waypoints', () => {
        const edge = new FluxEdge(
            undefined,
            {
                id: 'e', source: 'a', target: 'b', type: 'FluxEdge',
                data: { curve: 0, ribbon: { path: corridor(240) } },
            },
            node(0, 0), node(100, 0),
        );
        edge.update();
        const routed = midY(edge);
        edge.updateSpec({ data: { ribbon: { path: corridor(320) } } });
        edge.update();
        expect(midY(edge)).toBeGreaterThan(routed + 40);
        edge.updateSpec({ data: { ribbon: { path: ['bad', [1], [Infinity, 2], { x: NaN, y: 5 }] } } });
        edge.update();
        expect(midY(edge)).toBeCloseTo(0, 1);
        edge.dispose();
    });
});
