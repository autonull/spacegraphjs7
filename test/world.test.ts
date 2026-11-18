// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    SCENE_FEATURES,
    SENSORY_DESCRIPTORS,
    SENSORY_SEAMS,
    sceneFeatures,
    supportsSceneFeature,
    supportsSensory,
    worldPolicyFor,
    worldRepresentation,
} from 'spacegraphjs/world';

describe('world policy (P4.4-P4.5)', () => {
    it('enables scene features only when the axis asks for them', () => {
        expect(SCENE_FEATURES).toEqual(['fog', 'lights', 'parallax', 'trails', 'instancing']);
        expect(sceneFeatures('none')).toEqual([]);
        expect(sceneFeatures(undefined)).toEqual([]);
        expect(sceneFeatures('fog')).toEqual(['fog']);
        expect(sceneFeatures('all')).toEqual([...SCENE_FEATURES]);
        expect(sceneFeatures('unknown')).toEqual([]);
    });

    it('swaps instanced overview for DOM detail as an LOD policy', () => {
        expect(worldRepresentation('dot')).toBe('instanced');
        expect(worldRepresentation('glyph')).toBe('instanced');
        expect(worldRepresentation('card')).toBe('dom');
        expect(worldRepresentation(undefined)).toBe('dom');
    });

    it('composes a policy without choosing a default', () => {
        expect(worldPolicyFor('all', 'sound', 'dot')).toEqual({
            features: [...SCENE_FEATURES],
            representation: 'instanced',
            sensory: 'sound',
        });
        expect(worldPolicyFor(undefined, undefined, undefined).sensory).toBe('none');
    });

    it('gates scene features and leaves sensory seams unsupported without an adapter', () => {
        expect(supportsSceneFeature({ sceneFeatures: ['fog'] }, 'fog')).toBe(true);
        expect(supportsSceneFeature({ sceneFeatures: ['fog'] }, 'lights')).toBe(false);
        expect(supportsSensory({}, 'sound')).toBe(false);
        expect(supportsSensory({ sensory: ['sound'] }, 'sound')).toBe(true);
        expect(supportsSensory({}, 'none')).toBe(true);
        expect(SENSORY_DESCRIPTORS.map((descriptor) => descriptor.id)).toEqual([...SENSORY_SEAMS]);
    });
});
