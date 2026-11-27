// @vitest-environment node
import type { RenderModel } from '@spacegraphjs/renderer';
import { renderToSVG } from '@spacegraphjs/svg-renderer';
import { describe, expect, it } from 'vitest';

const model: RenderModel = {
    nodes: [
        { id: 'a', label: 'Visible Node', kind: 'node', position: [0, 0, 0] },
        { id: 'b', label: 'Hidden Node', kind: 'node', position: [100, 0, 0], visible: false },
    ],
    edges: [
        { id: 'shown', source: 'a', target: 'a', kind: 'reads' },
        { id: 'hidden', source: 'a', target: 'b', kind: 'reads' },
        { id: 'hidden-too', source: 'a', target: 'a', kind: 'reads', visible: false },
    ],
};

describe('renderToSVG', () => {
    it('omits hidden nodes and edges', () => {
        const svg = renderToSVG(model);
        expect(svg).toContain('Visible Node');
        expect(svg).not.toContain('Hidden Node');
        expect(svg.match(/<line/g)).toHaveLength(1);
    });
});
