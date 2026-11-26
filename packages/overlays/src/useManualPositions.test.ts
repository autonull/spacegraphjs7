import { describe, expect, it } from 'vitest';
import { useManualPositions } from './useManualPositions';

describe('useManualPositions', () => {
    it('reflects manager changes in its accessors', () => {
        const hook = useManualPositions();
        hook.moveNodes([{ id: 'n1', position: [10, 20, 30] }]);
        expect(hook.positions().n1).toEqual([10, 20, 30]);
        expect(hook.canUndo()).toBe(true);
        hook.undo();
        expect(hook.positions().n1).toBeUndefined();
        expect(hook.canRedo()).toBe(true);
    });
});
