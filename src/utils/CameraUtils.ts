import * as THREE from 'three';
import { DEG2RAD } from '../core/constants';
import type { Point2D } from '../types';

export type { Point2D };

/**
 * The tangent of a perspective camera's half field of view: the ratio of a world unit's height on
 * screen to its distance from the camera.
 */
export function halfFovTangent(fovDegrees: number): number {
  return Math.tan((fovDegrees * DEG2RAD) / 2);
}

/**
 * The world height a perspective camera sees at a distance: the vertical extent of its frustum.
 */
export function visibleHeightAtDistance(fovDegrees: number, distance: number): number {
  return 2 * distance * halfFovTangent(fovDegrees);
}

/**
 * The distance a camera needs to frame a node: wide enough to show the node's own width, and never
 * tighter than the floor that keeps a card readable.
 */
export function focusRadiusOf(node: { data?: { width?: unknown } }, floor = 150): number {
  const width = node.data?.width;
  return typeof width === 'number' ? Math.max(width * 1.5, floor) : floor;
}

/**
 * Set an orthographic camera's frustum to a world height and an aspect, centred on the origin.
 */
export function setOrthoFrustum(
  camera: THREE.OrthographicCamera,
  height: number,
  aspect: number
): void {
  const width = height * (aspect || 1);
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
}

/**
 * Fit an orthographic camera's frustum to the view a perspective camera has at a distance, so
 * the orthographic frame shows what the perspective frame shows.
 */
export function fitOrthoFrustum(
  camera: THREE.OrthographicCamera,
  fovDegrees: number,
  distance: number,
  aspect: number
): void {
  setOrthoFrustum(camera, visibleHeightAtDistance(fovDegrees, distance), aspect);
}

/**
 * The world width and height a camera sees. The distance is the caller's own: the orbit radius,
 * the distance to the orbit target, the distance to a node — they differ, and the caller knows
 * which one it means. The aspect is the camera's own unless the caller measures a different one.
 */
export function visibleWorldExtent(
  camera: THREE.Camera,
  distance: number,
  aspect?: number
): { width: number; height: number } {
  const ortho = camera as THREE.OrthographicCamera;
  if (ortho.isOrthographicCamera) {
    return {
      width: (ortho.right - ortho.left) / ortho.zoom,
      height: (ortho.top - ortho.bottom) / ortho.zoom,
    };
  }
  const perspective = camera as THREE.PerspectiveCamera;
  const height = visibleHeightAtDistance(perspective.fov, distance);
  return { width: height * (aspect ?? perspective.aspect), height };
}

/**
 * Fly the camera to a node, framing it at the distance that keeps it readable. The camera
 * controls clone the target, so the node's own position is not captured by the flight.
 */
export function focusNodeCamera(
  cameraControls: { flyTo(target: THREE.Vector3, distance: number): void },
  node: { position: THREE.Vector3; data?: { width?: unknown } },
): void {
  cameraControls.flyTo(node.position, focusRadiusOf(node));
}

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

/** The surface the camera frames, in CSS pixels. */
export interface FitSurface {
  width: number;
  height: number;
}

/** Screen-space margins the framed content must stay clear of, in CSS pixels. */
export interface FitInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The part of the surface the content may use once the insets are taken out, in CSS pixels. */
interface UsableRegion {
  width: number;
  height: number;
}

/**
 * The region of the surface the content may use. Without a surface, or without insets, the content
 * may use the whole surface and the region is undefined.
 */
function usableRegion(surface?: FitSurface, insets?: FitInsets): UsableRegion | undefined {
  if (!surface || !insets) return undefined;
  const width = surface.width - insets.left - insets.right;
  const height = surface.height - insets.top - insets.bottom;
  if (width <= 0 || height <= 0) return undefined;
  return { width, height };
}

/**
 * Calculate a view that fits the given nodes. For perspective cameras, optionally provide the
 * camera's polar angle (phi from +Y) to account for tilt foreshortening.
 *
 * `minZoom` is a floor on the orthographic frustum zoom. When the content needs a smaller zoom to
 * fit, the floor applies instead: the frame then shows the content's start corner and the reader
 * pans the rest, rather than reading text too small to make out.
 *
 * `surface` and `insets` frame the content inside the region the insets leave free: the content
 * stays clear of the chrome a host draws over the canvas (an inspector, a header, a bottom sheet).
 * The orthographic path honours them exactly; the perspective path honours them approximately,
 * because a tilted camera has no single screen-to-world scale.
 */
