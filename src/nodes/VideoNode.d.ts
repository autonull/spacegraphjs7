import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * VideoNode — Displays an HTML5 video as a Three.js texture on a plane.
 *
 * data options:
 *   src      : video URL (required)
 *   width    : world-space width  (default 320)
 *   height   : world-space height (default 180)
 *   autoplay : boolean (default true)
 *   loop     : boolean (default true)
 *   muted    : boolean (default true — required for autoplay in most browsers)
 */
export declare class VideoNode extends Node {
    videoEl: HTMLVideoElement;
    private texture;
    private plane;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    play(): void;
    pause(): void;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
