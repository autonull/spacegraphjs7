// SolidJS hook for manual positions with undo/redo.
// Wraps the framework-agnostic createManualPositionsManager.

import { createSignal, createEffect, onCleanup } from "solid-js";
import { createManualPositionsManager, type ManualPositions, type ManualPositionsConfig, type ManualPositionsManager } from "./manual-positions";

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
    resizeNode: (resize: { id: string; size: [number, number]; position: [number, number, number] }) => void;
    /** Undo the last change. */
    undo: () => void;
    /** Redo the last undone change. */
    redo: () => void;
    /** Clear all manual positions. */
    clear: () => void;
    /** Access the underlying manager for advanced use cases. */
    readonly manager: ManualPositionsManager;
}

export function useManualPositions(options: UseManualPositionsOptions = {}): UseManualPositionsReturn {
    const { initial, config } = options;

    const [manager] = createSignal<ManualPositionsManager>(createManualPositionsManager(initial, config));
    const [, setTrigger] = createSignal(0);

    // Subscribe to manager changes to trigger Solid updates
    createEffect(() => {
        const unsubscribe = manager().subscribe(() => {
            setTrigger((t) => t + 1);
        });
        onCleanup(unsubscribe);
    });

    return {
        get positions() {
            return () => manager().getState().positions;
        },
        get sizes() {
            return () => manager().getState().sizes;
        },
        get canUndo() {
            return () => manager().canUndo();
        },
        get canRedo() {
            return () => manager().canRedo();
        },
        moveNodes: (nodes) => manager().moveNodes(nodes),
        resizeNode: (resize) => manager().resizeNode(resize),
        undo: () => manager().undo(),
        redo: () => manager().redo(),
        clear: () => manager().clear(),
        get manager() {
            return manager();
        },
    };
}