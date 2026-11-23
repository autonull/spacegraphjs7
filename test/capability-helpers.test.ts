import { describe, expect, test } from 'vitest';
import { supportsList, supportedValues, type RendererCapabilities } from '@spacegraphjs/renderer';

const capabilities = (overrides: Partial<RendererCapabilities> = {}): RendererCapabilities => ({
    projections: ['2d'],
    depths: [],
    domNodes: true,
    maxDomNodes: 40,
    edgeLabels: true,
    clusterNodes: true,
    minimap: false,
    maxRecommendedNodes: 300,
    ...overrides,
});

describe('generic capability helpers', () => {
    test('supportsList never assumes an omitted descriptor', () => {
        expect(supportsList(capabilities().motionVerbs, 'flyTo')).toBe(false);
        expect(supportsList(['flyTo', 'trace'], 'trace')).toBe(true);
        expect(supportsList(['flyTo'], 'sweep')).toBe(false);
    });

    test('supportedValues returns the advertised subset in candidate order', () => {
        const advertised = capabilities({
            motionVerbs: ['trace', 'flyTo'],
            sceneFeatures: ['fog'],
        });
        expect(supportedValues(advertised.motionVerbs, ['flyTo', 'sweep', 'trace'])).toEqual([
            'flyTo',
            'trace',
        ]);
        expect(supportedValues(advertised.sceneFeatures, ['fog', 'trails'])).toEqual(['fog']);
        expect(supportedValues(undefined, ['fog'])).toEqual([]);
    });
});
