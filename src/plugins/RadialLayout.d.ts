import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
/**
 * RadialLayout — Positions the root node at the center and distributes
 * children at increasing radii by depth.
 *
 * Plugin settings:
 *   rootId      : designated root (auto-selected if empty)
 *   baseRadius  : radius for depth-1 nodes (default 200)
 *   radiusStep  : additional radius per depth level (default 180)
 *   z           : constant Z (default 0)
 *   startAngle  : starting angle in radians (default 0)
 */
export declare class RadialLayout implements ISpaceGraphPlugin {
    readonly id = 'radial-layout';
    readonly name = 'Radial Layout';
    readonly version = '1.0.0';
    private sg;
    settings: {
        rootId: string;
        baseRadius: number;
        radiusStep: number;
        z: number;
        startAngle: number;
    };
    init(sg: SpaceGraph): void;
    apply(): void;
    onPreRender(_delta: number): void;
}