export function calculateFitView(
  nodes: FitNode[],
  camera: THREE.Camera,
  padding = 100,
  minDistance = 200,
  /** Camera polar angle from +Y (radians). When provided for perspective, adjusts distance for tilt. */
  phi?: number,
  /** The smallest frustum zoom the fit may use; the frame then starts at the content's corner. */
  minZoom?: number,
  /** The surface the camera frames, in CSS pixels. */
  surface?: FitSurface,
  /** Screen-space margins the content must stay clear of, in CSS pixels. */
  insets?: FitInsets,
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

  const usable = usableRegion(surface, insets);

  const ortho = camera as THREE.OrthographicCamera;
  if (ortho.isOrthographicCamera) {
    // The frame is the base frustum scaled by zoom and looks down -Z, so fit the X/Y bounds.
    const baseHeight = ortho.top - ortho.bottom || 1;
    const baseWidth = ortho.right - ortho.left || baseHeight;
    const fitZoom = Math.min(
      baseHeight / (size.y + 2 * padding),
      baseWidth / (size.x + 2 * padding),
      // The content and its margin must also fit the region the insets leave free.
      ...(usable && surface
        ? [
            (baseHeight * usable.width) / ((size.x + 2 * padding) * surface.height),
            (baseHeight * usable.height) / ((size.y + 2 * padding) * surface.height),
          ]
        : []),
    );
    const zoom = minZoom === undefined ? fitZoom : Math.max(minZoom, fitZoom);

    // CSS pixels per world unit at the chosen zoom: the frustum covers the surface.
    const pxPerWorld = surface && surface.height > 0 ? (surface.height * zoom) / baseHeight : 0;
    // The usable region's centre, in world units, relative to the surface's centre.
    const offsetX = usable && pxPerWorld > 0 ? (insets!.left - insets!.right) / 2 / pxPerWorld : 0;
    const offsetY = usable && pxPerWorld > 0 ? (insets!.top - insets!.bottom) / 2 / pxPerWorld : 0;

    if (zoom === fitZoom)
      return { center: new THREE.Vector3(center.x - offsetX, center.y + offsetY, center.z), cameraZ: minDistance, zoom };

    // The floor applies: the content no longer fits, so the frame starts at its beginning and the
    // axis that still fits stays centred.
    const visibleWidth = usable && pxPerWorld > 0 ? usable.width / pxPerWorld : baseWidth / zoom;
    const visibleHeight = usable && pxPerWorld > 0 ? usable.height / pxPerWorld : baseHeight / zoom;
    const anchored = new THREE.Vector3(
      size.x + 2 * padding > visibleWidth ? box.min.x - padding - offsetX + visibleWidth / 2 : center.x - offsetX,
      size.y + 2 * padding > visibleHeight ? box.min.y - padding + offsetY + visibleHeight / 2 : center.y + offsetY,
      center.z,
    );

    return { center: anchored, cameraZ: minDistance, zoom };
  }

  const maxDim = Math.max(size.x, size.y, size.z);
  const { fov = 75, aspect = 1 } = camera as Partial<THREE.PerspectiveCamera>;
  const halfHeight = halfFovTangent(fov);
  let cameraZ = Math.abs(maxDim / (2 * halfHeight * Math.max(1, aspect)));

  // For perspective cameras with tilt (phi < PI/2), the view of the XY plane is foreshortened.
  // Move the camera closer by sin(phi) to compensate and frame the same content.
  const tilt = phi !== undefined && phi < Math.PI / 2 ? Math.sin(phi) : 1;
  cameraZ *= tilt;

  // The content must fit the region the insets leave free, so the camera steps back.
  if (usable && surface) cameraZ *= Math.max(surface.width / usable.width, surface.height / usable.height);

  // The frame centres the content in that region. The world size the camera sees at the target
  // plane gives the screen-to-world scale (approximate for a tilted camera).
  if (usable && surface) {
    const visibleHeight = visibleHeightAtDistance(fov, cameraZ);
    const visibleWidth = visibleHeight * aspect;
    const pxPerWorldX = visibleWidth > 0 ? surface.width / visibleWidth : 0;
    const pxPerWorldY = visibleHeight > 0 ? surface.height / (visibleHeight * tilt) : 0;
    if (pxPerWorldX > 0 && pxPerWorldY > 0) {
      center.x -= (insets!.left - insets!.right) / 2 / pxPerWorldX;
      center.y += (insets!.top - insets!.bottom) / 2 / pxPerWorldY;
    }
  }

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
