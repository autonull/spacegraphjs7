import { describe, expect, it } from 'vitest';
import { buildReportHTML } from '../src/report';

const input = {
    title: 'Pi session <audit>',
    permalink: '#s=%7B%22focus%22%3A%22a%22%7D',
    json: '{"nodes":[]}',
    svg: '<svg><rect/></svg>',
    html: '<li onclick="bad()">a & b</li>',
    annotations: [{ id: 'note:1', target: 'a', body: '<script>alert(1)</script>' }],
};

describe('shareable report', () => {
    const report = buildReportHTML(input);

    it('embeds the permalink and geometry', () => {
        expect(report).toContain('href="#s=%7B%22focus%22%3A%22a%22%7D"');
        expect(report).toContain('<svg><rect/></svg>');
        expect(report).toContain('{&quot;nodes&quot;:[]}');
    });

    it('escapes host text and review notes', () => {
        expect(report).not.toContain('<script>');
        expect(report).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(report).not.toContain('onclick="bad()"');
        expect(report).toContain('&lt;li onclick=&quot;bad()&quot;&gt;a &amp; b&lt;/li&gt;');
        expect(report).toContain('data-target="a"');
    });
});
