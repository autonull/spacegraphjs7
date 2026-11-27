import { describe, expect, test } from 'vitest';
import {
    supports,
    supportsDepth,
    supportsEmphasis,
    supportsList,
    supportsQuery,
    supportedValues,
    type RendererCapabilities,
} from '@spacegraphjs/renderer';

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

    test('supports reports every advertised flag, including optional ones', () => {
        const full = capabilities({
            cardFacing: true,
            fitInsets: true,
            zoomRange: { min: 0.5, max: 4 },
            depths: ['flat'],
            emphasis: ['opacity'],
            motionVerbs: ['trace'],
            sceneFeatures: ['fog'],
            sensorySeams: ['sound'],
            widgetSlots: ['body'],
        });
        for (const flag of [
            'cardFacing', 'fitInsets', 'zoomRange', 'depth', 'emphasis',
            'motionVerb', 'sceneFeature', 'sensorySeam', 'widgets',
        ] as const) expect(supports(full, flag)).toBe(true);
        expect(supports(capabilities(), 'zoomRange')).toBe(false);
        expect(supports(capabilities(), 'cardFacing')).toBe(false);
        expect(supports(capabilities(), 'widgets')).toBe(false);
    });

    test('supportsQuery gates a value on its axis, never on renderer identity', () => {
        const renderer = capabilities({
            projections: ['2d', '3d'],
            depths: ['flat'],
            emphasis: ['opacity'],
            motionVerbs: ['trace'],
            sceneFeatures: ['fog'],
            sensorySeams: ['sound'],
        });
        expect(supportsQuery(renderer, { axis: 'projection', value: '3d' })).toBe(true);
        expect(supportsQuery(renderer, { axis: 'depth', value: 'flat' })).toBe(true);
        expect(supportsQuery(renderer, { axis: 'emphasis', value: 'opacity' })).toBe(true);
        expect(supportsQuery(renderer, { axis: 'motionVerb', value: 'trace' })).toBe(true);
        expect(supportsQuery(renderer, { axis: 'sceneFeature', value: 'fog' })).toBe(true);
        expect(supportsQuery(renderer, { axis: 'sensorySeam', value: 'sound' })).toBe(true);
        expect(supportsQuery(renderer, { axis: 'depth', value: 'orbit' })).toBe(false);
        expect(supportsQuery(renderer, { flag: 'domNodes' })).toBe(true);
        expect(supportsDepth(renderer, 'flat')).toBe(true);
        expect(supportsEmphasis(renderer, 'opacity')).toBe(true);
    });
});
