// Core types - shared fundamental types

import type { Vector3, Raycaster } from 'three';
import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type {
  CardFacing,
  DepthMode,
  FitInsets,
  FitOptions,
  RenderEdge,
  RenderModel,
  RenderNode,
  RenderTheme,
} from '@spacegraphjs/renderer';

export type { CardFacing, DepthMode, FitInsets, FitOptions, RenderEdge, RenderModel, RenderNode, RenderTheme };
export type { Edge, Node, SpaceGraph };

// Orthographic is the legibility baseline for 2D hosts; perspective stays the 3D experiment.
export type Projection = 'perspective' | 'orthographic';

// Continuous drives every animation frame; on-demand paints on mutations, camera moves, and resize.
export type RenderMode = 'continuous' | 'on-demand';

// Normalized (0..1) camera report: 1 is closest. `band` is host policy, never set by the core.
export interface CameraViewport {
  zoom: number;
  center: [number, number, number];
  distance: number;
  /** Visible world extent in the camera's XY plane, for host minimaps. */
  extent?: { width: number; height: number };
  band?: string;
}

export interface HitResult {
  type: 'node' | 'edge' | 'none';
  distance?: number;
  node?: Node;
  edge?: Edge;
  point?: { x: number; y: number; z: number };
}

export interface Bounds3D {
  min: Vector3;
  max: Vector3;
  center: Vector3;
  size: Vector3;

  containsPoint(point: Vector3): boolean;

  intersectsRay(ray: Raycaster): boolean;
}