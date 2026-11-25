import { describe, expect, it } from 'vitest';
import { navigateResults } from './keyboard';
const keyEvent = (key: string): KeyboardEvent =>
    ({ key, preventDefault: () => {} }) as KeyboardEvent;
describe('navigateResults', () => {
    it('wraps arrow navigation through the active result', () => {
        const active: number[] = [];
        navigateResults(keyEvent('ArrowDown'), 3, 2, (index) => active.push(index), () => {});
        navigateResults(keyEvent('ArrowUp'), 3, 0, (index) => active.push(index), () => {});
        expect(active).toEqual([0, 2]);
    });
    it('selects the active result on Enter and ignores empty lists', () => {
        const selected: number[] = [];
        const event = keyEvent('Enter');
        navigateResults(event, 2, 1, () => {}, (index) => selected.push(index));
        navigateResults(event, 0, 0, () => {}, (index) => selected.push(index));
        expect(selected).toEqual([1]);
    });
});
