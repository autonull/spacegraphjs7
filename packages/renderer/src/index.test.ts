import { describe, expect, test } from 'bun:test';
import {
    supports,
    supportsMotionVerb,
    supportsSceneFeature,
    supportsSensorySeam,
    type RendererCapabilities,
} from './index';

const capabilities = (overrides: Partial<RendererCapabilities> = {}): RendererCapabilities => ({
    projections: ['2d'],
    domNodes: true,
    maxDomNodes: 40,
    edgeLabels: true,
    clusterNodes: true,
    minimap: false,
    maxRecommendedNodes: 300,
    ...overrides,
});

describe('@spacegraphjs/renderer contract', () => {
    test('supports resolves projection capabilities', () => {
        expect(supports(capabilities(), '2d')).toBe(true);
        expect(supports(capabilities(), '3d')).toBe(false);
        expect(supports(capabilities({ projections: ['2d', '3d'] }), '3d')).toBe(true);
    });

    test('supports resolves boolean capabilities', () => {
        expect(supports(capabilities(), 'domNodes')).toBe(true);
        expect(supports(capabilities(), 'edgeLabels')).toBe(true);
        expect(supports(capabilities(), 'clusterNodes')).toBe(true);
        expect(supports(capabilities(), 'minimap')).toBe(false);
    });

    test('supports treats capability fields as authoritative, not inferred from contract version', () => {
        expect(supports(capabilities({ domNodes: false }), 'domNodes')).toBe(false);
        expect(supports(capabilities({ minimap: true }), 'minimap')).toBe(true);
    });

    test('descriptor gates default to false when a renderer omits the field', () => {
        expect(supportsMotionVerb(capabilities(), 'flyTo')).toBe(false);
        expect(supportsSceneFeature(capabilities(), 'trails')).toBe(false);
        expect(supportsSensorySeam(capabilities(), 'webxr')).toBe(false);
    });

    test('descriptor gates read what a renderer advertises', () => {
        const advertised = capabilities({
            motionVerbs: ['flyTo', 'trace'],
            sceneFeatures: ['trails', 'fog'],
            sensorySeams: ['webxr'],
        });
        expect(supportsMotionVerb(advertised, 'flyTo')).toBe(true);
        expect(supportsMotionVerb(advertised, 'sweep')).toBe(false);
        expect(supportsSceneFeature(advertised, 'trails')).toBe(true);
        expect(supportsSceneFeature(advertised, 'lights')).toBe(false);
        expect(supportsSensorySeam(advertised, 'webxr')).toBe(true);
        expect(supportsSensorySeam(advertised, 'sound')).toBe(false);
    });
});
