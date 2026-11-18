import type { ConfigSpace } from './space';
import { ConfigState } from './state';
import type { ConfigValue } from './types';

/** An opt-in bundle of axis values. Presets are examples, never defaults. */
export interface Preset {
    readonly id: string;
    readonly label: string;
    readonly values: Readonly<Record<string, ConfigValue>>;
    readonly note?: string;
}

export const EXAMPLE_PRESETS: readonly Preset[] = [
    {
        id: 'max-detail',
        label: 'Max detail',
        values: { lod: 'detail', edgeLod: 'ribbon', cardFacing: 'camera' },
    },
    { id: 'max-widgets', label: 'Max widgets', values: { widgets: 'max' } },
    { id: 'full-depth', label: 'Full depth', values: { depth: 'orbit', cardFacing: 'camera' } },
    { id: 'zero-motion', label: 'Zero motion', values: { motion: 'reduced' } },
    {
        id: 'loud-nodes',
        label: 'Loud nodes',
        values: { salience: 'combined', emphasis: 'size' },
        note: 'Example, not default: size carries the composed salience score',
    },
    {
        id: 'orbit-world',
        label: 'Orbit world',
        values: {
            depth: 'orbit',
            depthAxis: 'hierarchy',
            sceneFeature: 'all',
            cameraVerb: 'orbit',
            motionVerb: 'sweep',
        },
        note: 'Example, not default: depth and motion stay host policies',
    },
];

/** Apply a preset on top of a state. Unknown axes are ignored, so deleting a preset cannot break the space. */
export function applyPreset(
    space: ConfigSpace,
    preset: Preset,
    base: ConfigState = ConfigState.from(space),
): ConfigState {
    return ConfigState.from(space, { ...base.toRecord(), ...preset.values });
}
