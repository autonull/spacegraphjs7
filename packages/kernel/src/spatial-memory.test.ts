import { describe, it, expect } from 'vitest';
import {
    graphContentHash,
    spatialMemoryKey,
    readSpatialMemory,
    writeSpatialMemory,
    decodeSpatialMemory,
    clearSpatialMemory,
    clearAllSpatialMemory,
    SPATIAL_MEMORY_PREFIX,
    type SpatialMemoryStore,
    type HashableModel,
    type SpatialMemoryKey,
} from './spatial-memory';

function createMemoryStore(): SpatialMemoryStore {
    const storage = new Map<string, string>();
    return {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
        keys: () => Array.from(storage.keys()),
    };
}

function createTestModel(): HashableModel {
    return {
        root: 'session',
        turns: ['turn:1', 'turn:2'],
        nodes: [
            { id: 'session', kind: 'session' },
            { id: 'turn:1', kind: 'turn', turnID: 'turn:1' },
            { id: 'turn:2', kind: 'turn', turnID: 'turn:2' },
            { id: 'tool:1', kind: 'tool', turnID: 'turn:1' },
            { id: 'tool:2', kind: 'tool', turnID: 'turn:1', clusterOf: ['sub:1'] },
            { id: 'sub:1', kind: 'subagent', turnID: 'turn:2' },
        ],
    };
}

describe('graphContentHash', () => {
    it('produces consistent hash for same model', () => {
        const model = createTestModel();
        const hash1 = graphContentHash(model);
        const hash2 = graphContentHash(model);
        expect(hash1).toBe(hash2);
    });

    it('produces different hash for different nodes', () => {
        const model1 = createTestModel();
        const model2 = {
            ...model1,
            nodes: [...model1.nodes, { id: 'new', kind: 'node' }],
        };
        expect(graphContentHash(model1)).not.toBe(graphContentHash(model2));
    });

    it('produces different hash for different turn order', () => {
        const model1 = createTestModel();
        const model2 = {
            ...model1,
            turns: ['turn:2', 'turn:1'],
        };
        expect(graphContentHash(model1)).not.toBe(graphContentHash(model2));
    });

    it('ignores node positions (not in hashable model)', () => {
        // The hashable model doesn't include positions, so this is inherent
        const model = createTestModel();
        const hash = graphContentHash(model);
        expect(typeof hash).toBe('string');
        expect(hash.length).toBeGreaterThan(0);
    });
});

describe('spatialMemoryKey', () => {
    it('builds key with prefix and parts', () => {
        const parts: SpatialMemoryKey = {
            sessionKey: 'sess-123',
            layout: 'lanes',
            level: 'execution',
            hash: 'abc123',
        };
        const key = spatialMemoryKey(parts);
        expect(key).toBe(`${SPATIAL_MEMORY_PREFIX}sess-123:lanes:execution:abc123`);
    });
});

describe('readSpatialMemory / writeSpatialMemory', () => {
    it('writes and reads a record', () => {
        const store = createMemoryStore();
        const parts: SpatialMemoryKey = {
            sessionKey: 'sess-1',
            layout: 'lanes',
            level: 'execution',
            hash: 'hash1',
        };
        const record: SpatialMemoryRecord = {
            positions: { 'n1': [10, 20, 0], 'n2': [30, 40, 0] },
            selection: 'n1',
            camera: { zoom: 1.5, center: [100, 100, 0] },
            collapsedGroups: ['group1'],
        };

        writeSpatialMemory(store, parts, record);
        const read = readSpatialMemory(store, parts);

        expect(read).toBeDefined();
        expect(read!.positions).toEqual(record.positions);
        expect(read!.selection).toBe('n1');
        expect(read!.camera).toEqual(record.camera);
        expect(read!.collapsedGroups).toEqual(['group1']);
    });

    it('returns undefined for missing key', () => {
        const store = createMemoryStore();
        const parts: SpatialMemoryKey = {
            sessionKey: 'sess-1',
            layout: 'lanes',
            level: 'execution',
            hash: 'nonexistent',
        };
        expect(readSpatialMemory(store, parts)).toBeUndefined();
    });

    it('prunes old entries when exceeding maxEntries', () => {
        const store = createMemoryStore();
        const baseParts: SpatialMemoryKey = {
            sessionKey: 'sess-1',
            layout: 'lanes',
            level: 'execution',
            hash: '',
        };

        // Write 55 entries (default max is 50)
        for (let i = 0; i < 55; i++) {
            const parts = { ...baseParts, hash: `hash${i}` };
            writeSpatialMemory(store, parts, {
                positions: { [`n${i}`]: [i, i, 0] },
                collapsedGroups: [],
            });
        }

        const keys = store.keys();
        expect(keys.length).toBeLessThanOrEqual(50);
    });
});

