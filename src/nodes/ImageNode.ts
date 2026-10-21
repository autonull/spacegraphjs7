import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { TexturedMeshNode } from './TexturedMeshNode';

export class ImageNode extends TexturedMeshNode {
  static readonly typeName: string = 'ImageNode';

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    const w = (spec.data?.width as number) ?? 100;
    const h = (spec.data?.height as number) ?? 100;
    super(sg, spec, w, h);

    if (spec.data?.url) {
      this.loadTexture(spec.data.url as string);
    }
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);
    if (updates.data?.url) {
      this.loadTexture(updates.data.url as string);
    }
    return this;
  }

  private loadTexture(url: string): void {
    new THREE.TextureLoader().load(url, (texture) => this.setTexture(texture));
  }
}
