import * as THREE from 'three';
import { Node } from './Node';

/**
 * A node that draws into an object of its own. The object carries the node's transform and
 * whatever the node puts into it.
 */
export abstract class Object3DNode extends Node {
  protected _object: THREE.Object3D = new THREE.Object3D();

  get object(): THREE.Object3D {
    return this._object;
  }
}
