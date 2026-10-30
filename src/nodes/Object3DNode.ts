import { Object3D } from 'three';
import { Node } from './Node';

/**
 * A node that draws into an object of its own. The object carries the node's transform and
 * whatever the node puts into it.
 */
export abstract class Object3DNode extends Node {
  protected _object: Object3D = new Object3D();

  get object(): Object3D {
    return this._object;
  }
}
