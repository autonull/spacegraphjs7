import * as THREE from 'three';
import { DEG2RAD } from '../core/constants';
import type { Point2D } from '../types';

export type { Point2D };

export interface FitViewResult {
  center: THREE.Vector3;
  cameraZ: number;
  /** Orthographic frustum zoom that fits the bounds; omitted for perspective. */
  zoom?: number;
}

/** A node's placement plus the dimensions it occupies around that placement. */
export interface FitNode {
  position: THREE.Vector3;
  data?: Record<string, unknown>;
}

export function calculateFitView(
  nodes: FitNode[],
  camera: THREE.Camera,
  padding = 100,
  minDistance = 200
): FitViewResult | null {
  if (!nodes || nodes.length === 0) return null;

  const box = new THREE.Box3();
  for (const node of nodes) {
    if (!node?.position) continue;
    box.expandByPoint(node.position);
    const extent = nodeExtent(node);
    if (extent) {
      box.expandByPoint(node.position.clone().add(extent));
      box.expandByPoint(node.position.clone().sub(extent));
    }
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  const size = new THREE.Vector3();
  box.getSize(size);

  const ortho = camera as THREE.OrthographicCamera;
  if (ortho.isOrthographicCamera) {
    // The frame is the base frustum scaled by zoom and looks down -Z, so fit the X/Y bounds.
    const baseHeight = ortho.top - ortho.bottom || 1;
    const baseWidth = ortho.right - ortho.left || baseHeight;
    const zoom = Math.min(
      baseHeight / (size.y + 2 * padding),
      baseWidth / (size.x + 2 * padding)
    );
    return { center, cameraZ: minDistance, zoom };
  }

  const maxDim = Math.max(size.x, size.y, size.z);
  const { fov = 75, aspect = 1 } = camera as Partial<THREE.PerspectiveCamera>;
  const fovRad = fov * DEG2RAD;
  const cameraZ = Math.abs(maxDim / (2 * Math.tan(fovRad / 2) * Math.max(1, aspect)));

  return { center, cameraZ: Math.max(cameraZ + padding, minDistance) };
}

/** Half-extents reported by a node's spec; cards carry width/height, shapes a single size. */
function nodeExtent(node: FitNode): THREE.Vector3 | undefined {
  const data = node.data ?? {};
  const size = typeof data.size === 'number' ? data.size : undefined;
  const width = typeof data.width === 'number' ? data.width : size;
  const height = typeof data.height === 'number' ? data.height : size;
  if (width === undefined && height === undefined) return undefined;
  return new THREE.Vector3((width ?? 0) / 2, (height ?? 0) / 2, (size ?? 0) / 2);
}
