// Generic manual positions and undo/redo for SpaceGraphJS.
// Framework-agnostic core with SolidJS hook in useManualPositions.ts.

export interface ManualPositions {
    positions: Record<string, [number, number, number]>;
    sizes: Record<string, [number, number]>;
}

export type ManualPositionsSnapshot = ManualPositions;

export interface ManualPositionsState extends ManualPositions {
    history: ManualPositionsSnapshot[];
    future: ManualPositionsSnapshot[];
}

export interface ManualPositionsConfig {
    /** Maximum number of history entries to keep. */
    maxHistory?: number;
}

/**
 * Create a manual positions manager with undo/redo support.
 * This is framework-agnostic and can be used with any state management.
 */
export function createManualPositionsManager(
    initial?: ManualPositions,
    config: ManualPositionsConfig = {},
) {
    const maxHistory = config.maxHistory ?? 50;

    let state: ManualPositionsState = {
        positions: initial?.positions ?? {},
        sizes: initial?.sizes ?? {},
        history: [],
        future: [],
    };

    const listeners = new Set<() => void>();

    const notify = () => {
        for (const listener of listeners) listener();
    };

    const captureSnapshot = (): ManualPositionsSnapshot => ({
        positions: { ...state.positions },
        sizes: { ...state.sizes },
    });

    const pushHistory = () => {
        state = {
            ...state,
            history: [...state.history, captureSnapshot()].slice(-maxHistory),
            future: [],
        };
    };

    const getState = () => state;

    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    const setPositions = (positions: Record<string, [number, number, number]>) => {
        state = { ...state, positions };
        notify();
    };

    const setSizes = (sizes: Record<string, [number, number]>) => {
        state = { ...state, sizes };
        notify();
    };

    const positionsEqual = (a: [number, number, number], b: [number, number, number]): boolean => {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    };

    const sizesEqual = (a: [number, number], b: [number, number]): boolean => {
        return a[0] === b[0] && a[1] === b[1];
    };

    const moveNodes = (nodes: readonly { id: string; position: [number, number, number] }[]) => {
        const hasChanges = nodes.some((n) => !state.positions[n.id] || !positionsEqual(state.positions[n.id], n.position));
        if (!hasChanges) return;
        pushHistory();
        state = {
            ...state,
            positions: { ...state.positions, ...Object.fromEntries(nodes.map((n) => [n.id, n.position])) },
        };
        notify();
    };

    const resizeNode = (resize: { id: string; size: [number, number]; position: [number, number, number] }) => {
        const posChanged = !state.positions[resize.id] || !positionsEqual(state.positions[resize.id], resize.position);
        const sizeChanged = !state.sizes[resize.id] || !sizesEqual(state.sizes[resize.id], resize.size);
        if (!posChanged && !sizeChanged) return;
        pushHistory();
        state = {
            ...state,
            positions: { ...state.positions, [resize.id]: resize.position },
            sizes: { ...state.sizes, [resize.id]: resize.size },
        };
        notify();
    };

    const undo = () => {
        if (state.history.length === 0) return false;
        const previous = state.history[state.history.length - 1];
        state = {
            ...state,
            positions: previous.positions,
            sizes: previous.sizes,
            history: state.history.slice(0, -1),
            future: [captureSnapshot(), ...state.future].slice(0, maxHistory),
        };
        notify();
        return true;
    };

    const redo = () => {
        if (state.future.length === 0) return false;
        const next = state.future[0];
        state = {
            ...state,
            positions: next.positions,
            sizes: next.sizes,
            history: [...state.history, captureSnapshot()].slice(-maxHistory),
            future: state.future.slice(1),
        };
        notify();
        return true;
    };

    const canUndo = () => state.history.length > 0;
    const canRedo = () => state.future.length > 0;

    const clear = () => {
        state = { positions: {}, sizes: {}, history: [], future: [] };
        notify();
    };

    return {
        getState,
        subscribe,
        setPositions,
        setSizes,
        moveNodes,
        resizeNode,
        undo,
        redo,
        canUndo,
        canRedo,
        clear,
        maxHistory,
    };
}

export type ManualPositionsManager = ReturnType<typeof createManualPositionsManager>;