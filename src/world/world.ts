// P4.4-P4.5. The world is a set of optional, capability-gated scene features driven by one LOD policy.
// Sensory channels are descriptors only: an adapter is a host decision and a dependent may supply none.

import { DEFAULT_RUNG_IDS } from '../representations/ladder';

export const SCENE_FEATURES = ['fog', 'lights', 'parallax', 'trails', 'instancing'] as const;
export type SceneFeature = (typeof SCENE_FEATURES)[number];

export const SENSORY_SEAMS = ['none', 'sound', 'haptics', 'webxr'] as const;
export type SensorySeam = (typeof SENSORY_SEAMS)[number];

export interface SensoryDescriptor {
    readonly id: SensorySeam;
    readonly label: string;
    readonly note: string;
}

export const SENSORY_DESCRIPTORS: readonly SensoryDescriptor[] = [
    { id: 'none', label: 'None', note: 'No sensory channel is requested' },
    { id: 'sound', label: 'Sound', note: 'Host-supplied audio adapter required' },
    { id: 'haptics', label: 'Haptics', note: 'Host-supplied vibration adapter required' },
    {
        id: 'webxr',
        label: 'WebXR',
        note: 'Host-supplied XR session required; no headset is assumed',
    },
];

export type WorldRepresentation = 'instanced' | 'dom';

export interface WorldPolicy {
    readonly features: readonly SceneFeature[];
    readonly representation: WorldRepresentation;
    readonly sensory: SensorySeam;
}

export interface WorldCapabilities {
    readonly sceneFeatures?: readonly string[];
    readonly sensory?: readonly string[];
}

/** `none` enables no feature; `all` enables every declared feature; anything else names one. */
export function sceneFeatures(value: string | undefined): readonly SceneFeature[] {
    if (value === 'all') return SCENE_FEATURES;
    if (value === 'none' || value === undefined) return [];
    return SCENE_FEATURES.includes(value as SceneFeature) ? [value as SceneFeature] : [];
}

/** Overview rungs are instanced; detail rungs are DOM cards. The swap is a policy, not a new LOD state. */
export function worldRepresentation(lod: string | undefined): WorldRepresentation {
    const index = DEFAULT_RUNG_IDS.indexOf(lod as (typeof DEFAULT_RUNG_IDS)[number]);
    return index >= 0 && index < 2 ? 'instanced' : 'dom';
}

export function worldPolicyFor(
    feature: string | undefined,
    sensory: string | undefined,
    lod: string | undefined,
): WorldPolicy {
    return {
        features: sceneFeatures(feature),
        representation: worldRepresentation(lod),
        sensory: (SENSORY_SEAMS.includes(sensory as SensorySeam) ? sensory : 'none') as SensorySeam,
    };
}

export function supportsSceneFeature(
    capabilities: WorldCapabilities,
    feature: SceneFeature,
): boolean {
    return capabilities.sceneFeatures?.includes(feature) ?? false;
}

/** A sensory seam is reported unsupported until a host registers an adapter for it. */
export function supportsSensory(capabilities: WorldCapabilities, seam: SensorySeam): boolean {
    if (seam === 'none') return true;
    return capabilities.sensory?.includes(seam) ?? false;
}
