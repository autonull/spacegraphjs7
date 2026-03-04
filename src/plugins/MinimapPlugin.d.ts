import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
/**
 * MinimapPlugin — Renders a thumbnail overview of the graph in a corner overlay.
 *
 * Scaffold: creates a secondary ortho camera and renders into a small viewport
 * region each frame.  Full implementation would add interactive panning (click
 * on minimap to fly the main camera there).
 *
 * Plugin settings:
 *   position : 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 *   size     : pixel size of the square minimap (default 160)
 *   margin   : px from the edge of the screen (default 12)
 *   bgColor  : minimap background (default 0x0a0a0a)
 *   alpha    : minimap opacity 0–1 (default 0.8)
 *   zoom     : orthographic half-size (default 1500; larger = more of graph visible)
 */
export declare class MinimapPlugin implements ISpaceGraphPlugin {
    readonly id = 'minimap-plugin';
    readonly name = 'Minimap';
    readonly version = '1.0.0';
    private sg;
    private orthoCamera;
    settings: {
        position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
        size: number;
        margin: number;
        bgColor: number;
        alpha: number;
        zoom: number;
    };
    init(sg: SpaceGraph): void;
    private _buildCamera;
    private isDragging;
    private _getBounds;
    private _pointerToWorld;
    private _onPointerDown;
    private _onPointerMove;
    private _onPointerUp;
    onPostRender(_delta: number): void;
    private _renderMinimap;
    dispose(): void;
}
