// @vitest-environment node
import { BoxGeometry, Color, DynamicDrawUsage, Matrix4, MeshBasicMaterial, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import {
    createInstancedMesh,
    disposeInstancedMesh,
    growInstancedMesh,
} from '../src/rendering/InstancedMeshLifecycle';

const allocate = (capacity: number, scene: Scene) => {
    const mesh = createInstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial(), capacity);
    scene.add(mesh);
    return mesh;
};

describe('instanced mesh lifecycle', () => {
    it('allocates dynamic matrix and color buffers', () => {
        const mesh = allocate(4, new Scene());

        expect(mesh.count).toBe(0);
        expect(mesh.frustumCulled).toBe(false);
        expect(mesh.instanceMatrix.usage).toBe(DynamicDrawUsage);
        expect(mesh.instanceColor?.count).toBe(4);
        expect(mesh.instanceColor?.usage).toBe(DynamicDrawUsage);
    });

    it('carries live instances over when growing and replaces the scene mesh', () => {
        const scene = new Scene();
        const oldMesh = allocate(2, scene);
        const matrix = new Matrix4().makeTranslation(1, 2, 3);
        const red = new Color(0xff0000);
        oldMesh.count = 1;
        oldMesh.setMatrixAt(0, matrix);
        oldMesh.setColorAt(0, red);

        const newMesh = growInstancedMesh(
            oldMesh,
            new BoxGeometry(1, 1, 1),
            new MeshBasicMaterial(),
            4,
            scene,
        );

        expect(newMesh.count).toBe(1);
        expect(newMesh.instanceMatrix.version).toBeGreaterThan(0);
        expect(newMesh.instanceColor?.version).toBeGreaterThan(0);
        const carriedMatrix = new Matrix4();
        newMesh.getMatrixAt(0, carriedMatrix);
        expect(carriedMatrix.equals(matrix)).toBe(true);
        const carriedColor = new Color();
        newMesh.getColorAt(0, carriedColor);
        expect(carriedColor.equals(red)).toBe(true);
        expect(scene.children).toContain(newMesh);
        expect(scene.children).not.toContain(oldMesh);
    });

    it('creates and attaches a mesh when there is nothing to grow', () => {
        const scene = new Scene();
        const mesh = growInstancedMesh(
            undefined,
            new BoxGeometry(1, 1, 1),
            new MeshBasicMaterial(),
            8,
            scene,
        );

        expect(mesh.count).toBe(0);
        expect(scene.children).toEqual([mesh]);
    });

    it('detaches a mesh on disposal', () => {
        const scene = new Scene();
        const mesh = allocate(2, scene);

        disposeInstancedMesh(mesh, scene);

        expect(scene.children).not.toContain(mesh);
    });
});
