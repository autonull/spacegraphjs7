import * as THREE from 'three';
export declare class UnifiedDisposalSystem {
    private resources;
    register(resource: THREE.Material | THREE.BufferGeometry | THREE.Texture): void;
    disposeNode(object: THREE.Object3D): void;
    disposeResource(resource: THREE.Material | THREE.BufferGeometry | THREE.Texture): void;
    disposeAll(): void;
}
