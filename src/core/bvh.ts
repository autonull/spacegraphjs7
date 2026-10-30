import { BufferGeometry, Mesh } from 'three';
import type {} from 'three-mesh-bvh';

let patched = false;

// Lazily apply the three-mesh-bvh acceleration patch the first time a scene builds a BVH. Importing
// spacegraphjs never mutates Three.js globals and never pulls three-mesh-bvh onto the entry path.
export async function ensureThreeMeshBvh(): Promise<void> {
  if (patched) return;
  const bvh = await import('three-mesh-bvh');
  BufferGeometry.prototype.computeBoundsTree = bvh.computeBoundsTree;
  BufferGeometry.prototype.disposeBoundsTree = bvh.disposeBoundsTree;
  Mesh.prototype.raycast = bvh.acceleratedRaycast as typeof Mesh.prototype.raycast;
  patched = true;
}
