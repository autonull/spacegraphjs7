import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface GridLayoutOptions extends LayoutOptions {
    columns: number;
    /** Horizontal spacing. Optional: when unset, auto-computed from max node diagonal radius + nodePadding. */
    spacingX?: number;
    /** Vertical spacing. Optional: when unset, auto-computed from max node diagonal radius + nodePadding. */
    spacingY?: number;
    /** Extra padding between nodes. Default: 20. */
    nodePadding?: number;
    offsetX: number;
    offsetY: number;
}

export class GridLayout extends BaseLayout<GridLayoutOptions> {
    readonly id = 'grid-layout';
    readonly name = 'Grid Layout';
    readonly version = '1.0.0';

    protected place(nodes: Node[], config: GridLayoutOptions): void {
        const cols = config.columns > 0 ? config.columns : Math.ceil(Math.sqrt(nodes.length));
        const padding = config.nodePadding ?? 20;

        // Auto-compute spacing from node diagonal radii when not explicitly provided
        // Using diagonal radius (hypot(width, height)/2 + padding) ensures non-overlap in both axes
        let spacingX = config.spacingX;
        let spacingY = config.spacingY;

        if (spacingX === undefined || spacingY === undefined) {
            let maxDiagonalRadius = 0;
            for (const node of nodes) {
                const bounds = node.getLayoutBounds();
                const diagonalRadius = Math.hypot(bounds.width, bounds.height) / 2 + padding;
                if (diagonalRadius > maxDiagonalRadius) maxDiagonalRadius = diagonalRadius;
            }
            // Spacing = 2 * maxDiagonalRadius = max diagonal + 2*padding
            const computedSpacing = 2 * maxDiagonalRadius;
            if (spacingX === undefined) spacingX = computedSpacing;
            if (spacingY === undefined) spacingY = computedSpacing;
        }

        this.positionAll(
            nodes,
            (node, index) =>
                new Vector3(
                    config.offsetX + (index % cols) * spacingX!,
                    config.offsetY - Math.floor(index / cols) * spacingY!,
                    node.position.z,
                ),
        );
    }

    protected defaultConfig(): GridLayoutOptions {
        return {
            columns: 0,
            offsetX: 0,
            offsetY: 0,
            animate: true,
            duration: 1.0,
            nodePadding: 20,
        };
    }
}
