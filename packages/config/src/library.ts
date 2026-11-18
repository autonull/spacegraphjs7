import { RENDERER_STRATEGIES } from '@spacegraphjs/adapter';
import { CARD_FACINGS, DEPTH_MODES, EMPHASIS_CHANNELS, PROJECTIONS } from '@spacegraphjs/renderer';
import { DEPTH_AXES } from 'spacegraphjs/depth';
import { EDGE_RUNG_IDS } from 'spacegraphjs/edges/ladder';
import { LAYOUT_REGISTRY } from 'spacegraphjs/layout-registry';
import { CAMERA_VERBS, MOTION_VERBS } from 'spacegraphjs/motion';
import { DEFAULT_RUNG_IDS } from 'spacegraphjs/representations';
import { SALIENCE_SIGNAL_IDS } from 'spacegraphjs/salience';
import { SCENE_FEATURES, SENSORY_SEAMS } from 'spacegraphjs/world';
import { WIDGET_SLOTS } from 'spacegraphjs/widgets';
import { buildManifest } from './manifest';
import type { Manifest, ManifestEntry } from './types';

/** Bump on additive contract changes; see P6.4. */
export const LIBRARY_CONTRACT_VERSION = '1.4.0';

/** First contract version carrying each axis. See `docs/contract-versioning.md`. */
const MIN_CONTRACT_VERSIONS: Readonly<Record<string, string>> = {
    projection: '1.0.0',
    depth: '1.0.0',
    cardFacing: '1.0.0',
    layout: '1.0.0',
    rendererStrategy: '1.0.0',
    lod: '1.0.0',
    edgeLod: '1.0.0',
    motion: '1.0.0',
    salience: '1.1.0',
    emphasis: '1.1.0',
    widgets: '1.2.0',
    motionVerb: '1.3.0',
    cameraVerb: '1.3.0',
    depthAxis: '1.3.0',
    sceneFeature: '1.3.0',
    sensory: '1.3.0',
};

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
            values: ['none', ...WIDGET_SLOTS, 'max'],
            source: 'widgets/WIDGET_SLOTS',
            default: 'none',
            reducedMotion:
                'mount, unmount and fog follow the host transition; reduced motion zeroes it',
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
        {
            id: 'motionVerb',
            values: ['none', ...MOTION_VERBS],
            source: 'motion/MOTION_VERBS',
            default: 'none',
            reducedMotion: 'reduced motion emits only the final frame of every verb',
        },
        {
            id: 'cameraVerb',
            values: CAMERA_VERBS,
            source: 'motion/CAMERA_VERBS',
            default: 'fit',
            reducedMotion: 'reduced motion zeroes every flight duration',
        },
        {
            id: 'depthAxis',
            values: DEPTH_AXES,
            source: 'depth/DEPTH_AXES',
            default: 'none',
            reducedMotion: 'depth and fog are static; parallax is a host policy',
        },
        {
            id: 'sceneFeature',
            values: ['none', ...SCENE_FEATURES, 'all'],
            source: 'world/SCENE_FEATURES',
            default: 'none',
            reducedMotion: 'parallax and trails are disabled under reduced motion',
        },
        {
            id: 'sensory',
            values: SENSORY_SEAMS,
            source: 'world/SENSORY_SEAMS',
            default: 'none',
            capability: 'sensory-adapter',
        },
    ].map((entry) => ({ ...entry, minContractVersion: MIN_CONTRACT_VERSIONS[entry.id] }));
}

/** The library manifest: a complete, dependency-owned list of library capabilities. */
export function libraryManifest(): Manifest {
    return buildManifest(LIBRARY_CONTRACT_VERSION, libraryEntries());
}
