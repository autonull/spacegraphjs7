import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
export declare class HtmlNode extends Node {
    domElement: HTMLElement;
    cssObject: CSS3DObject;
    private meshGeometry;
    private meshMaterial;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
