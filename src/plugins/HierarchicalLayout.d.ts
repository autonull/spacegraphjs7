import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
/**
 * HierarchicalLayout — Top-down tree layout.
 *
 * Builds a tree from the graph's edge list by doing a BFS from root(s), then
 * assigns X/Y positions layer-by-layer.
 *
 * Plugin settings:
 *   rootId       : ID of the designated root node. If empty, the node with
 *                  no incoming edges is used; if none such exists, the first node.
 *   levelHeight  : vertical spacing between levels (default 200)
 *   nodeSpacing  : minimum horizontal spacing between sibling nodes (default 150)
 *   z            : constant Z (default 0)
 *   direction    : 'top-down' | 'bottom-up' | 'left-right' | 'right-left' (default 'top-down')
 */
export declare class HierarchicalLayout implements ISpaceGraphPlugin {
    readonly id = 'hierarchical-layout';
    readonly name = 'Hierarchical Layout';
    readonly version = '1.0.0';
    private sg;
    settings: {
        rootId: string;
        levelHeight: number;
        nodeSpacing: number;
        z: number;
        direction: 'top-down' | 'bottom-up' | 'left-right' | 'right-left';
    };
    init(sg: SpaceGraph): void;
    apply(): void;
    onPreRender(_delta: number): void;
}
