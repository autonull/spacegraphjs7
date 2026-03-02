import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

const geometryPool: THREE.SphereGeometry[] = [];

function getGeometry(): THREE.SphereGeometry {
  if (geometryPool.length > 0) {
    return geometryPool.pop()!;
  }
  return new THREE.SphereGeometry(20, 32, 32);
}

function releaseGeometry(geo: THREE.SphereGeometry) {
  geometryPool.push(geo);
}

export class ShapeNode extends Node {
  private meshGeometry: THREE.SphereGeometry;
  private meshMaterial: THREE.MeshBasicMaterial;

  constructor(sg: SpaceGraph, spec: NodeSpec) {
    super(sg, spec);

    const color = spec.data?.color || 0x3366ff;
    this.meshGeometry = getGeometry();
    this.meshMaterial = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);

    this.object.add(mesh);

    if (spec.label) {
      const label = this.createLabel(spec.label);
      label.position.y = -30;
      this.object.add(label);
    }

    this.updatePosition(this.position.x, this.position.y, this.position.z);
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
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(60, 15, 1);

    return sprite;
  }

  dispose(): void {
    if (this.meshGeometry) {
      releaseGeometry(this.meshGeometry);
    }
    if (this.meshMaterial) {
      this.meshMaterial.dispose();
    }
    super.dispose();
  }
}
