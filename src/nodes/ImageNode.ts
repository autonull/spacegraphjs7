import * as THREE from 'three';
import { TexturedMeshNode } from './TexturedMeshNode';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export class ImageNode extends TexturedMeshNode {
    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = (spec.data?.width as number) ?? 100;
        const h = (spec.data?.height as number) ?? 100;
        super(sg, spec, w, h);

        if (spec.data?.url) {
            this.loadTexture(spec.data.url as string);
        }
    }

    private loadTexture(url: string): void {
        new THREE.TextureLoader().load(url, (texture) => this.setTexture(texture));
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.url) {
            this.loadTexture(updates.data.url as string);
        }
        return this;
    }
}
