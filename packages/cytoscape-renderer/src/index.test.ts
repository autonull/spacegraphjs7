import { describe, expect, test } from 'vitest';
import { supports } from '@spacegraphjs/renderer';
import { rendererContractCases } from '../../renderer/test/fixtures';
import { CytoscapeRenderer } from './index';

describe('@spacegraphjs/cytoscape-renderer', () => {
    test('declares a 2D-only capability set and never claims 3D or a minimap', () => {
        const capabilities = new CytoscapeRenderer().capabilities;
        expect(supports(capabilities, '2d')).toBe(true);
        expect(supports(capabilities, '3d')).toBe(false);
        expect(supports(capabilities, 'domNodes')).toBe(true);
        expect(supports(capabilities, 'edgeLabels')).toBe(true);
        expect(supports(capabilities, 'minimap')).toBe(false);
        expect(capabilities.maxDomNodes).toBe(20);
        expect(capabilities.maxRecommendedNodes).toBe(1000);
    });

    test('declares an unbounded zoom range, so the host policy is the only limit', () => {
        // Cytoscape's zoom is a linear scale factor with no ceiling of its own (T6.20).
        const capabilities = new CytoscapeRenderer().capabilities;
        expect(capabilities.zoomRange?.min).toBe(0);
        expect(capabilities.zoomRange?.max).toBe(Number.POSITIVE_INFINITY);
    });

});
rendererContractCases(
    () => new CytoscapeRenderer(),
    (renderer) => renderer.setModel({ nodes: [], edges: [] }),
);
