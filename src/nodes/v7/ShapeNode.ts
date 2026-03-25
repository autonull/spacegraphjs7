// SpaceGraphJS v7.0 - ShapeNode
// Basic geometric shape node implementation

import * as THREE from 'three';
import { Node } from '../../graph/Node';
import type { NodeSpec, ShapeNodeData } from '../../graph/types';

type ShapeType = 'sphere' | 'box' | 'circle' | 'plane' | 'cone' | 'cylinder' | 'torus' | 'ring';

export class ShapeNode extends Node {
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshBasicMaterial;
  private labelSprite?: THREE.Sprite;
  private shapeType: ShapeType;
  private nodeSize: number;

  constructor(spec: NodeSpec<ShapeNodeData>) {
    super(spec);

    const data = spec.data ?? {};
    this.shapeType = data.shape ?? 'sphere';
    this.nodeSize = data.size ?? 40;
    const color = data.color ?? 0x3366ff;

    // Create mesh
    this.geometry = this.createGeometry(this.shapeType, this.nodeSize);
    this.material = new THREE.MeshBasicMaterial({ 
      color,
      transparent: data.opacity !== undefined && data.opacity < 1,
      opacity: data.opacity ?? 1
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    // Sync object position
    this.mesh.position.copy(this.position);
    this.object.add(this.mesh);

    // Add label if specified
    if (spec.label) {
      this.labelSprite = this.createLabel(spec.label);
      this.labelSprite.position.y = -this.nodeSize * 0.8;
      this.object.add(this.labelSprite);
    }
  }

  override get object(): THREE.Object3D {
    return this.mesh;
  }

  private createGeometry(shape: ShapeType, size: number): THREE.BufferGeometry {
    switch (shape) {
      case 'box':
        return new THREE.BoxGeometry(size, size, size);
      case 'circle':
      case 'plane':
        return new THREE.CircleGeometry(size / 2, 32);
      case 'cone':
        return new THREE.ConeGeometry(size / 2, size, 32);
      case 'cylinder':
        return new THREE.CylinderGeometry(size / 2, size / 2, size, 32);
      case 'torus':
        return new THREE.TorusGeometry(size / 3, size / 8, 16, 48);
      case 'ring':
        return new THREE.RingGeometry(size / 4, size / 2, 32);
      case 'sphere':
      default:
        return new THREE.SphereGeometry(size / 2, 32, 32);
    }
  }

  update(spec: Partial<NodeSpec<ShapeNodeData>>): void {
    super.update(spec);

    if (spec.data) {
      const data = spec.data;

      if (data.color !== undefined && typeof data.color === 'number') {
        this.material.color.setHex(data.color);
      }

      if (data.opacity !== undefined) {
        this.material.transparent = data.opacity < 1;
        this.material.opacity = data.opacity;
      }

      if (data.shape && data.shape !== this.shapeType) {
        this.shapeType = data.shape;
        this.geometry.dispose();
        this.geometry = this.createGeometry(this.shapeType, this.nodeSize);
        this.mesh.geometry = this.geometry;
      }

      if (data.size && data.size !== this.nodeSize) {
        this.nodeSize = data.size;
        this.geometry.dispose();
        this.geometry = this.createGeometry(this.shapeType, this.nodeSize);
        this.mesh.geometry = this.geometry;
        
        if (this.labelSprite) {
          this.labelSprite.position.y = -this.nodeSize * 0.8;
        }
      }
    }

    if (spec.label !== undefined) {
      // Remove old label
      if (this.labelSprite) {
        this.labelSprite.material.map?.dispose();
        this.labelSprite.material.dispose();
        this.object.remove(this.labelSprite);
        this.labelSprite = undefined;
      }

      // Add new label
      if (spec.label) {
        this.labelSprite = this.createLabel(spec.label);
        this.labelSprite.position.y = -this.nodeSize * 0.8;
        this.object.add(this.labelSprite);
      }
    }
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 64;

    if (context) {
      context.font = '24px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      depthTest: false 
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(this.nodeSize * 1.5, this.nodeSize * 0.4, 1);

    return sprite;
  }

  getBoundingSphereRadius(): number {
    return this.nodeSize / 2;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    
    if (this.labelSprite) {
      this.labelSprite.material.map?.dispose();
      this.labelSprite.material.dispose();
    }
    
    super.dispose();
  }
}
