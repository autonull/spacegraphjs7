// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { HtmlNode } from '../src/nodes/HtmlNode';
import type { SpaceGraph } from '../src/SpaceGraph';
const sg = { options: {}, requestFrame: () => {} } as unknown as SpaceGraph;
describe('HtmlNode sizing', () => {
    it('honors per-node minimums so a host need not change the class default', () => {
        const node = new HtmlNode(sg, {
            id: 'line',
            type: 'HtmlNode',
            data: {
                html: 'line',
                useRawHtml: true,
                width: 180,
                height: 12,
                minWidth: 32,
                minHeight: 6,
            },
        });
        expect(node.size.width).toBe(180);
        expect(node.size.height).toBe(12);
        expect((node.data as Record<string, unknown>).minHeight).toBe(6);
        expect(HtmlNode.MIN_SIZE.height).toBe(40);
    });
    it('keeps the class default when a host supplies no minimum', () => {
        const node = new HtmlNode(sg, {
            id: 'card',
            type: 'HtmlNode',
            data: { width: 10, height: 10 },
        });
        expect(node.size.width).toBe(HtmlNode.MIN_SIZE.width);
        expect(node.size.height).toBe(HtmlNode.MIN_SIZE.height);
    });
});
