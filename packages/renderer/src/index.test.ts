import { describe, expect, test } from 'vitest';
import {
    DEFAULT_THEME,
    ModelRenderer,
    escapeHtml,
    escapeXml,
    supports,
    supportsMotionVerb,
    supportsSceneFeature,
    supportsSensorySeam,
    type RenderModel,
    type RendererCapabilities,
    type RenderTheme,
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

describe('markup escaping', () => {
    test('escapes the five special characters', () => {
        expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    });

    test('uses the entity a context expects for apostrophes', () => {
        expect(escapeHtml("'", '&#039;')).toBe('&#039;');
        expect(escapeXml("'")).toBe('&apos;');
        expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
    });
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

describe('ModelRenderer.setPositions', () => {
    class Probe extends ModelRenderer {
        calls: string[] = [];

        get snapshot(): RenderModel | null {
            return this.getModel();
        }

        protected getTheme(): RenderTheme {
            return DEFAULT_THEME;
        }

        protected setThemeInternal(): void {}

        protected applyModel(): void {
            this.calls.push('model');
        }

        protected override applyPositions(): void {
            this.calls.push('positions');
        }
    }

    test('moves stored nodes through the positions-only path', () => {
        const renderer = new Probe();
        renderer.setModel({
            nodes: [{ id: 'a', kind: 'card', label: 'A', position: [0, 0, 0] }],
            edges: [],
        });
        renderer.calls.length = 0;
        renderer.setPositions({ a: [1, 2, 3] });
        expect(renderer.calls).toEqual(['positions']);
        expect(renderer.snapshot?.nodes[0]?.position).toEqual([1, 2, 3]);
    });

    test('is a no-op before a model exists', () => {
        const renderer = new Probe();
        expect(() => renderer.setPositions({ a: [1, 2, 3] })).not.toThrow();
        expect(renderer.calls).toEqual([]);
    });

    test('exposes the current model to hosts', () => {
        const renderer = new Probe();
        expect(renderer.getModel()).toBeNull();
        const model: RenderModel = {
            nodes: [{ id: 'a', kind: 'card', label: 'A', position: [0, 0, 0] }],
            edges: [],
        };
        renderer.setModel(model);
        expect(renderer.getModel()).toBe(model);
    });
});
