import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class ImageNode extends Node {
  private meshGeometry: THREE.PlaneGeometry;
  private meshMaterial: THREE.MeshBasicMaterial;

  constructor(sg: SpaceGraph, spec: NodeSpec) {
    super(sg, spec);

    this.meshGeometry = new THREE.PlaneGeometry(100, 100);
    this.meshMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });

    if (spec.data && spec.data.url) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(spec.data.url, (texture) => {
        this.meshMaterial.map = texture;
        this.meshMaterial.needsUpdate = true;
      });
    }

    const mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);

    // Rotate to face camera
    mesh.rotation.y = 0;

    this.object.add(mesh);
    this.updatePosition(this.position.x, this.position.y, this.position.z);
  }

  updateSpec(updates: Partial<NodeSpec>) {
    super.updateSpec(updates);

    if (updates.data && updates.data.url) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(updates.data.url, (texture) => {
            if (this.meshMaterial.map) {
                this.meshMaterial.map.dispose();
            }
            this.meshMaterial.map = texture;
            this.meshMaterial.needsUpdate = true;
        });
    }
  }

  dispose(): void {
    if (this.meshGeometry) {
      this.meshGeometry.dispose();
    }
    if (this.meshMaterial) {
      if (this.meshMaterial.map) {
          this.meshMaterial.map.dispose();
      }
      this.meshMaterial.dispose();
    }
    super.dispose();
  }
}
