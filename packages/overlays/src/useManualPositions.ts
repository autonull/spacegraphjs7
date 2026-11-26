// SolidJS hook for manual positions with undo/redo.
// Wraps the framework-agnostic createManualPositionsManager.
import { createSignal, onCleanup } from 'solid-js';
import {
    createManualPositionsManager,
    type ManualPositions,
    type ManualPositionsConfig,
    type ManualPositionsManager,
} from './manual-positions';

export interface UseManualPositionsOptions {
    /** Initial positions and sizes. */
    initial?: ManualPositions;
    /** Configuration options. */
    config?: ManualPositionsConfig;
}
export interface UseManualPositionsReturn {
    /** Current manual positions (reactive). */
    readonly positions: () => Record<string, [number, number, number]>;
    /** Current manual sizes (reactive). */
    readonly sizes: () => Record<string, [number, number]>;
    /** Whether undo is available. */
    readonly canUndo: () => boolean;
    /** Whether redo is available. */
    readonly canRedo: () => boolean;
    /** Move multiple nodes. */
    moveNodes: (nodes: readonly { id: string; position: [number, number, number] }[]) => void;
    /** Resize a node (updates position and size). */
    resizeNode: (resize: {
        id: string;
        size: [number, number];
        position: [number, number, number];
    }) => void;
    /** Undo the last change. */
    undo: () => void;
    /** Redo the last undone change. */
    redo: () => void;
    /** Clear all manual positions. */
    clear: () => void;
    /** Access the underlying manager for advanced use cases. */
    readonly manager: ManualPositionsManager;
}

export function useManualPositions(
    options: UseManualPositionsOptions = {},
): UseManualPositionsReturn {
    const manager = createManualPositionsManager(options.initial, options.config);
    const [state, setState] = createSignal(manager.getState());
    onCleanup(manager.subscribe(() => setState(manager.getState())));
    return {
        positions: () => state().positions,
        sizes: () => state().sizes,
        canUndo: () => state().history.length > 0,
        canRedo: () => state().future.length > 0,
        moveNodes: (nodes) => manager.moveNodes(nodes),
        resizeNode: (resize) => manager.resizeNode(resize),
        undo: () => manager.undo(),
        redo: () => manager.redo(),
        clear: () => manager.clear(),
        manager,
    };
}
