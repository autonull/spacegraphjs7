import { describe, expect, test } from 'vitest';
import { compileNLQ, formatNLQResult, parseNLQ } from './nlq';

describe('compileNLQ', () => {
    test('turns a typed question into kind, status and free-text facets', () => {
        const facets = compileNLQ('Show me failed files in auth');
        expect([...facets.kinds]).toEqual(['file']);
        expect([...facets.statuses]).toEqual(['failed']);
        expect(facets.query).toBe('in auth');
    });

    test('matches stems and consumes only the words it understands', () => {
        const facets = compileNLQ('find successful builds');
        expect([...facets.statuses]).toEqual(['success']);
        expect(facets.query).toBe('builds');
        expect(compileNLQ('token').query).toBe('token');
    });

    test('accepts host vocabulary and extra dictionaries', () => {
        const options = {
            kinds: ['bug', 'module'],
            statuses: ['blocked'],
            dictionaries: { kinds: { bug: ['crash'], module: ['mod'] } },
        };
        const facets = compileNLQ('show blocked crashes in mod', options);
        expect([...facets.kinds]).toEqual(['bug', 'module']);
        expect([...facets.statuses]).toEqual(['blocked']);
        expect(facets.query).toBe('in');
    });

    test('serializes back to the canonical q grammar', () => {
        const { facets, queryString } = parseNLQ('show failed files');
        expect(queryString).toBe('kind:file status:failed');
        expect(formatNLQResult(facets)).toBe(queryString);
    });
});
