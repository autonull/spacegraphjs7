// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Navigation } from '../../src/navigation';

type TestNode = { id: string; label: string; summary?: string; path?: string };

const MODEL: { nodes: TestNode[] } = {
    nodes: [
        { id: 'a', label: 'Read file', summary: 'reads the config' },
        { id: 'b', label: 'Write file', path: 'src/index.ts' },
        { id: 'c', label: 'Run tests' },
    ],
};

const fields = (node: TestNode) =>
    [node.label, node.summary, node.path].filter((value): value is string => !!value);

describe('Navigation.search', () => {
    it('matches the fields case-insensitively', () => {
        expect(Navigation.search(MODEL, 'READ', fields).map((node) => node.id)).toEqual(['a']);
        expect(Navigation.search(MODEL, 'file', fields).map((node) => node.id)).toEqual(['a', 'b']);
    });

    it('matches inside a field, not only at its start', () => {
        expect(Navigation.search(MODEL, 'ndex', fields).map((node) => node.id)).toEqual(['b']);
    });

    it('returns nothing for an empty query', () => {
        expect(Navigation.search(MODEL, '', fields)).toEqual([]);
        expect(Navigation.search(MODEL, '   ', fields)).toEqual([]);
    });

    it('keeps the model order', () => {
        expect(Navigation.search(MODEL, 'e', fields).map((node) => node.id)).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    it('joins the fields, so a query may span two of them', () => {
        expect(Navigation.search(MODEL, 'Read file\nreads', fields).map((node) => node.id)).toEqual(
            ['a'],
        );
    });
});

describe('Navigation.searchBy', () => {
    const ranks: Record<string, number> = { first: 0, second: 1, third: 2 };
    const score = (node: { label: string }): number => ranks[node.label] ?? -1;

    it('returns only the best hits, in rank order', () => {
        const model = {
            nodes: [
                { id: 'third', label: 'third' },
                { id: 'first', label: 'first' },
                { id: 'second', label: 'second' },
            ],
        };
        expect(Navigation.searchBy(model, 'query', score, 2).map((node) => node.id)).toEqual([
            'first',
            'second',
        ]);
    });

    it('keeps model order for equal scores at the limit', () => {
        const model = {
            nodes: [
                { id: 'a', label: 'first' },
                { id: 'b', label: 'first' },
                { id: 'c', label: 'second' },
            ],
        };
        expect(Navigation.searchBy(model, 'query', score, 2).map((node) => node.id)).toEqual([
            'a',
            'b',
        ]);
    });
});
