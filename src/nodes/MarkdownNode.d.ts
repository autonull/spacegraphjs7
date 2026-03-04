import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * MarkdownNode — Renders Markdown text as HTML within a CSS3D panel.
 *
 * data options:
 *   markdown : markdown string to render
 *   width    : pixel width (default 300)
 *   color    : background colour (default '#1e293b')
 *   textColor: CSS text colour (default '#f1f5f9')
 */
export declare class MarkdownNode extends Node {
    domElement: HTMLDivElement;
    cssObject: CSS3DObject;
    private backing;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
