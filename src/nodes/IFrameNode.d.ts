import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * IFrameNode — Embeds a web page inside a CSS3D iframe.
 *
 * Important: Cross-origin pages will be blocked by browsers unless they allow
 * embedding via X-Frame-Options / CSP. Best used with same-origin content or
 * sandboxed local pages.
 *
 * data options:
 *   src    : URL to embed (required)
 *   width  : pixel width  (default 480)
 *   height : pixel height (default 320)
 *   allow  : iframe allow attribute (default '')
 */
export declare class IFrameNode extends Node {
    iframeEl: HTMLIFrameElement;
    cssObject: CSS3DObject;
    private backing;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    /** Load a new URL. */
    navigate(url: string): void;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
