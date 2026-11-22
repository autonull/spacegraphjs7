import { describe, expect, test } from 'vitest';
import { representationRung } from 'spacegraphjs/salience';
import {
    cardMarkup,
    composedCardMarkup,
    focusCardMarkup,
    portalGlyph,
    portalPreview,
    registerCardTemplate,
    toAdapterModel,
} from '../src/adapter';
import { innerTree } from '../src/inner';
import { fixtureKernel } from '../src/fixture';
import { labelFontPx } from '../src/policy/host';
import { agentScopes } from '../src/scopes';
import { agentDomain } from '@spacegraphjs/agent';

const view = agentDomain.build(fixtureKernel());
const model = toAdapterModel(view);
const node = model.nodes[0];
const context = { count: 0, dimmed: false };

describe('representation ladder', () => {
    test('activity promotes overview and poor legibility demotes detail', () => {
        expect(representationRung({ level: 'overview', activity: 0.9, legibility: 0.9 })).toBe('execution');
        expect(representationRung({ level: 'overview', activity: 0.2, legibility: 0.9 })).toBe('overview');
        expect(representationRung({ level: 'detail', activity: 0, legibility: 0.4 })).toBe('execution');
        expect(representationRung({ level: 'detail', activity: 0, legibility: 0.8 })).toBe('detail');
    });

    test('each rung emits its own legible markup', () => {
        const overview = cardMarkup(node, 'overview', context);
        const execution = cardMarkup(node, 'execution', context);
        const detail = cardMarkup(node, 'detail', context);
        expect(overview).toContain('data-rung="overview"');
        expect(execution).toContain('data-rung="execution"');
        expect(execution).toContain('<i ');
        expect(detail).toContain('data-rung="detail"');
        expect(detail.length).toBeGreaterThan(overview.length);
    });

    test('label typography compensates for zoom scale and fits the node', () => {
        const zoomedOut = labelFontPx(14, 0.3, 320, 8);
        expect(zoomedOut).toBeGreaterThanOrEqual(14 / 0.3);
        expect(labelFontPx(14, 3, 320, 8)).toBeLessThan(zoomedOut);
        expect(labelFontPx(14, 3, 320, 8)).toBeGreaterThanOrEqual(14 / 3);
        for (const length of [6, 8, 9, 16]) {
            expect(length * 0.55 * labelFontPx(14, 0.3, 320, length)).toBeLessThanOrEqual(
                320 * 0.84 + 1,
            );
        }
        expect(cardMarkup(node, 'overview', context, 0, false, 48)).toContain(
            'font-size:calc(48px * var(--pi-label-scale, 1))',
        );
    });

    test('composites two neighbouring rungs without changing node identity', () => {
        const html = composedCardMarkup(
            node,
            [
                { rung: 'overview', opacity: 0.35 },
                { rung: 'execution', opacity: 0.65 },
            ],
            context,
        );
        expect(html).toContain('data-rungs="overview+execution"');
        expect(html).toContain('data-layer="overview"');
        expect(html).toContain('data-layer="execution"');
        expect(html).toContain('opacity:0.350');
        expect(html).toContain('opacity:0.650');
        expect(html.match(/data-rung=/g)).toHaveLength(2);
    });

    test('falls back to one rung outside a blend', () => {
        const html = composedCardMarkup(node, [{ rung: 'detail', opacity: 1 }], context);
        expect(html).toContain('data-rung="detail"');
        expect(html).not.toContain('data-layer=');
    });

    test('escapes host text at every rung', () => {
        const hostile = { ...node, label: '<img src=x onerror=alert(1)>', summary: '</div><b>x</b>' };
        for (const rung of ['overview', 'execution', 'detail'] as const) {
            const html = cardMarkup(hostile, rung, context);
            expect(html).not.toContain('<img');
            expect(html).not.toContain('<b>');
            expect(html).toContain('&lt;img');
        }
    });

    test('a portal keeps a stable glyph and identity at every rung', () => {
        const [portalId, scope] = [...agentScopes(view).portalByNode][0]!;
        const portal = model.nodes.find((candidate) => candidate.id === portalId)!;
        for (const rung of ['overview', 'execution', 'detail'] as const) {
            const html = cardMarkup({ ...portal, scope }, rung, context);
            expect(html).toContain(`data-portal="${scope}"`);
            expect(html).toContain(portalGlyph(scope));
        }
        expect(portalGlyph(scope)).toBe(portalGlyph(scope));
        expect(cardMarkup(node, 'detail', context)).not.toContain('data-portal=');
    });

    test('a portal preview is derived from child scopes and bounded to four glyphs', () => {
        const specs = [
            { id: 'child', nodes: [{ kind: 'action' }, { scope: 'deep' }, { kind: 'file' }, { kind: 'tool' }, { kind: 'unit' }] },
        ];
        const preview = portalPreview('child', specs);
        expect(preview).toHaveLength(4);
        expect(preview).toContain(portalGlyph('deep'));
        expect(portalPreview('missing', specs)).toBe('');
    });

    test('a host can register a card template by kind', () => {
        const kind = 'template-test-kind';
        registerCardTemplate(kind, (card) => `<div data-custom="${card.kind}"></div>`);
        expect(cardMarkup({ ...node, kind }, 'overview', context)).toContain('data-custom="template-test-kind"');
        expect(cardMarkup(node, 'overview', context)).toContain('data-rung="overview"');
    });

    test('every layout renders the inner topology as directed edges with ports', () => {
        const chips = innerTree('a', [{ id: 'a', label: 'A', kind: 'run' }, { id: 'b', label: 'B', kind: 'unit' }], [{ source: 'a', target: 'b' }], 1);
        for (const layout of ['radial', 'lane', 'grid', 'row', 'column'] as const) {
            const lens = focusCardMarkup(node, chips, layout);
            expect(lens).toContain('class="focus-connectors"');
            expect(lens).toContain('<line');
            expect(lens).toContain('id="sg-chip-arrow"');
            expect(lens.match(/class="focus-port"/g)).toHaveLength(chips.length * 2);
        }
    });
});
