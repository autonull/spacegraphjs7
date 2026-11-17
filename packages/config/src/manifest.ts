import { ConfigSpace } from './space';
import type { Manifest, ManifestEntry } from './types';

/** Collect registry contributions into one discoverable list. */
export function buildManifest(
    contractVersion: string,
    entries: readonly ManifestEntry[],
): Manifest {
    return { contractVersion, entries: [...entries] };
}

/** The config space described by a manifest — the only bridge P0.1 needs to P0.2. */
export function manifestSpace(manifest: Manifest): ConfigSpace {
    return new ConfigSpace(manifest.entries.map((entry) => ({ ...entry })));
}

/** Axis ids present in a manifest; used by the coverage gate. */
export function manifestIds(manifest: Manifest): ReadonlySet<string> {
    return new Set(manifest.entries.map((entry) => entry.id));
}
