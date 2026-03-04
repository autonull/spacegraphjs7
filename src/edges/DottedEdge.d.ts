import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';
/**
 * DottedEdge — Dashed / dotted line edge using a custom dash pattern.
 *
 * data options:
 *   color      : hex color (default 0x888888)
 *   dashSize   : world-space dash length  (default 8)
 *   gapSize    : world-space gap length   (default 6)
 *   linewidth  : (browser-limited, usually 1) (default 2)
 */
export declare class DottedEdge {
    id: string;
    sg: SpaceGraph;
    source: Node;
    target: Node;
    data: any;
    object: THREE.Line;
    geometry: THREE.BufferGeometry;
    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node);
    updateSpec(updates: Partial<EdgeSpec>): void;
    update(): void;
    dispose(): void;
}
