import { describe, expect, test } from 'vitest';
import { FilesystemEventMapper, type FilesystemEvent } from './mapping';
import { fixtureEvents, fixtureOps, foldFilesystemOps } from './fixture';
import {
    EDGE_KINDS,
    FILESYSTEM_KINDS,
    FILESYSTEM_RELATIONS,
    buildFileSystemView,
    filesystemDomain,
    relationOf,
    roleOf,
} from './vocabulary';
import {
    changeOrigins,
    changeProducers,
    ledHere,
    symbolDependencies,
    symbolDependents,
    why,
} from './selectors';
import { filesystemFacetAccessors, filesystemTraceVocabulary } from './facets';

const kernel = foldFilesystemOps(fixtureOps());
const view = buildFileSystemView(kernel);

describe('event mapping', () => {
    test('emits ordinary edges and no inferred causes', () => {
        const kinds = new Set(kernel.nodes.map((node) => node.kind));
        const edgeKinds = new Set(kernel.edges.map((edge) => edge.kind));

        for (const kind of FILESYSTEM_KINDS) expect(kinds.has(kind)).toBe(true);
        expect(edgeKinds.has('contains')).toBe(true);
        expect(edgeKinds.has('writes')).toBe(true);
        expect(edgeKinds.has('depends')).toBe(true);
        expect(edgeKinds.has('produces')).toBe(true);
        expect(edgeKinds.has('inferred-cause')).toBe(false);
        expect(kernel.diagnostics().danglingEdges).toEqual([]);
    });

    test('is deterministic for a fixed event stream', () => {
        const mapper = new FilesystemEventMapper();
        const events: readonly FilesystemEvent[] = fixtureEvents();
        const first = JSON.stringify(events.flatMap((event) => mapper.map(event)));
        const second = JSON.stringify(
            fixtureEvents().flatMap((event) => new FilesystemEventMapper().map(event)),
        );
        expect(first).toBe(second);
    });
});

describe('filesystem domain', () => {
    test('builds a view with root, changes and the active change marker', () => {
        expect(view.root).toBe('filesystem:c1:commit');
        expect(view.turns).toEqual(['filesystem:c1:edit']);
        expect(view.activeChange).toBe('filesystem:c1:edit');
        expect(view.changeByFile?.get('filesystem:c1:session')).toBe('filesystem:c1:edit');
    });

    test('exposes a structural manifest and advisory vocabulary', () => {
        expect(filesystemDomain.id).toBe('filesystem');
        expect(filesystemDomain.manifest().every((entry) => entry.values.length > 0)).toBe(true);
        expect(EDGE_KINDS).toContain('depends');
        expect(
            filesystemDomain.vocabulary.scopeIdOf?.({
                kind: 'change',
                data: { fileId: 'session' },
            }),
        ).toBe('session');
    });
});

describe('selectors', () => {
    test('answers what produced a change and which symbols depend on it', () => {
        expect(changeProducers(view, 'filesystem:c1:edit')).toEqual(['filesystem:c1:refresh']);
        expect(symbolDependents(view, 'filesystem:c1:verify')).toEqual(['filesystem:c1:refresh']);
        expect(symbolDependencies(view, 'filesystem:c1:refresh')).toEqual(['filesystem:c1:verify']);
    });

    test('walks provenance and ordering edges', () => {
        expect(why(view, 'filesystem:c1:edit').answerIds.has('filesystem:c1:refresh')).toBe(true);
        expect(ledHere(view, 'filesystem:c1:session').answerIds.has('filesystem:c1:bundle')).toBe(
            true,
        );
    });

    test('change origins carry first-write order and their writers', () => {
        expect(changeOrigins(view)).toEqual([
            {
                id: 'filesystem:c1:edit',
                path: 'src/auth/session.ts',
                producers: ['filesystem:c1:refresh'],
            },
        ]);
    });
});

describe('roles, relations, facets and trace', () => {
    test('read host tags before the default kind mapping', () => {
        expect(roleOf({ kind: 'other', data: { role: 'symbol' } })).toBe('symbol');
        expect(
            relationOf({ kind: 'uses', data: { relation: FILESYSTEM_RELATIONS.dependency } }),
        ).toBe('depends');
        expect(relationOf({ kind: 'reads' })).toBe('reads');
    });

    test('facets and trace expose only generic roles', () => {
        expect(
            filesystemFacetAccessors.isFileWrite!({
                id: 'edit',
                kind: 'change',
                label: 'edit',
                status: 'active',
                data: { path: 'src/auth/session.ts' },
            }),
        ).toBe(true);
        expect(filesystemTraceVocabulary.provenanceEdgeKinds.has('produces')).toBe(true);
    });
});
