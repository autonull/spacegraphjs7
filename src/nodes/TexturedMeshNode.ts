import { DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Texture } from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { Node } from './Node';

/**
 * TexturedMeshNode — Abstract base for nodes that render a texture on a plane.
 * Subclasses provide the texture source (URL, canvas, video, etc.).
 */
export abstract class TexturedMeshNode extends Node {
  protected readonly _object: Group;
  protected texture: Texture | null = null;
  protected plane: Mesh;
  protected planeGeometry: PlaneGeometry;
  protected planeMaterial: MeshBasicMaterial;

  protected constructor(sg: SpaceGraph | undefined, spec: NodeSpec, width: number, height: number) {
    super(sg, spec);

    this._object = new Group();
    this.planeGeometry = new PlaneGeometry(width, height);
    this.planeMaterial = new MeshBasicMaterial({
      transparent: true,
      side: DoubleSide,
    });
    this.plane = new Mesh(this.planeGeometry, this.planeMaterial);
    this._object.add(this.plane);
    this.updatePosition(this.position.x, this.position.y, this.position.z);
  }

  get object(): Object3D {
    return this._object;
  }

  protected setTexture(texture: Texture): void {
    this.texture?.dispose();
    this.texture = texture;
    this.planeMaterial.map = texture;
    this.planeMaterial.needsUpdate = true;
  }
}
