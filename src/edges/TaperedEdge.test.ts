import { beforeAll, describe, expect, test } from 'vitest';
import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { EdgeSpec } from '../types';
import { TaperedEdge } from './TaperedEdge';

beforeAll(() => {
    // The base Edge constructor reads window dimensions for LineMaterial resolution; the bare test environment has no DOM.
    Object.assign(globalThis, { window: { innerWidth: 800, innerHeight: 600 } });
});

function nodeAt(position: [number, number, number]): Node {
    const pos = new THREE.Vector3(...position);
    return {
        position: pos,
        getWorldPosition: (target: THREE.Vector3) => target.copy(pos),
    } as unknown as Node;
}

function makeEdge(
    source: [number, number, number],
    target: [number, number, number],
    data: Record<string, unknown> = {},
): TaperedEdge {
    const spec: EdgeSpec = {
        id: 'taper',
        source: 'a',
        target: 'b',
        type: 'TaperedEdge',
        data,
    };
    return new TaperedEdge(undefined, spec, nodeAt(source), nodeAt(target));
}

describe('TaperedEdge', () => {
    test('registers under its own type name', () => {
        expect(TaperedEdge.typeName).toBe('TaperedEdge');
    });

    test('builds a four-vertex trapezoid from two triangles', () => {
        const edge = makeEdge([0, 0, 0], [0, 10, 0], { weight: 0.5 });
        expect(edge.mesh).toBeInstanceOf(THREE.Mesh);
        expect(edge.mesh.geometry.getAttribute('position').count).toBe(4);
        expect(edge.mesh.geometry.getIndex()?.count).toBe(6);
    });

    test('tapers from a broad source end to a narrow target end', () => {
        const edge = makeEdge([0, 0, 0], [0, 10, 0]);
        const position = edge.mesh.geometry.getAttribute('position');
        const sourceWidth = Math.abs(position.getX(0) - position.getX(1));
        const targetWidth = Math.abs(position.getX(2) - position.getX(3));
        expect(position.getY(0)).toBeLessThan(position.getY(2));
        expect(sourceWidth).toBeGreaterThan(targetWidth);
    });

    test('update points the broad end at the source and narrow end at the target', () => {
        const edge = makeEdge([0, 0, 0], [10, 0, 0], {
            weight: 1,
            minRadius: 2,
            maxRadius: 6,
        });
        edge.update();
        expect(edge.mesh.position.x).toBeCloseTo(5);
        expect(edge.mesh.rotation.z).toBeCloseTo(-Math.PI / 2);
        expect(edge.mesh.scale.x).toBeCloseTo(6);
        expect(edge.mesh.scale.y).toBeCloseTo(10);
    });

    test('updateSpec recolors the polygon', () => {
        const edge = makeEdge([0, 0, 0], [0, 10, 0]);
        edge.updateSpec({ data: { color: 0xff0000 } });
        expect((edge.mesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xff0000);
    });
});
