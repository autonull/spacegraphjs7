import { Kernel } from './kernel';
import { SessionKernel } from './session';

/** A snapshot of the graph at a specific version. */
export interface GraphSnapshot {
    /** The version number this snapshot represents. */
    version: number;
    /** The kernel state at this version. */
    kernel: Kernel;
    /** Optional host-provided label for this snapshot (e.g., turn ID, timestamp). */
    label?: string;
    /** Optional host-provided metadata. */
    metadata?: Record<string, unknown>;
}

/** Configuration for GraphHistory. */
export interface GraphHistoryConfig {
    /** Maximum number of snapshots to retain. */
    limit: number;
    /** Optional function to generate a label for a snapshot from its version and kernel. */
    labeler?: (version: number, kernel: Kernel) => string;
}

/**
 * GraphHistory manages a bounded list of graph snapshots over a SessionKernel.
 * It captures snapshots at specific versions, supports checkout and fork,
 * and maintains a bounded history using the provided limit.
 */
export class GraphHistory {
    private snapshots: GraphSnapshot[] = [];
    private readonly limit: number;
    private readonly labeler?: (version: number, kernel: Kernel) => string;
    private sessionKernel: SessionKernel;

    constructor(sessionKernel: SessionKernel, config: GraphHistoryConfig) {
        this.sessionKernel = sessionKernel;
        this.limit = config.limit;
        this.labeler = config.labeler;
    }

    /**
     * Get the current SessionKernel.
     */
    get currentSession(): SessionKernel {
        return this.sessionKernel;
    }

    /**
     * Get all snapshots, newest first.
     */
    get all(): readonly GraphSnapshot[] {
        return [...this.snapshots].sort((a, b) => b.version - a.version);
    }

    /**
     * Get the most recent snapshot, if any.
     */
    get latest(): GraphSnapshot | undefined {
        return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : undefined;
    }

    /**
     * Get the number of snapshots.
     */
    get size(): number {
        return this.snapshots.length;
    }

    /**
     * Capture a snapshot at the current version of the session kernel.
     * This should be called after the session kernel has been modified.
     */
    capture(): GraphSnapshot {
        const version = this.sessionKernel.version;
        const kernel = this.sessionKernel.state();
        const label = this.labeler ? this.labeler(version, kernel) : undefined;

        const snapshot: GraphSnapshot = { version, kernel, label };
        this.snapshots.push(snapshot);
        this.prune();

        return snapshot;
    }

    /**
     * Capture a snapshot at a specific version (for backfilling history).
     * The session kernel must have at least this version available.
     */
    captureAt(version: number): GraphSnapshot {
        if (version < 0 || version > this.sessionKernel.version) {
            throw new Error(`Version ${version} is outside 0..${this.sessionKernel.version}`);
        }

        const checkedOut = this.sessionKernel.checkout(version);
        const kernel = checkedOut.state();
        const label = this.labeler ? this.labeler(version, kernel) : undefined;

        const snapshot: GraphSnapshot = { version, kernel, label };
        this.snapshots.push(snapshot);
        this.snapshots.sort((a, b) => a.version - b.version);
        this.prune();

        return snapshot;
    }

    /**
     * Checkout a snapshot by version, returning a new SessionKernel at that version.
     * The returned SessionKernel is independent and can be further modified.
     */
    checkout(version: number): SessionKernel {
        return this.sessionKernel.checkout(version);
    }

    /**
     * Fork from a specific version, returning a new SessionKernel that shares
     * history up to that version but can diverge independently.
     */
    fork(version: number): SessionKernel {
        return this.sessionKernel.fork(version);
    }

    /**
     * Get a snapshot by version, if captured.
     */
    getSnapshot(version: number): GraphSnapshot | undefined {
        return this.snapshots.find((s) => s.version === version);
    }

    /**
     * Get the snapshot at or before the given version (for fallback to live scope).
     */
    getSnapshotAtOrBefore(version: number): GraphSnapshot | undefined {
        const candidates = this.snapshots.filter((s) => s.version <= version);
        if (candidates.length === 0) return undefined;
        return candidates.reduce((latest, s) => (s.version > latest.version ? s : latest));
    }

    /**
     * Replace the underlying SessionKernel (e.g., after a fork).
     * Existing snapshots are preserved but new captures will use the new session.
     */
    setSession(sessionKernel: SessionKernel): void {
        this.sessionKernel = sessionKernel;
    }

    /**
     * Clear all captured snapshots.
     */
    clear(): void {
        this.snapshots = [];
    }

    /**
     * Remove snapshots beyond the limit, keeping the newest.
     */
    private prune(): void {
        if (this.snapshots.length > this.limit) {
            this.snapshots = this.snapshots.slice(-this.limit);
        }
    }
}

/**
 * Create a GraphHistory from a SessionKernel with default configuration.
 */
export function createGraphHistory(
    sessionKernel: SessionKernel,
    limit: number,
    labeler?: (version: number, kernel: Kernel) => string,
): GraphHistory {
    return new GraphHistory(sessionKernel, { limit, labeler });
}