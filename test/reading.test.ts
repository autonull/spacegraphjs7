// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readingHTML, readingOrder, type ReadingEdge, type ReadingNode } from '../src/reading';

const nodes: readonly ReadingNode[] = [
    { id: 'c', label: 'Third', text: 'third <fact>', meta: { role: 'assistant' } },
    { id: 'a', label: 'First', text: 'first' },
    { id: 'b', label: 'Second', text: 'second', meta: { tool: 'lookup()' } },
];
const edges: readonly ReadingEdge[] = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
];

describe('readingOrder', () => {
    it('follows recorded edges from roots and keeps every node once', () => {
        const sections = readingOrder(nodes, edges);
        expect(sections.map((section) => section.nodeID)).toEqual(['a', 'b', 'c']);
        expect(sections.map((section) => section.depth)).toEqual([0, 1, 2]);
        expect(new Set(sections.map((section) => section.id)).size).toBe(3);
    });

    it('places unreachable facts after the connected story in host order', () => {
        const sections = readingOrder(
            [...nodes, { id: 'd', label: 'Orphan', text: 'orphan' }],
            edges,
        );
        expect(sections.map((section) => section.nodeID)).toEqual(['a', 'b', 'c', 'd']);
        expect(sections.at(-1)?.depth).toBe(0);
    });
});

describe('readingHTML', () => {
    it('escapes committed text and exposes every section for graph backlinks', () => {
        const html = readingHTML(readingOrder(nodes, edges), { title: 'Transcript' });
        expect(html).toContain('<h1>Transcript</h1>');
        expect(html).toContain('third &lt;fact&gt;');
        expect(html).toContain('<dt>role</dt><dd>assistant</dd>');
        expect(html.match(/data-node-id="[abc]"/g)).toHaveLength(6);
        expect(html).toContain('<h3>Second</h3>');
    });

    it('accepts a host link for each backlink', () => {
        const html = readingHTML(readingOrder(nodes, []), {
            link: (id) => `/?focus=${encodeURIComponent(id)}`,
        });
        expect(html).toContain('href="/?focus=a"');
        expect(html).not.toContain('href="#reading-');
    });
});
