import { createMemo, Accessor } from 'solid-js';
import type { GraphViewData } from '@spacegraphjs/shared';
import { computeFocusOverlay, type FocusOverlay, type FocusOverlayOptions } from './focus';

/** Options for the useFocusOverlay hook. */
export interface UseFocusOverlayOptions {
    /** Accessor for the graph model. */
    model: Accessor<GraphViewData>;
    /** Accessor for the selection (array of node IDs). */
    selection: Accessor<readonly string[]>;
    /** Optional accessor for the streaming node ID. */
    streamingNode?: Accessor<string | undefined>;
    /** Maximum BFS distance to compute. Default: 3. */
    maxDistance?: number;
}

/**
 * SolidJS hook that computes a graded focus overlay mapping each node to its BFS distance
 * from the nearest selected node.
 *
 * Returns a memo that updates when the model, selection, or streaming node changes.
 */
export function useFocusOverlay(options: UseFocusOverlayOptions): Accessor<FocusOverlay> {
    const { model, selection, streamingNode, maxDistance = 3 } = options;

    return createMemo<FocusOverlay>(() => {
        return computeFocusOverlay({
            model: model(),
            selection: selection(),
            streamingNode: streamingNode?.(),
            maxDistance,
        });
    });
}