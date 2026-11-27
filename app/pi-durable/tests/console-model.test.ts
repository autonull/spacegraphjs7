import { describe, expect, it } from 'vitest';
import {
    terminalGlyphs,
    terminalGrid,
    terminalLayout,
    terminalOrder,
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
});
