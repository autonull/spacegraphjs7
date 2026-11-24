import { describe, expect, it } from 'vitest';
import { lensCompletions, parseLens } from '../src/lens';

describe('Lens command grammar', () => {
    it.each([
        ['view diff', { kind: 'view', value: 'diff' }],
        ['rung grain', { kind: 'rung', value: 'grain' }],
        ['as of 2', { kind: 'asOf', value: 2 }],
        ['tab 2', { kind: 'tab', value: '2' }],
        ['layout radial', { kind: 'layout', value: 'radial' }],
        ['find Paris', { kind: 'find', value: 'paris' }],
        ['find Paris status:complete kind:message', { kind: 'find', value: 'paris', status: 'complete', nodeKind: 'message' }],
        ['f durable status:failed', { kind: 'find', value: 'durable', status: 'failed' }],
        ['focus d:1:task:2', { kind: 'focus', value: 'd:1:task:2' }],
        ['why', { kind: 'why' }],
        ['g d', { kind: 'view', value: 'docs' }],
    ])('parses %s', (query, expected) => {
        expect(parseLens(query)).toEqual(expected);
    });

    it('rejects unknown commands and invalid values', () => {
        expect(parseLens('')).toBeUndefined();
        expect(parseLens('view nowhere')).toBeUndefined();
        expect(parseLens('rung nebula')).toBeUndefined();
        expect(parseLens('layout spiral')).toBeUndefined();
    });

    it('completes prefixes from the command vocabulary', () => {
        expect(lensCompletions('')).toContain('view');
        expect(lensCompletions('vi')).toEqual(['view']);
        expect(lensCompletions('ru')).toContain('rung');
        expect(lensCompletions('zzz')).toEqual([]);
    });
});
