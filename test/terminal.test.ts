// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    KIND_GLYPHS,
    lineGlyph,
    lineHTML,
    STATUS_GLYPHS,
    terminalCompare,
    terminalGaps,
    terminalGlyphs,
    terminalGrid,
    terminalLayout,
    terminalLineSize,
    terminalMoveLine,
    terminalOrder,
    terminalOverlays,
    terminalRange,
    terminalRangeIDs,
    terminalRangeText,
    terminalSpec,
    terminalVisible,
    terminalWindow,
    terminalWrap,
    type TerminalLine,
    type TerminalOverlay,
} from '../src/terminal';

const line = (id: string, text: string, parent?: string): TerminalLine => ({
    id,
    kind: 'user',
    status: 'complete',
    label: id.toUpperCase(),
    text,
    parent,
});

const overlay = (
    reveal: TerminalOverlay['reveal'],
    band?: string,
    lineID = 'a',
): TerminalOverlay => ({
    id: `o-${reveal}`,
    lineID,
    slot: 'gap',
    reveal,
    band,
    node: { id: `o-${reveal}`, type: 'HtmlNode' },
});

describe('terminal grid', () => {
    it('hard-wraps text by character count so spans stay addressable', () => {
        expect(terminalWrap('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
        expect(terminalWrap('', 4)).toEqual(['']);
        expect(terminalWrap('abc', 0)).toEqual(['abc']);
    });

    it('halves size per octave and clamps width to the grid', () => {
        const grid = terminalGrid();
        expect(terminalLineSize('abcd', grid)).toEqual([180, 28]);
        expect(terminalLineSize('abcd', grid, -1)).toEqual([90, 14]);
        expect(terminalLineSize('x'.repeat(200), grid)).toEqual([520, 76]);
    });
});

describe('terminalLayout', () => {
    it('places an append-only spine and attached context in halving octaves', () => {
        const layout = terminalLayout(
            [line('a', 'abcd'), line('c', 'abcd', 'a'), line('b', 'abcd'), line('d', 'abcd', 'c')],
            terminalGrid(),
            { spineStep: 40, contextStep: 20 },
        );
        expect(layout.spine).toEqual(['a', 'b']);
        expect(layout.placements.get('a')?.position[1]).toBe(0);
        expect(layout.placements.get('b')?.position[1]).toBe(-40);
        expect(layout.placements.get('c')?.octave).toBe(-1);
        expect(layout.placements.get('d')?.octave).toBe(-2);
        expect(layout.placements.get('d')?.size[0]).toBe(45);
    });
});

describe('terminalGaps', () => {
    it('shifts only lines after the anchor and accepts fractional line units', () => {
        const offsets = terminalGaps(['a', 'b', 'c'], [{ after: 'a', lines: 2.5 }], 16);
        expect([...offsets.values()]).toEqual([0, -40, -40]);
        expect(terminalGaps(['a', 'b'], [{ after: 'b', lines: 3 }], 16).get('b')).toBe(0);
    });
});

describe('terminalWindow', () => {
    const ids = Array.from({ length: 20 }, (_, index) => `l${index}`);
    const config = { size: 6, margin: 2, hysteresis: 1 };

    it('prefetches a margin around the focus', () => {
        expect(terminalWindow(ids, 'l3', config)).toEqual({ start: 'l0', end: 'l7' });
    });

    it('holds still inside the stable core and slides when the focus leaves it', () => {
        const first = terminalWindow(ids, 'l3', config);
        expect(terminalWindow(ids, 'l4', config, first)).toEqual(first);
        expect(terminalWindow(ids, 'l10', config, first)).toEqual({ start: 'l5', end: 'l14' });
    });

    it('returns an empty window for no ids and clamps at both ends', () => {
        expect(terminalWindow([], 'l0', config)).toEqual({ start: '', end: '' });
        expect(terminalWindow(ids, 'l0', config)).toEqual({ start: 'l0', end: 'l7' });
        expect(terminalWindow(ids, 'l19', config)).toEqual({ start: 'l14', end: 'l19' });
    });
});

describe('anchored ranges', () => {
    const lines = [line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')];
    const order = terminalOrder(lines);

    it('normalizes reversed anchors, then joins spans in linear order', () => {
        const range = terminalRange({ nodeID: 'c', offset: 3 }, { nodeID: 'a', offset: 1 }, order);
        expect(range.anchor).toEqual({ nodeID: 'a', offset: 1 });
        expect(terminalRangeIDs(range, order)).toEqual(['a', 'b', 'c']);
        expect(terminalRangeText(range, lines)).toBe('lpha\nbeta\ngam');
        expect(
            terminalRangeText(
                { anchor: { nodeID: 'b', offset: 1 }, focus: { nodeID: 'b', offset: 4 } },
                lines,
            ),
        ).toBe('eta');
    });

    it('ignores unknown ids and compares by order before offset', () => {
        expect(
            terminalRangeIDs(
                { anchor: { nodeID: 'missing', offset: 0 }, focus: { nodeID: 'a', offset: 0 } },
                order,
            ),
        ).toEqual([]);
        expect(terminalCompare(order, { nodeID: 'b', offset: 0 }, { nodeID: 'a', offset: 99 })).toBeGreaterThan(0);
    });

    it('moves a caret by line and resets its offset on arrival', () => {
        expect(terminalMoveLine({ nodeID: 'a', offset: 3 }, ['a', 'b', 'c'], 1)).toEqual({
            nodeID: 'b',
            offset: 0,
        });
        expect(terminalMoveLine({ nodeID: 'c', offset: 2 }, ['a', 'b', 'c'], 1)).toEqual({
            nodeID: 'c',
            offset: 2,
        });
    });
});

describe('glyph grammar', () => {
    it('uses single-width defaults and lets the host override a kind', () => {
        expect(STATUS_GLYPHS['pending']).toBe('…');
        expect(lineGlyph(line('a', 'x'))).toBe('@');
        expect(lineGlyph({ ...line('a', 'x'), kind: 'unknown' })).toBe('·');
        expect(lineGlyph(line('a', 'x'), terminalGlyphs({ kind: { user: 'U' } }))).toBe('U');
        expect(KIND_GLYPHS['tool']).toBe('⚙');
    });

    it('escapes text before it enters a node', () => {
        const html = lineHTML({ ...line('a', '<b>x</b>'), status: 'failed' });
        expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
        expect(html).not.toContain('<b>');
        expect(html).toContain('×');
    });
});

describe('overlay reveal', () => {
    it('applies always, hover and select policies', () => {
        expect(terminalVisible(overlay('always'))).toBe(true);
        expect(terminalVisible(overlay('hover'), { hovered: 'b' })).toBe(false);
        expect(terminalVisible(overlay('hover'), { hovered: 'a' })).toBe(true);
        expect(terminalVisible(overlay('select'), { selected: new Set(['a']) })).toBe(true);
        expect(terminalVisible(overlay('select'))).toBe(false);
    });

    it('reveals zoom overlays at or above the declared band', () => {
        expect(terminalVisible(overlay('zoom', 'card'), { band: 'dot' })).toBe(false);
        expect(terminalVisible(overlay('zoom', 'card'), { band: 'detail' })).toBe(true);
        expect(terminalVisible(overlay('zoom'), { band: 'dot' })).toBe(true);
        expect(terminalVisible(overlay('zoom', 'card'))).toBe(false);
        expect(terminalVisible(overlay('zoom', 'unknown'), { band: 'detail' })).toBe(false);
    });

    it('filters overlays by both policy and line visibility', () => {
        const lines = [line('a', 'x'), line('b', 'x'), line('c', 'x')];
        const visible = terminalOverlays(
            [overlay('always', undefined, 'b'), overlay('always', undefined, 'z')],
        );
        const { spec } = terminalSpec(lines, {
            window: { size: 1, margin: 0, hysteresis: 0 },
            focusID: 'b',
            overlays: visible,
        });
        expect(spec.nodes?.map((node) => node.id) ?? []).toEqual(['b', 'o-always']);
    });
});

describe('terminalSpec', () => {
    it('projects only the window, applies gap shifts and keeps spine edges', () => {
        const lines = [line('a', 'abcd'), line('b', 'abcd'), line('c', 'abcd')];
        const { spec, window } = terminalSpec(lines, {
            window: { size: 2, margin: 0, hysteresis: 0 },
            focusID: 'c',
            gaps: [{ after: 'a', lines: 2 }],
        });
        expect(window).toEqual({ start: 'b', end: 'c' });
        expect(spec.nodes?.map((node) => node.id)).toEqual(['b', 'c']);
        expect(spec.nodes?.[0]?.position?.[1]).toBe(-72);
        expect(spec.edges?.map((edge) => edge.id)).toEqual(['b->c']);
    });

    it('lets the host render a line instead of using the default markup', () => {
        const { spec } = terminalSpec([line('a', 'hello')], { render: (entry) => entry.text });
        expect(spec.nodes?.[0]?.data?.['html']).toBe('hello');
    });
});
