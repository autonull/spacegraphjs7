import { isRecord } from './record';

/** Spatial memory key parts. */
export interface SpatialMemoryKey {
    /** The session identifier. */
    sessionKey: string;
    /** The layout name. */
    layout: string;
    /** The zoom level. */
    level: string;
    /** Structural content hash. */
    hash: string;
}

/** Camera state for spatial memory. */
export interface SpatialMemoryCamera {
    zoom: number;
    center: [number, number, number];
}

/** Stored spatial memory record. */
export interface SpatialMemoryRecord {
    /** Node positions keyed by node ID. */
    positions: Record<string, [number, number, number]>;
    /** Selected node ID, if any. */
    selection?: string;
    /** Camera state, if available. */
    camera?: SpatialMemoryCamera;
    /** Collapsed group IDs. */
    collapsedGroups: string[];
}

/** Storage interface for spatial memory. */
export interface SpatialMemoryStore {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    keys(): readonly string[];
}

/** Prefix for spatial memory keys in storage. */
export const SPATIAL_MEMORY_PREFIX = 'sessionGraph.spatialMemory.';

const DEFAULT_MAX_ENTRIES = 50;

/** Minimal node shape for hashing. */
export interface HashableNode {
    id: string;
    kind: string;
    turnID?: string;
    clusterOf?: string[];
}

/** Minimal model shape for hashing. */
export interface HashableModel {
    root: string;
    nodes: readonly HashableNode[];
    turns?: readonly string[];
}

/**
 * Compute a structural content hash for the graph.
 * Positions derive from these facts, so the hash changes exactly when a stored frame could be stale.
 * Streaming text does not change the hash: it does not change the geometry.
 */
export function graphContentHash(model: HashableModel): string {
    const parts: unknown[] = [model.root, model.turns ?? []];

    for (const node of model.nodes) {
        parts.push([node.id, node.kind, node.turnID ?? null, node.clusterOf ?? null]);
    }

    return fnv1a(JSON.stringify(parts));
}

/** Build the storage key from parts. */
export function spatialMemoryKey(parts: SpatialMemoryKey): string {
    return `${SPATIAL_MEMORY_PREFIX}${parts.sessionKey}:${parts.layout}:${parts.level}:${parts.hash}`;
}

/** Read a spatial memory record from storage. */
export function readSpatialMemory(
    store: SpatialMemoryStore,
    parts: SpatialMemoryKey,
): SpatialMemoryRecord | undefined {
    const raw = store.getItem(spatialMemoryKey(parts));
    if (!raw) return undefined;
    return decodeSpatialMemory(raw);
}

/** Write a spatial memory record to storage with LRU pruning. */
export function writeSpatialMemory(
    store: SpatialMemoryStore,
    parts: SpatialMemoryKey,
    record: SpatialMemoryRecord,
    maxEntries = DEFAULT_MAX_ENTRIES,
): void {
    pruneSpatialMemory(store, maxEntries);
    store.setItem(spatialMemoryKey(parts), JSON.stringify({ ...record, timestamp: Date.now() }));
}

/** Clear spatial memory for a specific session/layout/level. */
export function clearSpatialMemory(
    store: SpatialMemoryStore,
    sessionKey: string,
    layout: string,
    level: string,
): void {
    const prefix = `${SPATIAL_MEMORY_PREFIX}${sessionKey}:${layout}:${level}:`;
    for (const key of storedKeys(store)) if (key.startsWith(prefix)) store.removeItem(key);
}

/** Clear all spatial memory for a session. */
export function clearAllSpatialMemory(store: SpatialMemoryStore, sessionKey: string): void {
    const prefix = `${SPATIAL_MEMORY_PREFIX}${sessionKey}:`;
    for (const key of storedKeys(store)) if (key.startsWith(prefix)) store.removeItem(key);
}

/** Decode a raw spatial memory string into a record. */
export function decodeSpatialMemory(raw: string): SpatialMemoryRecord | undefined {
    const value = parseRecord(raw);
    if (!value) return undefined;

    const positions = readPositions(value.positions);
    if (!positions) return undefined;

    return {
        positions,
        selection: typeof value.selection === 'string' ? value.selection : undefined,
        camera: readCamera(value.camera),
        collapsedGroups: readGroups(value.collapsedGroups),
    };
}

function pruneSpatialMemory(store: SpatialMemoryStore, maxEntries: number): void {
    const keys = storedKeys(store);
    if (keys.length < maxEntries) return;

    const entries = keys
        .map((key) => ({ key, timestamp: readTimestamp(store, key) }))
        .sort((a, b) => a.timestamp - b.timestamp);

    for (let index = 0; index < keys.length - maxEntries + 1; index++) {
        store.removeItem(entries[index].key);
    }
}

function storedKeys(store: SpatialMemoryStore): string[] {
    return store.keys().filter((key) => key.startsWith(SPATIAL_MEMORY_PREFIX));
}

function readTimestamp(store: SpatialMemoryStore, key: string): number {
    const raw = store.getItem(key);
    if (!raw) return 0;

    const value = parseRecord(raw);
    return value && typeof value.timestamp === 'number' ? value.timestamp : 0;
}

function parseRecord(raw: string): Record<string, unknown> | undefined {
    try {
        const value: unknown = JSON.parse(raw);
        return isRecord(value) ? value : undefined;
    } catch {
        return undefined;
    }
}

function readPositions(value: unknown): Record<string, [number, number, number]> | undefined {
    if (!isRecord(value)) return undefined;

    const positions: Record<string, [number, number, number]> = {};
    for (const [id, point] of Object.entries(value)) {
        const triple = readTriple(point);
        if (triple) positions[id] = triple;
    }

    return Object.keys(positions).length > 0 ? positions : undefined;
}

function readCamera(value: unknown): SpatialMemoryCamera | undefined {
    if (!isRecord(value)) return undefined;
    if (typeof value.zoom !== 'number' || !Number.isFinite(value.zoom)) return undefined;

    const center = readTriple(value.center);
    if (!center) return undefined;

    return { zoom: value.zoom, center };
}

function readGroups(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === 'string');
}

function readTriple(value: unknown): [number, number, number] | undefined {
    if (!Array.isArray(value) || value.length !== 3) return undefined;
    if (!value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate)))
        return undefined;
    return [value[0], value[1], value[2]];
}

/**
 * FNV-1a hash algorithm (32-bit).
 * Stable stringify + FNV-1a as specified in the plan.
 */
function fnv1a(text: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}