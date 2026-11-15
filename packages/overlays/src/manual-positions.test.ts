// Tests for generic manual positions and undo/redo.

import { describe, it, expect, beforeEach } from "vitest";
import { createManualPositionsManager } from "./manual-positions";

describe("createManualPositionsManager", () => {
    let manager: ReturnType<typeof createManualPositionsManager>;

    beforeEach(() => {
        manager = createManualPositionsManager();
    });

    it("starts empty", () => {
        const state = manager.getState();
        expect(state.positions).toEqual({});
        expect(state.sizes).toEqual({});
        expect(state.history).toHaveLength(0);
        expect(state.future).toHaveLength(0);
        expect(manager.canUndo()).toBe(false);
        expect(manager.canRedo()).toBe(false);
    });

    it("accepts initial positions and sizes", () => {
        const initial = {
            positions: { n1: [10, 20, 30] as [number, number, number] },
            sizes: { n1: [100, 50] as [number, number] },
        };
        const m = createManualPositionsManager(initial);
        const state = m.getState();
        expect(state.positions).toEqual({ n1: [10, 20, 30] });
        expect(state.sizes).toEqual({ n1: [100, 50] });
    });

    it("moveNodes updates positions and captures history", () => {
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        expect(manager.getState().positions).toEqual({ n1: [10, 20, 30] });
        expect(manager.canUndo()).toBe(true);
    });

    it("moveNodes only captures history when position changes", () => {
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]); // same position
        // First move captures empty snapshot, second identical move captures nothing
        expect(manager.getState().history).toHaveLength(1);
    });

    it("resizeNode updates position and size", () => {
        manager.resizeNode({ id: "n1", size: [100, 50], position: [10, 20, 30] });
        const state = manager.getState();
        expect(state.positions).toEqual({ n1: [10, 20, 30] });
        expect(state.sizes).toEqual({ n1: [100, 50] });
        expect(manager.canUndo()).toBe(true);
    });

    it("undo restores previous state", () => {
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        manager.moveNodes([{ id: "n1", position: [40, 50, 60] }]);
        expect(manager.getState().positions.n1).toEqual([40, 50, 60]);

        manager.undo();
        expect(manager.getState().positions.n1).toEqual([10, 20, 30]);
        expect(manager.canRedo()).toBe(true);
    });

    it("redo restores undone state", () => {
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        manager.moveNodes([{ id: "n1", position: [40, 50, 60] }]);
        manager.undo();
        manager.redo();
        expect(manager.getState().positions.n1).toEqual([40, 50, 60]);
    });

    it("undo/redo clears future on new changes", () => {
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        manager.moveNodes([{ id: "n1", position: [40, 50, 60] }]);
        manager.undo();
        manager.moveNodes([{ id: "n1", position: [70, 80, 90] }]);
        expect(manager.canRedo()).toBe(false);
        expect(manager.getState().positions.n1).toEqual([70, 80, 90]);
    });

    it("respects maxHistory limit", () => {
        const m = createManualPositionsManager(undefined, { maxHistory: 2 });
        m.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        m.moveNodes([{ id: "n1", position: [40, 50, 60] }]);
        m.moveNodes([{ id: "n1", position: [70, 80, 90] }]);
        expect(m.getState().history).toHaveLength(2);
        // History captures state BEFORE each change, so with maxHistory=2 we keep
        // the snapshots before the last 2 changes (before moves 2 and 3)
        expect(m.getState().history[0].positions.n1).toEqual([10, 20, 30]);
        expect(m.getState().history[1].positions.n1).toEqual([40, 50, 60]);
    });

    it("clear resets everything", () => {
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        manager.resizeNode({ id: "n1", size: [100, 50], position: [10, 20, 30] });
        manager.clear();
        const state = manager.getState();
        expect(state.positions).toEqual({});
        expect(state.sizes).toEqual({});
        expect(state.history).toHaveLength(0);
        expect(state.future).toHaveLength(0);
        expect(manager.canUndo()).toBe(false);
        expect(manager.canRedo()).toBe(false);
    });

    it("subscribe notifies on changes", () => {
        let notifications = 0;
        const unsubscribe = manager.subscribe(() => notifications++);
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        expect(notifications).toBe(1);
        manager.resizeNode({ id: "n1", size: [100, 50], position: [10, 20, 30] });
        expect(notifications).toBe(2);
        unsubscribe();
        manager.moveNodes([{ id: "n2", position: [1, 2, 3] }]);
        expect(notifications).toBe(2); // no more notifications after unsubscribe
    });

    it("handles multiple nodes independently", () => {
        manager.moveNodes([
            { id: "n1", position: [10, 20, 30] },
            { id: "n2", position: [40, 50, 60] },
        ]);
        expect(manager.getState().positions).toEqual({
            n1: [10, 20, 30],
            n2: [40, 50, 60],
        });
    });

    it("undo/redo preserves both positions and sizes", () => {
        manager.moveNodes([{ id: "n1", position: [10, 20, 30] }]);
        manager.resizeNode({ id: "n1", size: [100, 50], position: [10, 20, 30] });
        manager.moveNodes([{ id: "n1", position: [40, 50, 60] }]);
        manager.resizeNode({ id: "n1", size: [200, 100], position: [40, 50, 60] });

        // Undo restores state before the last change (resizeNode with size [200,100])
        manager.undo();
        expect(manager.getState().positions.n1).toEqual([40, 50, 60]);
        expect(manager.getState().sizes.n1).toEqual([100, 50]);

        manager.redo();
        expect(manager.getState().positions.n1).toEqual([40, 50, 60]);
        expect(manager.getState().sizes.n1).toEqual([200, 100]);
    });
});