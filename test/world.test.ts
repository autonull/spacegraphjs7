// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import {
    SCENE_FEATURES,
    SENSORY_DESCRIPTORS,
    SENSORY_SEAMS,
    enabledSceneFeatures,
    registerSensory,
    sceneFeatures,
    sensoryAdapter,
    supportsSceneFeature,
    supportsSensory,
    worldPolicyFor,
    worldRepresentation,
    type SensoryAdapter,
} from 'spacegraphjs/world';

const disposers: (() => void)[] = [];
afterEach(() => {
    for (const dispose of disposers.splice(0)) dispose();
});

const soundAdapter = () => {
    const emitted: string[] = [];
    const adapter: SensoryAdapter = {
        id: 'sound',
        label: 'Test audio',
        emit: (type) => emitted.push(type),
    };
    return { adapter, emitted };
};

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

    it('gates scene features through the declared capability', () => {
        const capabilities = { sceneFeatures: ['fog', 'trails'] };
        expect(supportsSceneFeature(capabilities, 'fog')).toBe(true);
        expect(supportsSceneFeature(capabilities, 'lights')).toBe(false);
        expect(enabledSceneFeatures(capabilities, [...SCENE_FEATURES])).toEqual(['fog', 'trails']);
        expect(enabledSceneFeatures({}, [...SCENE_FEATURES])).toEqual([]);
    });

    it('leaves sensory seams unsupported until a host registers an adapter', () => {
        expect(supportsSensory({}, 'sound')).toBe(false);
        expect(supportsSensory({ sensory: ['sound'] }, 'sound')).toBe(false);
        expect(supportsSensory({}, 'none')).toBe(true);
        expect(SENSORY_DESCRIPTORS.map((descriptor) => descriptor.id)).toEqual([...SENSORY_SEAMS]);

        const { adapter, emitted } = soundAdapter();
        disposers.push(registerSensory(adapter));
        expect(supportsSensory({}, 'sound')).toBe(true);
        expect(supportsSensory({ sensory: ['haptics'] }, 'sound')).toBe(false);
        expect(sensoryAdapter('sound')).toBe(adapter);
        sensoryAdapter('sound')?.emit('reveal');
        expect(emitted).toEqual(['reveal']);
    });

    it('restores the unsupported default when a registration is disposed', () => {
        const dispose = registerSensory(soundAdapter().adapter);
        expect(supportsSensory({}, 'sound')).toBe(true);
        dispose();
        expect(supportsSensory({}, 'sound')).toBe(false);
        expect(sensoryAdapter('sound')).toBeUndefined();
    });
});
