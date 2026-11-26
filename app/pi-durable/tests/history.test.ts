import { describe, expect, test } from 'vitest';
import type { Address } from '../src/address';
import { HistoryTracker } from '../src/history';

const at = (view: Address['view'], focus?: string): Address => ({ view, focus });

describe('HistoryTracker', () => {
    test('records distinct addresses and ignores repeats', () => {
        const history = new HistoryTracker();
        history.record(at('graph'));
        history.record(at('graph'));
        history.record(at('tasks'));

        expect(history.entries).toEqual([at('graph'), at('tasks')]);
        expect(history.index).toBe(1);
    });

    test('drops the redo branch when a new address is recorded', () => {
        const history = new HistoryTracker();
        history.record(at('graph'));
        history.record(at('tasks'));
        expect(history.step(-1)).toEqual(at('graph'));

        history.record(at('diff'));

        expect(history.entries).toEqual([at('graph'), at('diff')]);
        expect(history.index).toBe(1);
    });

    test('steps only within the recorded bounds', () => {
        const history = new HistoryTracker();
        expect(history.step(1)).toBeUndefined();

        history.record(at('graph'));
        expect(history.step(-1)).toBeUndefined();
        expect(history.step(1)).toBeUndefined();

        history.record(at('tasks'));
        expect(history.step(-1)).toEqual(at('graph'));
        expect(history.step(1)).toEqual(at('tasks'));
        expect(history.step(1)).toBeUndefined();
    });

    test('suppression leaves the trail untouched', () => {
        const history = new HistoryTracker();
        history.record(at('graph'));
        history.suppress(true);
        history.record(at('tasks'));
        history.suppress(false);

        expect(history.entries).toEqual([at('graph')]);
    });
});
