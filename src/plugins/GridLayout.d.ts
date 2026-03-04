import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
/**
 * GridLayout — Arranges nodes in a uniform rectangular grid on the XY plane.
 *
 * data options per node:
 *   pinned : boolean — skip this node during layout
 *
 * Plugin options (pass via settings):
 *   columns  : number of columns (default: ceil(sqrt(n)))
 *   spacingX : horizontal spacing (default 200)
 *   spacingY : vertical spacing   (default 200)
 *   offsetX  : world X origin     (default 0)
 *   offsetY  : world Y origin     (default 0)
 */
export declare class GridLayout implements ISpaceGraphPlugin {
    readonly id = 'grid-layout';
    readonly name = 'Grid Layout';
    readonly version = '1.0.0';
    private sg;
    settings: {
        columns: number;
        spacingX: number;
        spacingY: number;
        offsetX: number;
        offsetY: number;
    };
    init(sg: SpaceGraph): void;
    /** Call explicitly or triggered externally. Does NOT run every frame. */
    apply(): void;
    onPreRender(_delta: number): void;
}
