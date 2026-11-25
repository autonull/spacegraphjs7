// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { documentHTML, parseDocument, safeDocumentHTML } from '../src/documents';

describe('parseDocument', () => {
    it('parses headings, lists, quotes, code, tables and images in order', () => {
        const source = [
            '# Title',
            'intro **bold**',
            '- one',
            '- two',
            '> noted',
            '```ts',
            'const x = 1 < 2;',
            '```',
            '| key | value |',
            '| --- | --- |',
            '| a | b |',
            '![plate](https://example.test/plate.png)',
        ].join('\n');
        const blocks = parseDocument(source);
        expect(blocks.map((block) => block.kind)).toEqual([
            'heading', 'paragraph', 'list', 'quote', 'code', 'table', 'image',
        ]);
        expect(documentHTML(blocks)).toContain('<h1>Title</h1>');
        expect(documentHTML(blocks)).toContain('<td>b</td>');
        expect(documentHTML(blocks)).toContain('<img src="https://example.test/plate.png"');
    });
});

describe('safeDocumentHTML', () => {
    it('escapes raw markup and drops unsafe links and images', () => {
        const html = safeDocumentHTML([
            '<script>alert(1)</script>',
            '[bad](javascript:alert) [ok](/docs)',
            '![bad](javascript:alert)',
        ].join('\n'));
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('javascript:');
        expect(html).toContain('href="/docs"');
        expect(html).toContain('class="sg-unsafe-image"');
    });
});
