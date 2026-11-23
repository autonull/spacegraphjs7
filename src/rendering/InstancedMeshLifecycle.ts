import {
    Color,
    DynamicDrawUsage,
    InstancedBufferAttribute,
    InstancedMesh,
    Matrix4,
    type BufferGeometry,
    type Material,
    type Scene,
} from 'three';

/** Allocate an instanced mesh with dynamic matrix and color uploads. */
export function createInstancedMesh(
    geometry: BufferGeometry,
    material: Material,
    capacity: number,
): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    if (!mesh.instanceColor)
        mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(DynamicDrawUsage);
    return mesh;
}

/** Replace an instanced mesh with a larger one, carrying over every live instance. */
export function growInstancedMesh(
    previous: InstancedMesh | undefined,
    geometry: BufferGeometry,
    material: Material,
    capacity: number,
    scene: Scene,
): InstancedMesh {
    const mesh = createInstancedMesh(geometry, material, capacity);
    if (!previous) {
        scene.add(mesh);
        return mesh;
    }

    mesh.count = previous.count;
    const matrix = new Matrix4();
    const color = new Color();

    for (let i = 0; i < previous.count; i++) {
        previous.getMatrixAt(i, matrix);
        mesh.setMatrixAt(i, matrix);
        if (previous.instanceColor) {
            previous.getColorAt(i, color);
            mesh.setColorAt(i, color);
        }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    disposeInstancedMesh(previous, scene);
    scene.add(mesh);
    return mesh;
}

/** Release the GPU resources of a mesh and detach it from its scene. */
export function disposeInstancedMesh(mesh: InstancedMesh, scene: Scene): void {
    scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as Material).dispose();
    mesh.dispose();
}
