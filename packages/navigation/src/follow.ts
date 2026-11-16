/**
 * Streaming frame policy for live graph updates.
 * Computes the camera move when new nodes arrive during a streaming session.
 */

import type { RendererViewport } from '@spacegraphjs/renderer';
import type { GraphNode } from '@spacegraphjs/shared';

/** Follow mode determines how the camera responds to new nodes. */
export type FollowMode = 'off' | 'turn' | 'node' | 'node+focus';

/** Result of computing a follow frame. */
export interface CameraMove {
    /** The node ID to frame, if any. */
    nodeId: string | null;
    /** The viewport to set, if any. Overrides node framing. */
    viewport?: RendererViewport;
    /** Whether to apply neighborhood focus highlight to the node. */
    applyFocusHighlight: boolean;
    /** Duration for the focus highlight cross-fade, in ms. */
    focusHighlightDuration: number;
    /** Damping duration for camera animation, in ms. */
    dampingMs: number;
}

/** Configuration for computeFollowFrame. */
export interface ComputeFollowFrameOptions {
    /** New nodes that have been added to the graph. */
    newNodes: readonly GraphNode[];
    /** Current viewport from the renderer. */
    currentViewport: RendererViewport | undefined;
    /** The follow mode. */
    followMode: FollowMode;
    /** Damping duration for camera animation, in ms. Default 400. */
    dampingMs?: number;
    /** Duration for focus highlight cross-fade, in ms. Default 800. */
    focusHighlightDuration?: number;
    /** Get the world position of a node by ID. */
    positionOf: (id: string) => { x: number; y: number; z: number } | undefined;
}

/**
 * Computes the camera move for streaming updates.
 *
 * @param options - The computation options.
 * @returns A CameraMove describing what the camera should do, or null if no move is needed.
 */
export function computeFollowFrame(options: ComputeFollowFrameOptions): CameraMove | null {
    const {
        newNodes,
        currentViewport,
        followMode,
        dampingMs = 400,
        focusHighlightDuration = 800,
        positionOf,
    } = options;

    if (followMode === 'off') return null;
    if (!newNodes.length) return null;
    if (!currentViewport) return null;

    // The newest node is the last in the array (streaming order)
    const newestNode = newNodes[newNodes.length - 1];
    const position = positionOf(newestNode.id);

    if (!position) return null;

    switch (followMode) {
        case 'turn': {
            // Frame at turn boundary - only if we have multiple new nodes that form a turn
            // For now, treat same as 'node' but without focus highlight
            return {
                nodeId: newestNode.id,
                applyFocusHighlight: false,
                focusHighlightDuration: 0,
                dampingMs,
            };
        }

        case 'node': {
            // Frame the newest node
            return {
                nodeId: newestNode.id,
                applyFocusHighlight: false,
                focusHighlightDuration: 0,
                dampingMs,
            };
        }

        case 'node+focus': {
            // Frame the newest node AND apply neighborhood focus highlight
            return {
                nodeId: newestNode.id,
                applyFocusHighlight: true,
                focusHighlightDuration,
                dampingMs,
            };
        }

        default:
            return null;
    }
}

/**
 * Default follow mode for live sessions.
 * When the graph is open during a live session, 'node+focus' provides the best UX.
 */
export const DEFAULT_LIVE_FOLLOW_MODE: FollowMode = 'node+focus';

/**
 * Follow mode for when the user explicitly wants turn-based framing.
 */
export const TURN_FOLLOW_MODE: FollowMode = 'turn';

/**
 * Follow mode for when the user wants node-based framing without focus highlight.
 */
export const NODE_FOLLOW_MODE: FollowMode = 'node';

/**
 * Follow mode disabled.
 */
export const OFF_FOLLOW_MODE: FollowMode = 'off';