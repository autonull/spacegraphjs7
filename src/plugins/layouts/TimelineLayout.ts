import { Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface TimelineLayoutOptions extends LayoutOptions {
    timeField: string;
    orientation: string;
    /** Base spacing. Optional: when unset in fallback mode, uses node width + padding. */
    spacing?: number;
    scaleFactor: number;
    staggerLayout: boolean;
    /** Stagger amount. Optional: when unset, uses max node height + padding. */
    staggerAmount?: number;
    /** Extra padding between nodes. Default: 20. */
    nodePadding?: number;
}

export class TimelineLayout extends BaseLayout<TimelineLayoutOptions> {
    readonly id = 'timeline-layout';
    readonly name = 'Timeline Layout';
    readonly version = '1.0.0';

    protected place(nodes: Node[], config: TimelineLayoutOptions): void {
        const timeline = nodes
            .map((node) => ({ node, time: timeValue(node, config.timeField) }))
            .sort((a, b) => a.time - b.time);
        const minTime = timeline[0]?.time ?? 0;

        const padding = config.nodePadding ?? 20;

        // Precompute bounds for all nodes
        const nodeBounds = new Map<string, { width: number; height: number }>();
        let maxHeight = 0;
        for (const { node } of timeline) {
            const bounds = node.getLayoutBounds();
            nodeBounds.set(node.id, { width: bounds.width, height: bounds.height });
            if (bounds.height > maxHeight) maxHeight = bounds.height;
        }

        const target = new Vector3();
        let fallbackIndex = 0;

        // First pass: place nodes
        for (const [index, { node, time }] of timeline.entries()) {
            const hasValidTime = time !== 0 || minTime !== 0;
            const bounds = nodeBounds.get(node.id)!;
            let along: number;

            if (hasValidTime) {
                along = (time - minTime) * config.scaleFactor;
            } else {
                // Fallback: advance by node width + padding (or config.spacing if provided)
                const step = config.spacing ?? bounds.width + padding;
                along = fallbackIndex++ * step;
            }

            const stagger = config.staggerLayout
                ? index % 2 === 0
                    ? config.staggerAmount ?? maxHeight + padding
                    : -(config.staggerAmount ?? maxHeight + padding)
                : 0;

            target.set(
                config.orientation === 'horizontal' ? along : stagger,
                config.orientation === 'horizontal' ? stagger : -along,
                0,
            );
            this.applyPosition(node, target);
        }

        // Second pass (timed mode): leapfrog to enforce min center gap
        if (timeline.length > 1) {
            const hasValidTimes = timeline.some((entry) => entry.time !== 0 || minTime !== 0);
            if (hasValidTimes) {
                for (let i = 1; i < timeline.length; i++) {
                    const prevNode = timeline[i - 1].node;
                    const currNode = timeline[i].node;
                    const prevBounds = nodeBounds.get(prevNode.id)!;
                    const currBounds = nodeBounds.get(currNode.id)!;
                    const minGap = (prevBounds.width + currBounds.width) / 2 + padding;

                    const prevPos = prevNode.position;
                    const currPos = currNode.position;

                    if (config.orientation === 'horizontal') {
                        const gap = currPos.x - prevPos.x;
                        if (gap < minGap) {
                            currPos.x = prevPos.x + minGap;
                            this.syncPosition(currNode);
                        }
                    } else {
                        const gap = prevPos.y - currPos.y; // vertical timeline grows upward (negative y)
                        if (gap < minGap) {
                            currPos.y = prevPos.y - minGap;
                            this.syncPosition(currNode);
                        }
                    }
                }
            }
        }

        this.centerNodes(timeline.map((entry) => entry.node));
    }

    protected defaultConfig(): TimelineLayoutOptions {
        return {
            timeField: 'timestamp',
            orientation: 'horizontal',
            scaleFactor: 0.1,
            animate: true,
            duration: 1.5,
            staggerLayout: true,
            nodePadding: 20,
        };
    }
}

/** A node's place on the timeline: its timestamp in milliseconds, or 0 when it carries none. */
function timeValue(node: Node, timeField: string): number {
    const value = node.data?.[timeField];
    if (value === undefined) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}
