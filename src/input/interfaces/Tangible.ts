import type * as THREE from 'three';
import type { Node } from '../../nodes/Node';

export interface PickResult {
  node: Node | null;
  point: THREE.Vector3;
  distance: number;
}
