// SpaceGraphJS v7.0 - ImageNode
// Image texture node implementation

import * as THREE from 'three';
import { Node } from '../../graph/Node';
import type { NodeSpec, ImageNodeData } from '../../graph/types';

export class ImageNode extends Node {
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshBasicMaterial;
  private texture?: THREE.Texture;
  private size: { width: number; height: number };

  constructor(spec: NodeSpec<ImageNodeData>) {
    super(spec);

    const data = spec.data ?? {};
    const width = data.width ?? 200;
    const height = data.height ?? 150;
    this.size = { width, height };

    // Create plane geometry
    this.geometry = new THREE.PlaneGeometry(width, height);

    // Create material with texture
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: data.opacity ?? 1,
      side: THREE.DoubleSide
    });

    // Load texture if URL provided
    if (data.url) {
      this.loadTexture(data.url);
    }

    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(this.position);
    this.object.add(this.mesh);
  }

  override get object(): THREE.Object3D {
    return this.mesh;
  }

  private async loadTexture(url: string): Promise<void> {
    try {
      const loader = new THREE.TextureLoader();
      this.texture = await loader.loadAsync(url);
      this.material.map = this.texture;
      this.material.needsUpdate = true;
    } catch (error) {
      console.error(`[ImageNode] Failed to load texture: ${url}`, error);
    }
  }

  update(spec: Partial<NodeSpec<ImageNodeData>>): void {
    super.update(spec);

    if (spec.data) {
      const data = spec.data;

      if (data.url !== undefined && data.url !== (this.data as ImageNodeData).url) {
        this.loadTexture(data.url);
      }

      if (data.opacity !== undefined) {
        this.material.opacity = data.opacity;
        this.material.transparent = data.opacity < 1;
      }

      if (data.width !== undefined || data.height !== undefined) {
        const width = data.width ?? this.size.width;
        const height = data.height ?? this.size.height;
        this.size = { width, height };
        this.geometry.dispose();
        this.geometry = new THREE.PlaneGeometry(width, height);
        this.mesh.geometry = this.geometry;
      }
    }
  }

  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
    super.dispose();
  }
}
