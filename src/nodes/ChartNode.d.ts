import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * ChartNode — Canvas-based chart node.  Renders via Chart.js if available,
 * otherwise falls back to a built-in mini bar/line renderer so the node is
 * always useful without an optional dependency.
 *
 * data options:
 *   chartType : 'bar' | 'line' | 'pie' (default 'bar')
 *   labels    : string[]
 *   datasets  : Array<{ label: string; data: number[]; color?: string }>
 *   width     : pixel width  (default 300)
 *   height    : pixel height (default 200)
 *   title     : optional chart title string
 *
 * Charts render onto a <canvas> element via CSS3D so they remain fully crisp
 * at any zoom level. The canvas is also wrapped in a div so a title bar can
 * sit above it.
 */
export declare class ChartNode extends Node {
    domElement: HTMLElement;
    canvasEl: HTMLCanvasElement;
    cssObject: CSS3DObject;
    private backing;
    private chartInstance;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    private _renderChart;
    private _renderFallback;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
