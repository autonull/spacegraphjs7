import { describe, expect, test } from 'vitest';
import { supports, supportsEmphasis } from '@spacegraphjs/renderer';
import { WIDGET_SLOTS } from 'spacegraphjs/widgets';
import { rendererContractCases } from '../../renderer/test/fixtures';
import { SpaceGraphRenderer } from './index';

describe('@spacegraphjs/spacegraph-renderer', () => {
    test('declares its capabilities without lying about minimap support', () => {
        const capabilities = new SpaceGraphRenderer().capabilities;
        expect(supports(capabilities, '2d')).toBe(true);
        expect(supports(capabilities, '3d')).toBe(true);
        expect(supports(capabilities, 'domNodes')).toBe(true);
        expect(supports(capabilities, 'edgeLabels')).toBe(true);
        expect(supports(capabilities, 'minimap')).toBe(false);
        expect(capabilities.maxDomNodes).toBe(80);
    });

    test('declares the emphasis channels and widget slots the core honours', () => {
        const capabilities = new SpaceGraphRenderer().capabilities;
        expect(supports(capabilities, 'widgets')).toBe(true);
        expect(capabilities.widgetSlots).toEqual([...WIDGET_SLOTS]);
        expect(supportsEmphasis(capabilities, 'size')).toBe(true);
        expect(supportsEmphasis(capabilities, 'opacity')).toBe(true);
        expect(supportsEmphasis(capabilities, 'edgeThickness')).toBe(true);
        expect(supportsEmphasis(capabilities, 'glow')).toBe(false);
    });

    test('declares the zoom range its normalized zoom cannot leave', () => {
        // The core's zoom is normalized over the fitted band: 0 is the farthest and 1 the closest. A
        // host that zooms past 1 asks for a zoom the renderer cannot deliver (T6.20).
        const capabilities = new SpaceGraphRenderer().capabilities;
        expect(capabilities.zoomRange).toEqual({ min: 0, max: 1 });
    });

});
rendererContractCases(() => new SpaceGraphRenderer());
