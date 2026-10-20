// The second host is the library's adoption proof: a host with its own vocabulary that runs every
// generic module. These tests are the proof that it is real — that the host carries no OpenCode
// code and no framework, that every library surface has a runnable example, and that every example
// actually produces something.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME } from '@spacegraphjs/renderer';
import { renderCodeDiff } from 'spacegraphjs/overlays';
import { CAPABILITIES, GALLERY_MODULES } from '../../demo/second-host/gallery';
import { SecondHost } from '../../demo/second-host/host';
import type { BuildModel, BuildNode } from '../../demo/second-host/model';

const demoDir = resolve(__dirname, '../../demo/second-host');
const STATIC_IMPORT = /(?:^|\n)\s*import\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;

function hostSources(): { file: string; text: string }[] {
    return readdirSync(demoDir)
        .filter((entry) => entry.endsWith('.ts'))
        .map((entry) => ({
            file: entry,
            text: readFileSync(resolve(demoDir, entry), 'utf8'),
        }));
}

function importsOf(text: string): string[] {
    return [...text.matchAll(STATIC_IMPORT)].map((match) => match[1]!);
}

/** The library surfaces a second host is expected to be able to use. */
const EXPECTED_MODULES = [
    '@spacegraphjs/adapter',
    '@spacegraphjs/cytoscape-renderer',
    '@spacegraphjs/renderer',
    '@spacegraphjs/spacegraph-renderer',
    '@spacegraphjs/svg-renderer',
    'spacegraphjs/a11y',
    'spacegraphjs/control',
    'spacegraphjs/depth',
    'spacegraphjs/layout',
    'spacegraphjs/levels',
    'spacegraphjs/navigation',
    'spacegraphjs/overlays',
    'spacegraphjs/representations',
    'spacegraphjs/zoom',
];

describe('the second host', () => {
    it('carries no OpenCode module and no framework', () => {
        const forbidden = [
            '@opencode/',
            'opencode',
            'react',
            'react-dom',
            'solid-js',
            'vue',
            'preact',
            'svelte',
            '@angular/',
        ];

        for (const { file, text } of hostSources()) {
            for (const specifier of importsOf(text)) {
                for (const banned of forbidden) {
                    expect(specifier, `${file} imports ${specifier}`).not.toContain(banned);
                }
            }
        }
    });

    it('uses only the library surfaces it claims', () => {
        const specifiers = new Set(
            hostSources()
                .flatMap((source) => importsOf(source.text))
                .filter((specifier) => !specifier.startsWith('.')),
        );

        expect([...specifiers].sort()).toEqual(
            [
                '@spacegraphjs/adapter',
                '@spacegraphjs/cytoscape-renderer',
                '@spacegraphjs/renderer',
                '@spacegraphjs/spacegraph-renderer',
                '@spacegraphjs/svg-renderer',
                'spacegraphjs/a11y',
                'spacegraphjs/control',
                'spacegraphjs/depth',
                'spacegraphjs/layout',
                'spacegraphjs/levels',
                'spacegraphjs/navigation',
                'spacegraphjs/overlays',
                'spacegraphjs/representations',
                'spacegraphjs/zoom',
            ].sort(),
        );
    });

    it('has a gallery entry for every library surface', () => {
        expect([...GALLERY_MODULES].sort()).toEqual([...EXPECTED_MODULES].sort());
    });

    it('runs every capability against the real model and reports what it produced', () => {
        const host = new SecondHost();

        for (const capability of CAPABILITIES) {
            const lines = capability.run(host.context(DEFAULT_THEME));

            expect(lines.length, capability.id).toBeGreaterThan(0);
            for (const line of lines) expect(line.trim(), capability.id).not.toBe('');
        }
    });

    it('builds a render model the renderers can draw', () => {
        const host = new SecondHost();
        const model = host.renderModel();
        const ids = model.nodes.map((node) => node.id);

        expect(new Set(ids).size).toBe(ids.length);
        expect(model.nodes.length).toBeGreaterThan(0);

        for (const node of model.nodes) {
            expect(node.position).toHaveLength(3);
            for (const coordinate of node.position) expect(Number.isFinite(coordinate)).toBe(true);
        }

        for (const edge of model.edges) {
            expect(ids).toContain(edge.source);
            expect(ids).toContain(edge.target);
        }
    });

    it('escapes a hostile label before it reaches the markup', () => {
        const hostile = '<img src=x onerror="alert(1)">'
        const node: BuildNode = {
            id: 'hostile',
            kind: 'tool',
            label: hostile,
            summary: '<script>alert(1)</script>',
            status: 'failed',
            lane: 'test',
            stage: 'stage:verify',
            outcome: 'failed',
            size: [200, 64],
        }
        const model: BuildModel = {
            nodes: [node],
            edges: [],
            root: 'hostile',
            turns: [],
        }

        const renderModel = new SecondHost().renderModelOf(model);

        expect(renderModel.nodes[0]!.html).not.toContain('<img');
        expect(renderModel.nodes[0]!.html).not.toContain('<script>');
        expect(renderModel.nodes[0]!.html).toContain('&lt;img');
    });

    it('scopes the overlay to one neighbourhood', () => {
        const host = new SecondHost();
        const scope = host.scope('stage:verify');

        expect(scope.root?.id).toBe('stage:verify');
        expect(scope.nodes.map((node) => node.id)).toContain('test:failure');
        expect(scope.nodes.map((node) => node.id)).not.toContain('ship:publish');
    });

    it('renders the code diff as text, never as markup', () => {
        const container = document.createElement('div');

        renderCodeDiff(container, [
            {
                file: '<script>alert(1)</script>',
                patch: ['--- a/x', '+++ b/x', '+<img src=x onerror=alert(1)>'].join('\n'),
                additions: 1,
                deletions: 0,
                status: 'modified',
            },
        ])

        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('img')).toBeNull();
        expect(container.textContent).toContain('<script>alert(1)</script>');
    });
});
