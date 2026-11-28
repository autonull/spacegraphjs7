import { describe, expect, it } from 'vitest';
import {
    terminalGlyphs,
    terminalGrid,
    terminalLayout,
    terminalOrder,
    terminalSelect,
    type TerminalLine,
    type TerminalOverlay,
    type TerminalProjectionContext,
} from 'spacegraphjs/terminal';
import { consoleModel } from '../src/console-model';

const grid = terminalGrid();
const lines: readonly TerminalLine[] = [
    { id: 'a', kind: 'message', status: 'complete', label: 'A', text: 'alpha', role: 'user' },
    { id: 'b', kind: 'action', status: 'complete', label: 'B', text: 'beta' },
];

const context = (overlays: readonly TerminalOverlay[] = []): TerminalProjectionContext => ({
    lines,
    visible: lines,
    order: lines.map((line) => line.id),
    index: terminalOrder(lines),
    window: { start: 'a', end: 'b' },
    gaps: [],
    overlays,
    band: 'card',
    layout: terminalLayout(lines, grid),
});

const state = {
    grid,
    glyphs: terminalGlyphs(),
    lines,
    detailMode: 'inline' as const,
};

const overlay = (id: string, lineID: string, slot: TerminalOverlay['slot']): TerminalOverlay => ({
    id,
    lineID,
    slot,
    reveal: 'always',
});

describe('consoleModel', () => {
    it('projects visible lines and a prompt without inventing edges', () => {
        const model = consoleModel(context(), state);
        expect(model.nodes.map((node) => node.id)).toEqual(['a', 'b', 'terminal-prompt']);
        expect(model.edges).toEqual([]);
        expect(model.nodes[0]?.html).toContain('data-kind="message"');
        expect(model.nodes[0]?.html).toContain('data-selected="false"');
    });

    it('opens a gap after a marked line and marks selected lines', () => {
        const plain = consoleModel(context(), state);
        const gapped = consoleModel(context([overlay('gap-a', 'a', 'gap')]), {
            ...state,
            selection: { anchor: { nodeID: 'a', offset: 0 }, focus: { nodeID: 'a', offset: 1 } },
        });
        expect(gapped.nodes[1]!.position[1]).toBeLessThan(plain.nodes[1]!.position[1]);
        expect(gapped.nodes[0]?.html).toContain('data-selected="true"');
    });

    it('places gutter and detail overlays relative to their anchor line', () => {
        const detail = {
            ...overlay('detail-a', 'a', 'gap'),
            mode: 'popup' as const,
            node: {
                id: 'detail-a',
                type: 'HtmlNode',
                label: 'detail',
                data: { html: '<b>detail</b>', width: 360, height: 84 },
            },
        };
        const model = consoleModel(context([overlay('gutter-a', 'a', 'gutter'), detail]), state);
        const ids = model.nodes.map((node) => node.id);
        expect(ids).toContain('gutter-a');
        expect(ids).toContain('detail-a');
        expect(model.nodes.find((node) => node.id === 'detail-a')?.position[0]).toBeGreaterThan(
            model.nodes[0]!.position[0],
        );
    });

    it('projects selector output, highlight spans and presentation flags', () => {
        const selection = terminalSelect(lines, { search: 'ALPHA' });
        const model = consoleModel(
            {
                ...context(),
                selection,
                matches: selection.matches,
                presentation: { highlightMatches: true, lineNumbers: true, wrap: true },
            },
            state,
        );
        const node = model.nodes.find((entry) => entry.id === 'a');
        expect(node?.html).toContain('<mark>alpha</mark>');
        expect(node?.html).toContain('data-line-no="1"');
        expect(node?.html).toContain('sg-terminal-wrap');
        expect(model.nodes.map((entry) => entry.id)).toEqual(['a', 'b', 'terminal-prompt']);
    });

    it('emits visible line numbers, source stamps and wrapped rows', () => {
        const stamped = [{ ...lines[0]!, at: 1_700_000_000_000 }];
        const model = consoleModel(
            {
                ...context(),
                lines: stamped,
                visible: stamped,
                order: ['a'],
                index: terminalOrder(stamped),
                presentation: { lineNumbers: true, sourceStamp: true, wrap: true },
            },
            { ...state, lines: stamped },
        );
        const html = model.nodes[0]!.html;
        expect(html).toContain('<span class="tg-line-no" aria-hidden="true">1</span>');
        expect(html).toContain('<time class="tg-source" datetime="2023-11-14T22:13:20.000Z"');
        expect(html).toContain('data-source="2023-11-14T22:13:20.000Z"');
        expect(html).toContain('class="tg-row"');
    });

    it('renders far zoom bands as accessible glyphs with a stable data-lod', () => {
        const model = consoleModel(
            { ...context(), band: 'dot' },
            { ...state, lod: 'dot', presentation: { zoomLOD: true } },
        );
        const node = model.nodes.find((entry) => entry.id === 'a');
        expect(node?.html).toContain('data-lod="dot"');
        expect(node?.html).toContain('class="tg-glyph-only"');
        expect(node?.html).toContain('aria-label="alpha"');
        expect(node?.html).not.toContain('tg-text');
        expect(node?.label).toBe('A');
    });

    it('gates hover and zoom overlays by interaction and LOD state', () => {
        const withNode = (id: string, reveal: TerminalOverlay['reveal'], band?: string): TerminalOverlay => ({
            ...overlay(id, 'a', 'margin'),
            reveal,
            band,
            node: {
                id,
                type: 'HtmlNode',
                label: 'peek',
                data: { html: '<span>peek</span>', width: 100, height: 20 },
            } as TerminalOverlay['node'],
        });
        const overlays = [withNode('hover-a', 'hover'), withNode('chapter-a', 'zoom', 'card')];
        const contextWith = { ...context(), overlays, band: 'dot' };
        const hidden = consoleModel(contextWith, state);
        expect(hidden.nodes.map((node) => node.id)).not.toContain('hover-a');
        expect(hidden.nodes.map((node) => node.id)).not.toContain('chapter-a');

        const hovered = consoleModel(contextWith, { ...state, hovered: 'a' });
        expect(hovered.nodes.map((node) => node.id)).toContain('hover-a');
        expect(hovered.nodes.map((node) => node.id)).not.toContain('chapter-a');

        const zoomed = consoleModel(contextWith, {
            ...state,
            lod: 'card',
            presentation: { zoomLOD: true },
        });
        expect(zoomed.nodes.map((node) => node.id)).toContain('chapter-a');
        expect(zoomed.nodes.map((node) => node.id)).not.toContain('hover-a');
    });

    it('drops selector-hidden lines from the rendered projection', () => {
        const selection = terminalSelect(lines, { filter: (entry) => entry.id === 'b' });
        const model = consoleModel({ ...context(), selection }, state);
        expect(model.nodes.map((entry) => entry.id)).toEqual(['b', 'terminal-prompt']);
    });

    it('dims lines without matches while keeping the prompt and matched lines loud', () => {
        const selection = terminalSelect(lines, { search: 'ALPHA' });
        const model = consoleModel(
            {
                ...context(),
                selection,
                matches: selection.matches,
                presentation: { highlightMatches: true },
            },
            { ...state, dimNonMatches: true },
        );
        expect(model.nodes.find((node) => node.id === 'a')?.data?.['opacity']).toBe(1);
        expect(model.nodes.find((node) => node.id === 'b')?.data?.['opacity']).toBe(0.35);
        expect(model.nodes.find((node) => node.id === 'terminal-prompt')?.data?.['opacity']).toBe(1);
    });
});