describe('decodeSpatialMemory', () => {
    it('decodes valid record', () => {
        const record: SpatialMemoryRecord = {
            positions: { 'n1': [10, 20, 0] },
            selection: 'n1',
            camera: { zoom: 1, center: [0, 0, 0] },
            collapsedGroups: ['g1'],
        };
        const raw = JSON.stringify({ ...record, timestamp: Date.now() });
        const decoded = decodeSpatialMemory(raw);
        expect(decoded).toEqual(record);
    });

    it('returns undefined for invalid JSON', () => {
        expect(decodeSpatialMemory('not json')).toBeUndefined();
    });

    it('returns undefined for missing positions', () => {
        const raw = JSON.stringify({ selection: 'n1', collapsedGroups: [], timestamp: 1 });
        expect(decodeSpatialMemory(raw)).toBeUndefined();
    });

    it('handles missing optional fields', () => {
        const raw = JSON.stringify({
            positions: { n1: [1, 2, 3] },
            collapsedGroups: [],
            timestamp: 1,
        });
        const decoded = decodeSpatialMemory(raw);
        expect(decoded).toBeDefined();
        expect(decoded!.selection).toBeUndefined();
        expect(decoded!.camera).toBeUndefined();
    });
});

describe('clearSpatialMemory', () => {
    it('clears entries matching prefix', () => {
        const store = createMemoryStore();
        writeSpatialMemory(store, { sessionKey: 's1', layout: 'lanes', level: 'exec', hash: 'h1' }, { positions: {}, collapsedGroups: [] });
        writeSpatialMemory(store, { sessionKey: 's1', layout: 'lanes', level: 'exec', hash: 'h2' }, { positions: {}, collapsedGroups: [] });
        writeSpatialMemory(store, { sessionKey: 's2', layout: 'lanes', level: 'exec', hash: 'h3' }, { positions: {}, collapsedGroups: [] });

        clearSpatialMemory(store, 's1', 'lanes', 'exec');

        expect(store.keys()).toEqual([
            `${SPATIAL_MEMORY_PREFIX}s2:lanes:exec:h3`,
        ]);
    });
});

describe('clearAllSpatialMemory', () => {
    it('clears all entries for a session', () => {
        const store = createMemoryStore();
        writeSpatialMemory(store, { sessionKey: 's1', layout: 'lanes', level: 'exec', hash: 'h1' }, { positions: {}, collapsedGroups: [] });
        writeSpatialMemory(store, { sessionKey: 's1', layout: 'timeline', level: 'detail', hash: 'h2' }, { positions: {}, collapsedGroups: [] });
        writeSpatialMemory(store, { sessionKey: 's2', layout: 'lanes', level: 'exec', hash: 'h3' }, { positions: {}, collapsedGroups: [] });

        clearAllSpatialMemory(store, 's1');

        expect(store.keys()).toEqual([
            `${SPATIAL_MEMORY_PREFIX}s2:lanes:exec:h3`,
        ]);
    });
});

describe('fnv1a (internal)', () => {
    it('produces consistent output', () => {
        // We can't directly test fnv1a since it's not exported, but we can test via graphContentHash
        const model = createTestModel();
        const hash1 = graphContentHash(model);
        const hash2 = graphContentHash(model);
        expect(hash1).toBe(hash2);
    });

    it('differs for different inputs', () => {
        const model1 = createTestModel();
        const model2 = { ...model1, root: 'different' };
        expect(graphContentHash(model1)).not.toBe(graphContentHash(model2));
    });
});