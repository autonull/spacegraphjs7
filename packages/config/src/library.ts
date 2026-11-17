import { RENDERER_STRATEGIES } from '@spacegraphjs/adapter';
import { CARD_FACINGS, DEPTH_MODES, PROJECTIONS } from '@spacegraphjs/renderer';
import { LAYOUT_REGISTRY } from 'spacegraphjs/layout-registry';
import { buildManifest } from './manifest';
import type { Manifest, ManifestEntry } from './types';

/** Bump on additive contract changes; see P6.4. */
export const LIBRARY_CONTRACT_VERSION = '1.0.0';

/** Every value owned by a library registry. Hosts append their own entries. */
export function libraryEntries(): ManifestEntry[] {
    return [
        { id: 'projection', values: PROJECTIONS, source: 'renderer/PROJECTIONS' },
        {
            id: 'depth',
            values: DEPTH_MODES,
            source: 'renderer/DEPTH_MODES',
            reducedMotion: 'fog and layering are static; parallax is disabled',
        },
        { id: 'cardFacing', values: CARD_FACINGS, source: 'renderer/CARD_FACINGS' },
        {
            id: 'layout',
            values: LAYOUT_REGISTRY.map((entry) => entry.id),
            source: 'core/LAYOUT_REGISTRY',
        },
        {
            id: 'rendererStrategy',
            values: RENDERER_STRATEGIES,
            source: 'adapter/RendererStrategy',
            reducedMotion: 'svg-preview has no motion',
        },
    ];
}

/** The library manifest: a complete, dependency-owned list of library capabilities. */
export function libraryManifest(): Manifest {
    return buildManifest(LIBRARY_CONTRACT_VERSION, libraryEntries());
}
