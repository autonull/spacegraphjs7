import { describe, expect, test } from 'vitest';
import { fixtureOps, fixtureSnapshot, foldSourceOps } from './fixture';
import { snapshotEvents } from './snapshot';
import { apiCensus, dependenciesOf, dependentsOf, referencesOf, symbolsOf } from './selectors';
import { buildSourceView, roleOf } from './vocabulary';

const snapshot = fixtureSnapshot();
const view = buildSourceView(foldSourceOps(fixtureOps(snapshot)), snapshot.id);
const id = (...parts: readonly string[]): string => ['source', 'fixture', ...parts].join(':');

describe('source snapshot mapping', () => {
    test('events cover packages, files, symbols and all three edge kinds', () => {
        const events = snapshotEvents(snapshot);
        expect(events.filter((event) => event.type === 'package')).toHaveLength(2);
        expect(events.filter((event) => event.type === 'file')).toHaveLength(3);
        expect(events.filter((event) => event.type === 'symbol')).toHaveLength(4);
        expect(
            events.filter((event) => event.type === 'edge').map((event) =>
                event.type === 'edge' ? event.kind : '',
            ).sort(),
        ).toEqual(['exports', 'imports', 'references']);
    });

    test('the same snapshot folds to the same view', () => {
        expect(buildSourceView(foldSourceOps(fixtureOps()), 'fixture')).toEqual(view);
    });

    test('the root is a package and symbols carry their source location', () => {
        expect(roleOf(view.nodes.find((node) => node.id === view.root)!)).toBe('package');
        const add = view.nodes.find((node) => node.id === id('spacegraphjs', 'core/graph', 'add'))!;
        expect(add.data?.['symbolKind']).toBe('function');
        expect(add.data?.['line']).toBe(20);
    });
});

describe('source selectors', () => {
    test('symbolsOf lists declarations in a file', () => {
        expect(symbolsOf(view, id('spacegraphjs', 'core/graph'))).toEqual([
            id('spacegraphjs', 'core/graph', 'Graph'),
            id('spacegraphjs', 'core/graph', 'add'),
        ]);
    });

    test('dependencies and dependents cross package boundaries', () => {
        expect(dependenciesOf(view, id('@spacegraphjs/renderer', 'contract'))).toContain(
            id('spacegraphjs', 'index'),
        );
        expect(dependentsOf(view, id('spacegraphjs', 'index'))).toContain(
            id('@spacegraphjs/renderer', 'contract'),
        );
    });

    test('referencesOf follows symbol-level mentions', () => {
        expect(referencesOf(view, id('spacegraphjs', 'core/graph', 'add'))).toContain(
            id('spacegraphjs', 'core/graph', 'Graph'),
        );
    });

    test('apiCensus counts every node by role', () => {
        const counts = apiCensus(view);
        expect(counts.package).toBe(2);
        expect(counts.file).toBe(3);
        expect(counts.class).toBe(2);
        expect(counts.function).toBe(2);
    });
});
