// @vitest-environment jsdom
// D3: one model-level suite for all three renderers. The two bindings consume the same MODEL and
// THEME fixtures in their own specs; `test:conformance` runs those files together with this one.
import { describe, expect, it } from 'vitest';
import {
    supports,
    type GraphRenderer,
    type RenderModel,
} from '@spacegraphjs/renderer';
import { CytoscapeRenderer } from '@spacegraphjs/cytoscape-renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { SvgRenderer, renderToSVG } from '@spacegraphjs/svg-renderer';
import { MODEL, THEME } from '../packages/renderer/test/fixtures';

type Backend = {
    readonly name: string;
    readonly make: () => GraphRenderer;
    readonly domNodes: boolean;
    readonly perspective: boolean;
    readonly maxZoom: number;
};

const backends: readonly Backend[] = [
    { name: 'SpaceGraph', make: () => new SpaceGraphRenderer(), domNodes: true, perspective: true, maxZoom: 1 },
    { name: 'Cytoscape', make: () => new CytoscapeRenderer(), domNodes: true, perspective: false, maxZoom: 10 },
    { name: 'SVG', make: () => new SvgRenderer(), domNodes: false, perspective: false, maxZoom: 1 },
];

const stored = (renderer: GraphRenderer): RenderModel =>
    (renderer as unknown as { model: RenderModel }).model;

describe.each(backends)('$name model conformance', (backend) => {
    it('preserves node and edge identity from one model', () => {
        const renderer = backend.make();
        renderer.setTheme(THEME);
        renderer.setModel(MODEL);

        expect(stored(renderer).nodes.map((node) => node.id)).toEqual(
            MODEL.nodes.map((node) => node.id),
        );
        expect(stored(renderer).edges.map((edge) => edge.id)).toEqual(
            MODEL.edges.map((edge) => edge.id),
        );
    });

    it('advertises only the capabilities the matrix declares', () => {
        const capabilities = backend.make().capabilities;
        expect(supports(capabilities, 'domNodes')).toBe(backend.domNodes);
        expect(supports(capabilities, '3d')).toBe(backend.perspective);
        expect(capabilities.zoomRange?.max ?? Infinity).toBe(backend.maxZoom);
    });
});

describe('static SVG draw', () => {
    it('renders both nodes and the edge from the shared model without a DOM', () => {
        const svg = renderToSVG(MODEL);
        for (const node of MODEL.nodes) expect(svg).toContain(node.label);
        expect(svg).toContain('sgs-arrow');
        expect(svg).not.toContain('width="NaN"');
    });
});
