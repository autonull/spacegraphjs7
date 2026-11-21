import { describe, expect, test } from 'vitest';
import { representationRung } from 'spacegraphjs/salience';
import { cardMarkup, portalGlyph, toAdapterModel } from '../src/adapter';
import { fixtureKernel } from '../src/fixture';
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
});
