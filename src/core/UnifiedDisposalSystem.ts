import * as THREE from 'three';

export class UnifiedDisposalSystem {
    private resources: Set<THREE.Material | THREE.BufferGeometry | THREE.Texture> = new Set();

    register(resource: THREE.Material | THREE.BufferGeometry | THREE.Texture): void {
        if (resource) {
            this.resources.add(resource);
        }
    }

    disposeNode(object: THREE.Object3D): void {
        object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.geometry) {
                    this.disposeResource(mesh.geometry);
                }
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach((m) => this.disposeResource(m));
                    } else {
                        this.disposeResource(mesh.material);
                    }
                }
            }
            if ((child as THREE.Sprite).isSprite) {
                const sprite = child as THREE.Sprite;
                if (sprite.material) {
                    if (sprite.material.map) {
                        this.disposeResource(sprite.material.map);
                    }
                    this.disposeResource(sprite.material);
                }
            }
        });
        if (object.parent) {
            object.parent.remove(object);
        }
    }

    disposeResource(resource: THREE.Material | THREE.BufferGeometry | THREE.Texture): void {
        if (!resource) return;

        resource.dispose();
        this.resources.delete(resource);

        // Handle texture maps specifically for materials
        if ((resource as any).isMaterial) {
            const mat = resource as any;
            if (mat.map) this.disposeResource(mat.map);
            if (mat.lightMap) this.disposeResource(mat.lightMap);
            if (mat.bumpMap) this.disposeResource(mat.bumpMap);
            if (mat.normalMap) this.disposeResource(mat.normalMap);
            if (mat.specularMap) this.disposeResource(mat.specularMap);
            if (mat.envMap) this.disposeResource(mat.envMap);
            if (mat.alphaMap) this.disposeResource(mat.alphaMap);
            if (mat.aoMap) this.disposeResource(mat.aoMap);
            if (mat.displacementMap) this.disposeResource(mat.displacementMap);
        }
    }

    disposeAll(): void {
        this.resources.forEach((resource) => {
            resource.dispose();
        });
        this.resources.clear();
    }
}
