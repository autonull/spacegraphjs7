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

/** The first contract version that carried a capability. */
export function minContractVersion(manifest: Manifest, axis: string): string | undefined {
    return manifest.entries.find((entry) => entry.id === axis)?.minContractVersion;
}

/** Lowest version a consumer must support to discover every capability in the manifest. */
export function contractFloor(manifest: Manifest): string {
    return manifest.entries.reduce(
        (floor, entry) =>
            compareVersions(entry.minContractVersion ?? floor, floor) > 0
                ? (entry.minContractVersion ?? floor)
                : floor,
        '0.0.0',
    );
}

function compareVersions(a: string, b: string): number {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let index = 0; index < 3; index++) {
        const difference = (left[index] ?? 0) - (right[index] ?? 0);
        if (difference !== 0) return difference;
    }
    return 0;
}
