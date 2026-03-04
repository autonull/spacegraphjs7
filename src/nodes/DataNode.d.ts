import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * DataNode — Displays a key-value table or arbitrary JSON/object.
 *
 * data options:
 *   fields    : Record<string, any> — key-value pairs to display
 *   maxFields : max rows before truncating (default 8)
 *   width     : pixel width  (default 220)
 *   color     : header background CSS color (default '#0f172a')
 */
export declare class DataNode extends Node {
    domElement: HTMLElement;
    cssObject: CSS3DObject;
    private backing;
    private readonly w;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    private _buildDOM;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
