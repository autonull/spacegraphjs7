import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface CircularLayoutOptions extends LayoutOptions {
    /** X radius. Optional: when unset, auto-computed to ensure non-overlap. */
    radiusX?: number;
    /** Y radius. Optional: when unset, auto-computed to ensure non-overlap. */
    radiusY?: number;
    /** Extra padding between nodes. Default: 20. */
    nodePadding?: number;
    startAngle: number;
    z: number;
}

export class CircularLayout extends BaseLayout<CircularLayoutOptions> {
    readonly id = 'circular-layout';
    readonly name = 'Circular Layout';
    readonly version = '1.0.0';

    protected place(nodes: Node[], config: CircularLayoutOptions): void {
        const padding = config.nodePadding ?? 20;

        // Compute node diagonal radii and angular shares
        const radii: number[] = [];
        const shares: number[] = [];
        let totalShare = 0;
        for (const node of nodes) {
            const bounds = node.getLayoutBounds();
            const diagonalRadius = Math.hypot(bounds.width, bounds.height) / 2;
            radii.push(diagonalRadius);
            const share = bounds.width + padding;
            shares.push(share);
            totalShare += share;
        }

        // Auto-compute radius to ensure non-overlap between adjacent nodes
        let radiusX = config.radiusX;
        let radiusY = config.radiusY;

        if (radiusX === undefined || radiusY === undefined) {
            // For each adjacent pair, compute minimum radius needed for non-overlap
            // Chord distance = 2 * radius * sin(angularSeparation / 2)
            // Need chord >= radius_i + radius_{i+1} + padding
            let minRadius = 0;
            for (let i = 0; i < nodes.length; i++) {
                const j = (i + 1) % nodes.length;
                const angularSeparation = (shares[i] / totalShare) * 2 * Math.PI;
                const requiredChord = radii[i] + radii[j] + padding;
                const minRadiusForPair = requiredChord / (2 * Math.sin(angularSeparation / 2));
                if (minRadiusForPair > minRadius) minRadius = minRadiusForPair;
            }
            // Also ensure total circumference fits all nodes
            const circumferenceRadius = totalShare / (2 * Math.PI);
            minRadius = Math.max(minRadius, circumferenceRadius);

            if (radiusX === undefined) radiusX = minRadius;
            if (radiusY === undefined) radiusY = minRadius;
        }

        let currentAngle = config.startAngle;
        this.positionAll(nodes, (node, index) => {
            // Place node at the start of its angular allocation, then advance
            const angle = currentAngle;
            const share = shares[index] / totalShare;
            currentAngle += share * 2 * Math.PI;

            return new Vector3(
                radiusX! * Math.cos(angle),
                radiusY! * Math.sin(angle),
                config.z,
            );
        });
    }

    protected defaultConfig(): CircularLayoutOptions {
        return { startAngle: 0, z: 0, animate: true, duration: 1.0, nodePadding: 20 };
    }
}
