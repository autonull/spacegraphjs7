// Event types - all event payloads and event maps

import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { CameraViewport, Projection, DepthMode } from './core';

export type GraphEvent =
  | 'node:added'
  | 'node:removed'
  | 'node:updated'
  | 'edge:added'
  | 'edge:removed'
  | 'edge:updated';
export type NodeEvent = 'node:updated' | 'node:destroying';
export type EdgeEvent = 'edge:updated' | 'edge:destroying';

/**
 * The payload of a `selection:changed` event. The ids are the selection; the node and edge sets
 * split it, so a consumer can count either without walking the ids.
 */
export interface SelectionChangedPayload {
  /** Every selected id, nodes and edges together. */
  ids: string[];
  /** The ids of the selected nodes. */
  nodes: Set<string>;
  /** The ids of the selected edges. */
  edges: Set<string>;
  timestamp: number;
}

export interface SpaceGraphEvents {
  'node:added': { node: Node; timestamp: number };
  'node:removed': { id: string; timestamp: number };
  'node:updated': { node: Node; changes: Partial<import('./spec').NodeSpec>; timestamp: number };
  'edge:added': { edge: Edge; timestamp: number };
  'edge:removed': { id: string; timestamp: number };
  'edge:updated': { edge: Edge; changes: Partial<import('./spec').EdgeSpec>; timestamp: number };
  'graph:cleared': { timestamp: number };
  'selection:changed': SelectionChangedPayload;
  'node:selection-changed': { id: string; selected: boolean };
  'node:click': { id: string; originalEvent?: MouseEvent } | { node: Node };
  'edge:click': { id: string; originalEvent?: MouseEvent };
  'background:click': { originalEvent?: MouseEvent };
  'node:dblclick': { node: Node };
  'camera:change': CameraViewport;
  'zoom:change': { zoom: number; previous: number };
  'zoomband:change': { band: string; normalized: number; zoom: number; label?: string; timestamp: number };
  'projection:change': { projection: Projection };
  'depth:change': { depth: DepthMode; previous: DepthMode };
  // Additional events used by plugins and core
  'ready': { timestamp: number };
  'input:camera:wheel': { originalEvent: WheelEvent; deltaY: number; timestamp: number };
  'camera:move': { position: [number, number, number]; target: [number, number, number]; timestamp: number };
  'interaction:selection': { nodes: string[]; edges: string[]; timestamp: number };
  'interaction:edgecreate': { source: string; target: string; timestamp: number };
  'graph:click': { originalEvent?: MouseEvent; timestamp: number };
  'edge:dblclick': { edge: Edge; originalEvent?: MouseEvent; timestamp: number };
  'node:contextmenu': { node: Node; event: MouseEvent; timestamp: number };
  'edge:contextmenu': { edge: Edge; event: MouseEvent; timestamp: number };
  'graph:contextmenu': { event: MouseEvent; timestamp: number };
  'node:pointerenter': { node: Node; event: MouseEvent; timestamp: number };
  'node:pointerleave': { node: Node; event: MouseEvent; timestamp: number };
  'edge:pointerenter': { edge: Edge; event: MouseEvent; timestamp: number };
  'edge:pointerleave': { edge: Edge; event: MouseEvent; timestamp: number };
  // Allow arbitrary string events for extensibility
  [key: string]: any;
}