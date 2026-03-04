import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
/**
 * CircularLayout — Places nodes evenly around a circle (or ellipse) on the XY plane.
 *
 * Plugin settings:
 *   radiusX : horizontal radius (default 300)
 *   radiusY : vertical radius   (default 300, = radiusX for a circle)
 *   startAngle : starting angle in radians (default 0 = right)
 *   z          : constant Z for all placed nodes (default 0)
 */
export declare class CircularLayout implements ISpaceGraphPlugin {
    readonly id = 'circular-layout';
    readonly name = 'Circular Layout';
    readonly version = '1.0.0';
    private sg;
    settings: {
        radiusX: number;
        radiusY: number;
        startAngle: number;
        z: number;
    };
    init(sg: SpaceGraph): void;
    apply(): void;
    onPreRender(_delta: number): void;
}
