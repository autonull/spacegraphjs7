import * as THREE from 'three';

declare module 'three' {
  interface BufferGeometry {
    computeBoundsTree?: () => void;
    disposeBoundsTree?: () => void;
  }
}

let patched = false;

// Lazily apply the three-mesh-bvh acceleration patch the first time a scene builds a BVH. Importing
// spacegraphjs never mutates Three.js globals and never pulls three-mesh-bvh onto the entry path.
export async function ensureThreeMeshBvh(): Promise<void> {
  if (patched) return;
  const bvh = await import('three-mesh-bvh');
  THREE.BufferGeometry.prototype.computeBoundsTree = bvh.computeBoundsTree as () => void;
  THREE.BufferGeometry.prototype.disposeBoundsTree = bvh.disposeBoundsTree as () => void;
  THREE.Mesh.prototype.raycast = bvh.acceleratedRaycast as typeof THREE.Mesh.prototype.raycast;
  patched = true;
}
