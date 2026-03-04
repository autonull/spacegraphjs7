import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * NoteNode — Sticky-note style editable text node.
 *
 * data options:
 *   color      : CSS background color (default '#fef08a')
 *   text       : note body text
 *   width      : pixel width  (default 200)
 *   height     : pixel height (default 160)
 *   editable   : boolean — whether text is directly editable (default true)
 */
export declare class NoteNode extends Node {
    domElement: HTMLElement;
    cssObject: CSS3DObject;
    private backing;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    updateSpec(updates: Partial<NodeSpec>): void;
    /** Programmatically read the current note body text (may have been edited inline). */
    getText(): string;
    dispose(): void;
}
