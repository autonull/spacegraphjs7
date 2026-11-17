import { RENDERER_STRATEGIES } from '@spacegraphjs/adapter';
import { CARD_FACINGS, DEPTH_MODES, EMPHASIS_CHANNELS, PROJECTIONS } from '@spacegraphjs/renderer';
import { EDGE_RUNG_IDS } from 'spacegraphjs/edges/ladder';
import { LAYOUT_REGISTRY } from 'spacegraphjs/layout-registry';
import { DEFAULT_RUNG_IDS } from 'spacegraphjs/representations';
import { SALIENCE_SIGNAL_IDS } from 'spacegraphjs/salience';
import { buildManifest } from './manifest';
import type { Manifest, ManifestEntry } from './types';

/** Bump on additive contract changes; see P6.4. */
export const LIBRARY_CONTRACT_VERSION = '1.1.0';

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
        {
            id: 'lod',
            values: DEFAULT_RUNG_IDS,
            source: 'representations/RepresentationLadder',
            default: 'card',
            reducedMotion: 'rung swaps use the scale-domain duration; reduced motion zeroes it',
        },
        {
            id: 'edgeLod',
            values: EDGE_RUNG_IDS,
            source: 'edges/EdgeLadder',
            default: 'arrow',
            reducedMotion: 'edge rung changes are non-animated thickness and label swaps',
        },
        {
            id: 'widgets',
            values: ['none', 'attached', 'pinned', 'max'],
            source: 'widgets/slots',
            default: 'none',
        },
        {
            id: 'salience',
            values: ['none', ...SALIENCE_SIGNAL_IDS, 'combined'],
            source: 'salience/SalienceSignal',
            default: 'none',
        },
        {
            id: 'emphasis',
            values: ['none', ...EMPHASIS_CHANNELS],
            source: 'renderer/EmphasisChannel',
            default: 'none',
            reducedMotion: 'channels are static except motion, which reduced disables',
        },
        {
            id: 'motion',
            values: ['full', 'reduced'],
            source: 'AnimationController/a11y',
            default: 'full',
            reducedMotion: 'reduced disables flights, tweens and springs',
        },
    ];
}

/** The library manifest: a complete, dependency-owned list of library capabilities. */
export function libraryManifest(): Manifest {
    return buildManifest(LIBRARY_CONTRACT_VERSION, libraryEntries());
}
