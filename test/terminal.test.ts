// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
    KIND_GLYPHS,
    lineGlyph,
    lineHTML,
    terminalLineHTML,
    terminalTokens,
    terminalFocusWeights,
    terminalDetailSize,
    terminalEdges,
    terminalFidelity,
    terminalFidelityChange,
    playTerminalFidelity,
    terminalGroup,
    terminalColumns,
    terminalLODFor,
    terminalPresentationFromKey,
    terminalPresentationKey,
    terminalGrow,
    mountTerminal,
    mountTerminalA11y,
    mountTerminalCamera,
    mountTerminalSink,
    mountTerminalPrompt,
    playTerminalReplay,
    STATUS_GLYPHS,
    TERMINAL_PALETTES,
    terminalAutoZoom,
    terminalBookmark,
    terminalChapters,
    terminalChapterTargets,
    terminalConsoleCommands,
    terminalLensFromKey,
    terminalLensIDs,
    terminalLensKey,
    terminalLensRect,
    terminalContextMenu,
    terminalDiff,
    terminalLink,
    terminalPalette,
    terminalReplaySteps,
    terminalPromptHTML,
    terminalPromptNode,
    terminalCompare,
    terminalDetailHTML,
    terminalExport,
    terminalFacets,
    terminalFacetExprs,
    terminalFacetMatch,
    terminalExcerpt,
    terminalMovePoint,
    terminalFlatten,
    terminalGaps,
    terminalIndexOfPoint,
    terminalPointAtIndex,
    terminalGlyphs,
    terminalOverlayGaps,
    terminalSlots,
    terminalGrid,
    terminalLayout,
    terminalLineSize,
    terminalMoveLine,
    terminalOrder,
    TERMINAL_PROFILES,
    terminalPlace,
    type TerminalGrid,
    terminalProfile,
    terminalRegions,
    terminalReadingLens,
    terminalRangeFromIndices,
    terminalOverlays,
    terminalRange,
    terminalRangeFromKey,
    terminalRangeIDs,
    terminalRangeKey,
    terminalDerived,
    terminalMatchFlags,
    terminalRangeText,
    terminalSearch,
    terminalSelect,
    terminalSnapshot,
    terminalSpec,
    terminalTextWidth,
    terminalVisible,
    terminalVisibleAt,
    terminalWindow,
    terminalWrap,
    terminalWrapRows,
    type TerminalGraph,
    type TerminalLensTarget,
    type TerminalSelector,
    type TerminalLine,
    type TerminalOverlay,
} from '../src/terminal';
import type { EdgeSpec, NodeSpec } from '../src/types';

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

    it('keeps character offsets and display widths across wrapped rows', () => {
        expect(terminalWrapRows('abcdefghij', 4)).toEqual([
            { text: 'abcd', start: 0, end: 4, width: 4 },
            { text: 'efgh', start: 4, end: 8, width: 4 },
            { text: 'ij', start: 8, end: 10, width: 2 },
        ]);
        expect(terminalWrapRows('', 4)).toEqual([{ text: '', start: 0, end: 0, width: 0 }]);
        const grid = terminalGrid();
        expect(terminalColumns(grid)).toBe(61);
        expect(terminalWrapRows('x'.repeat(200), terminalColumns(grid))).toHaveLength(4);
    });
});

describe('terminalLayout', () => {
    it('inherits octaves in the fixed-width console layout', () => {
        const entries = [line('a', 'a'), line('b', 'b', 'a')];
        const layout = terminalPlace(entries, terminalGrid(), { width: 200 });
        expect(layout.placements.get('b')?.octave).toBe(-1);
    });

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

    it('shares one placement contract between the lane and a fixed-width console', () => {
        const lines = [line('a', 'abcd'), line('b', 'efgh'), line('c', 'ijkl')];
        const grid = terminalGrid();
        const lane = terminalLayout(lines, grid, { spineStep: 40, contextStep: 20 });
        expect(terminalPlace(lines, grid, { spineStep: 40, contextStep: 20 })).toEqual(lane);

        const console = terminalPlace(lines, grid, {
            width: grid.maxWidth,
            rowGap: 4,
            trimGutter: true,
        });
        const height = Math.max(grid.lineHeight, terminalLineSize('abcd', grid)[1] - grid.gutter);
        expect(console.placements.get('b')?.position).toEqual([
            grid.maxWidth / 2,
            -(height + 4),
            0,
        ]);
        expect(console.placements.get('c')?.size).toEqual([grid.maxWidth, height]);
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

describe('multiple consoles', () => {
    it('diffs two projections by stable line ids', () => {
        expect(
            terminalDiff(
                [line('a', 'alpha'), line('b', 'beta'), line('c', 'old')],
                [line('b', 'beta'), line('c', 'new'), line('d', 'delta')],
            ),
        ).toEqual({ added: ['d'], removed: ['a'], changed: ['c'] });
    });

    it('copies selection and tail from the leading console', () => {
        const first = mountTerminal(graphDouble());
        const second = mountTerminal(graphDouble());
        first.append([line('a', 'alpha'), line('b', 'beta')]);
        second.append([line('a', 'alpha'), line('b', 'beta')]);
        const range = { anchor: { nodeID: 'a', offset: 1 }, focus: { nodeID: 'b', offset: 2 } };
        first.select(range);
        terminalLink([first, second]).sync();
        expect(second.selection()).toEqual(range);
        expect(second.tail()).toBe(first.tail());
        first.destroy();
        second.destroy();
    });
});

describe('detail cards', () => {
    it('escapes detail fields and renders them for any overlay slot', () => {
        const html = terminalDetailHTML({
            title: '<tool>',
            fields: [['kind', 'pi.tool-result'], ['status', 'complete']],
            text: 'lookup() & more',
        });
        expect(html).toContain('&lt;tool&gt;');
        expect(html).toContain('&amp; more');
        expect(html).toContain('tg-detail-field');
        expect(html).not.toContain('<tool>');
    });
});

describe('time axis', () => {
    const timed = [
        { ...line('a', 'first'), turn: 1, at: 10 },
        { ...line('b', 'second'), turn: 1, at: 20 },
        { ...line('c', 'third'), turn: 2, at: 30 },
        line('d', 'undated'),
    ];

    it('filters historical lines while keeping undated ones', () => {
        expect(terminalVisibleAt(timed, undefined)).toHaveLength(4);
        expect(terminalVisibleAt(timed, 20).map((entry) => entry.id)).toEqual(['a', 'b', 'd']);
    });

    it('groups turns into chapters with stable line anchors', () => {
        expect(terminalChapters(timed)).toEqual([
            { id: 'chapter-1', label: 'Turn 1', startID: 'a', endID: 'b', turn: 1, at: 10 },
            { id: 'chapter-2', label: 'Turn 2', startID: 'c', endID: 'c', turn: 2, at: 30 },
            { id: 'chapter-3', label: 'Lines 3', startID: 'd', endID: 'd', turn: undefined, at: undefined },
        ]);
    });

    it('starts chapters at user lines when turns are not recorded', () => {
        const untimed = [
            line('a', 'alpha'),
            { ...line('b', 'beta'), role: 'user' },
            line('c', 'gamma'),
            { ...line('d', 'delta'), role: 'user' },
        ];
        expect(terminalChapters(untimed).map((chapter) => chapter.startID)).toEqual(['a', 'b', 'd']);
        expect(terminalChapters(untimed).map((chapter) => chapter.label)).toEqual([
            'Lines 1', 'Turn 2', 'Turn 3',
        ]);
    });

    it('produces replay prefixes over committed lines', () => {
        const steps = terminalReplaySteps(timed);
        expect(steps.map((step) => step.length)).toEqual([1, 2, 3, 4]);
        expect(steps[2]?.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    });
});

describe('character spans', () => {
    const lines = [line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')];
    const flat = terminalFlatten(lines);

    it('maps global character indices to entry ids and local offsets', () => {
        expect(flat.text).toBe('alpha\nbeta\ngamma');
        expect(flat.spans.map((span) => [span.lineID, span.start, span.end])).toEqual([
            ['a', 0, 5],
            ['b', 6, 10],
            ['c', 11, 16],
        ]);
        expect(terminalPointAtIndex(flat, 0)).toEqual({ nodeID: 'a', offset: 0 });
        expect(terminalPointAtIndex(flat, 6)).toEqual({ nodeID: 'b', offset: 0 });
        expect(terminalPointAtIndex(flat, 8)).toEqual({ nodeID: 'b', offset: 2 });
        expect(terminalPointAtIndex(flat, 5)).toEqual({ nodeID: 'a', offset: 5 });
        expect(terminalPointAtIndex(flat, 99)).toEqual({ nodeID: 'c', offset: 5 });
    });

    it('maps points back to global indices and builds ranges from them', () => {
        expect(terminalIndexOfPoint(flat, { nodeID: 'c', offset: 2 })).toBe(13);
        expect(terminalIndexOfPoint(flat, { nodeID: 'missing', offset: 0 })).toBeUndefined();
        const range = terminalRangeFromIndices(flat, 1, 8);
        expect(range).toEqual({
            anchor: { nodeID: 'a', offset: 1 },
            focus: { nodeID: 'b', offset: 2 },
        });
        expect(terminalRangeText(range!, lines)).toBe(flat.text.slice(1, 8));
        expect(terminalPointAtIndex(terminalFlatten([]), 0)).toBeUndefined();
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

    it('round-trips a range key whose ids contain separators', () => {
        const range = terminalRange(
            { nodeID: 'd:1:message:2', offset: 4 },
            { nodeID: 'd:1:message:3', offset: 9 },
            order,
        );
        expect(terminalRangeKey(range)).toBe('d:1:message:2:4~d:1:message:3:9');
        expect(terminalRangeFromKey(terminalRangeKey(range))).toEqual(range);
        expect(terminalRangeFromKey('bad')).toBeUndefined();
        expect(terminalRangeFromKey('a:x~b:1')).toBeUndefined();
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

    it('moves a character point across lines and clamps at both ends', () => {
        const flat = terminalFlatten(lines);
        const at = (nodeID: string, offset: number) => ({ nodeID, offset });
        expect(terminalMovePoint(flat, at('a', 2), 1)).toEqual(at('a', 3));
        expect(terminalMovePoint(flat, at('a', 4), 1)).toEqual(at('a', 5));
        expect(terminalMovePoint(flat, at('a', 5), 1)).toEqual(at('b', 0));
        expect(terminalMovePoint(flat, at('b', 0), -1)).toEqual(at('a', 5));
        expect(terminalMovePoint(flat, at('a', 0), -1)).toEqual(at('a', 0));
        expect(terminalMovePoint(flat, at('c', 5), 1)).toEqual(at('c', 5));
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

    it('keeps only an accessible glyph at far zoom bands', () => {
        const entry = { ...line('a', '<b>x</b>'), status: 'failed' };
        const far = terminalLineHTML(entry, terminalGlyphs(), { band: 'dot' });
        expect(far).toContain('class="tg-glyph-only"');
        expect(far).toContain('aria-label="&lt;b&gt;x&lt;/b&gt;"');
        expect(far).not.toContain('tg-text');
        expect(far).not.toContain('<b>');
        expect(terminalLineHTML(entry, terminalGlyphs(), { band: 'glyph' })).toContain(
            'tg-glyph-label',
        );
        const short = terminalLineHTML(entry, terminalGlyphs(), { band: 'glyph', labelChars: 3 });
        expect(short).toContain('&lt;b&gt;…');
        expect(short).toContain('aria-label="&lt;b&gt;x&lt;/b&gt;"');
        expect(terminalLineHTML(entry, terminalGlyphs(), { band: 'card' })).toContain('tg-text');
        expect(terminalLineHTML(entry, terminalGlyphs())).toContain('tg-text');
        expect(
            terminalLineHTML(entry, terminalGlyphs(), {
                band: 'overview',
                ladder: ['overview', 'detail'],
            }),
        ).toContain('tg-glyph-only');
    });

    it('renders escaped reading chrome and composes marks with wrap rows', () => {
        const entry = { ...line('a', 'alpha beta'), at: 1_700_000_000_000 };
        const rows = terminalWrapRows(entry.text, 6);
        const html = terminalLineHTML(entry, terminalGlyphs(), {
            chrome: { lineNumber: 2, source: '<script>bad</script>', rows },
            matches: [[6, 10]],
        });
        expect(html).toContain('<span class="tg-line-no" aria-hidden="true">2</span>');
        expect(html).toContain('<time class="tg-source" datetime="&lt;script&gt;bad&lt;/script&gt;">');
        expect(html).toContain('<span class="tg-row">alpha </span>');
        expect(html).toContain('<span class="tg-row"><mark>beta</mark></span>');
        expect(html).not.toContain('<script>');
        const plain = terminalLineHTML(entry, terminalGlyphs());
        expect(plain).not.toContain('tg-row');
        expect(plain).not.toContain('tg-line-no');
        expect(plain).not.toContain('tg-source');
    });
});

describe('zoom fidelity ladder', () => {
    it('maps continuous zoom onto the terminal ladder', () => {
        expect(terminalLODFor(0)).toBe('dot');
        expect(terminalLODFor(0.28)).toBe('glyph');
        expect(terminalLODFor(0.5)).toBe('card');
        expect(terminalLODFor(1)).toBe('detail');
        expect(terminalLODFor(1, ['far', 'near'])).toBe('near');
        expect(terminalLODFor(0.5, undefined, { dot: 0.1, glyph: 0.2, detail: 0.4 })).toBe('detail');
    });
});

describe('elastic gaps and slots', () => {
    it('derives line-unit gaps and cumulative offsets from gap overlays', () => {
        const gaps = terminalOverlayGaps(
            [
                overlay('always', undefined, 'a'),
                overlay('always', undefined, 'a'),
                overlay('always', undefined, 'b'),
                { ...overlay('always', undefined, 'c'), slot: 'gutter' },
            ],
            2,
        );
        expect(gaps).toEqual([
            { after: 'a', lines: 4 },
            { after: 'b', lines: 2 },
        ]);
        expect([...terminalGaps(['a', 'b', 'c'], gaps, 16).values()]).toEqual([0, -64, -96]);
    });

    it('groups gutter slots by line in declaration order', () => {
        const slots = terminalSlots(
            [
                { ...overlay('always', undefined, 'a'), id: 'first', slot: 'gutter' },
                { ...overlay('always', undefined, 'b'), id: 'other', slot: 'gutter' },
                { ...overlay('always', undefined, 'a'), id: 'second', slot: 'gutter' },
                { ...overlay('always', undefined, 'a'), id: 'margin', slot: 'margin' },
            ],
            'gutter',
        );
        expect(slots.get('a')?.map((entry) => entry.id)).toEqual(['first', 'second']);
        expect(slots.get('b')?.map((entry) => entry.id)).toEqual(['other']);
        expect(slots.has('c')).toBe(false);
    });
});

describe('palettes', () => {
    it('names theme tokens rather than colours', () => {
        expect(TERMINAL_PALETTES.map((palette) => palette.id)).toEqual([
            'classic', 'amber', 'green', 'retro',
        ]);
        for (const palette of TERMINAL_PALETTES) {
            for (const token of Object.values(palette.tokens)) {
                expect(token.startsWith('--')).toBe(true);
                expect(token).not.toMatch(/#[0-9a-f]{3,8}|rgb\(/i);
            }
        }
    });

    it('uses a palette glyph set in the default line markup', () => {
        expect(terminalPalette('retro').glyphs.kind['user']).toBe('>');
        expect(terminalPalette('missing')).toBe(TERMINAL_PALETTES[0]);
        const graph = graphDouble();
        const terminal = mountTerminal(graph, { palette: 'retro' });
        terminal.append([line('a', 'alpha')]);
        const html = String(graph.nodes.get('a')?.data?.['html']);
        expect(html).toContain('&gt;');
        expect(html).not.toContain('@');
        terminal.destroy();
    });

    it('switches palettes at runtime', () => {
        const graph = graphDouble();
        const terminal = mountTerminal(graph);
        terminal.append([line('a', 'alpha')]);
        expect(terminal.palette()).toBe('classic');
        terminal.setPalette('retro');
        expect(terminal.palette()).toBe('retro');
        expect(String(graph.nodes.get('a')?.data?.['html'])).toContain('&gt;');
        terminal.destroy();
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

const graphDouble = (): TerminalGraph & {
    readonly nodes: Map<string, NodeSpec>;
    readonly edges: Map<string, EdgeSpec>;
    readonly shown: readonly (readonly [string, boolean])[];
    readonly selection: string | readonly string[] | null;
    readonly clicks: readonly ((id: string) => void)[];
    readonly bands: readonly ((band: string) => void)[];
} => {
    const nodes = new Map<string, NodeSpec>();
    const edges = new Map<string, EdgeSpec>();
    const shown: (readonly [string, boolean])[] = [];
    const clicks: ((id: string) => void)[] = [];
    const bands: ((band: string) => void)[] = [];
    let selection: string | readonly string[] | null = null;
    const drop = (list: ((value: string) => void)[], callback: (value: string) => void) => () => {
        const index = list.indexOf(callback);
        if (index >= 0) list.splice(index, 1);
    };
    return {
        nodes,
        edges,
        shown,
        clicks,
        bands,
        get selection() {
            return selection;
        },
        addNode: (spec) => {
            nodes.set(spec.id, spec);
            return spec;
        },
        addEdge: (spec) => {
            edges.set(spec.id, spec);
            return spec;
        },
        removeNode: (id) => {
            nodes.delete(id);
            [...edges.values()]
                .filter((edge) => edge.source === id || edge.target === id)
                .forEach((edge) => edges.delete(edge.id));
        },
        removeEdge: (id) => {
            edges.delete(id);
        },
        setPositions: () => undefined,
        show: (id, visible = true) => {
            shown.push([id, visible]);
            return undefined;
        },
        select: (target) => {
            selection = target;
            return undefined;
        },
        onNodeClick: (callback) => {
            clicks.push(callback);
            return drop(clicks, callback);
        },
        onZoomBand: (callback) => {
            bands.push(callback);
            return drop(bands, callback);
        },
    };
};

describe('mountTerminal', () => {
    it('projects lines into the graph and focuses the tail on append', () => {
        const graph = graphDouble();
        const terminal = mountTerminal(graph);
        terminal.append([line('a', 'alpha'), line('b', 'beta')]);
        expect([...graph.nodes.keys()]).toEqual(['a', 'b']);
        expect(graph.edges.has('a->b')).toBe(true);
        expect(graph.selection).toBe('b');
        terminal.destroy();
    });

    it('windows nodes, holds an explicit window and re-engages tail follow', () => {
        const graph = graphDouble();
        const terminal = mountTerminal(graph, {
            windowConfig: { size: 1, margin: 0, hysteresis: 0 },
        });
        terminal.append([line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')]);
        expect([...graph.nodes.keys()]).toEqual(['c']);
        terminal.setWindow('a', 'b');
        expect([...graph.nodes.keys()]).toEqual(['a', 'b']);
        terminal.followTail(true);
        expect([...graph.nodes.keys()]).toEqual(['c']);
        terminal.destroy();
    });

    it('copies a selected range and announces it', () => {
        const graph = graphDouble();
        const onCopy = vi.fn();
        const announce = vi.fn();
        const terminal = mountTerminal(graph, { onCopy, announce });
        terminal.append([line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')]);
        terminal.select({
            anchor: { nodeID: 'a', offset: 1 },
            focus: { nodeID: 'b', offset: 4 },
        });
        expect(terminal.copy()).toBe('lpha\nbeta');
        expect(onCopy).toHaveBeenCalledWith('lpha\nbeta');
        expect(announce).toHaveBeenCalled();
        expect(graph.selection).toEqual(['a', 'b']);
        terminal.destroy();
    });

    it('reprojects when the band changes and stops listening after destroy', () => {
        const graph = graphDouble();
        const bands: string[] = [];
        const terminal = mountTerminal(graph, {
            project: ({ band }) => ({ nodes: [{ id: band, type: 'HtmlNode' }], edges: [] }),
            onCamera: ({ band }) => bands.push(band),
        });
        terminal.append([line('a', 'alpha')]);
        expect([...graph.nodes.keys()]).toEqual(['dot']);
        graph.bands[0]?.('detail');
        expect([...graph.nodes.keys()]).toEqual(['detail']);
        expect(bands).toEqual(['dot', 'detail']);
        graph.clicks[0]?.('a');
        terminal.destroy();
        expect(graph.clicks).toHaveLength(0);
        expect(graph.bands).toHaveLength(0);
        expect(graph.nodes.size).toBe(0);
    });

    it('re-evaluates the host filter on refresh', () => {
        const graph = graphDouble();
        let hidden = 'b';
        const terminal = mountTerminal(graph, { filter: (entry) => entry.id !== hidden });
        terminal.append([line('a', 'alpha'), line('b', 'beta')]);
        hidden = 'a';
        terminal.refresh();
        expect(graph.shown.slice(-2)).toEqual([
            ['a', false],
            ['b', true],
        ]);
        terminal.destroy();
    });
});

describe('a11y navigation', () => {
    const containerWithLines = (): HTMLElement => {
        const container = document.createElement('div');
        ['a', 'b', 'c'].forEach((id) => {
            const node = document.createElement('div');
            node.dataset['nodeId'] = id;
            container.append(node);
        });
        document.body.append(container);
        return container;
    };

    it('decorates nodes and announces roving focus', async () => {
        const container = containerWithLines();
        const announce = vi.fn();
        const a11y = mountTerminalA11y(container, { announce });
        await Promise.resolve();
        const nodes = [...container.querySelectorAll<HTMLElement>('[data-node-id]')];
        expect(nodes.every((node) => node.tabIndex === 0 && node.getAttribute('role') === 'listitem')).toBe(
            true,
        );
        nodes[0]!.focus();
        nodes[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(nodes[1]).toHaveFocus();
        expect(announce).toHaveBeenCalledWith('Line 2 of 3');
        a11y.destroy();
        container.remove();
    });

    it('ignores editable targets and stops after destroy', async () => {
        const container = containerWithLines();
        const field = document.createElement('textarea');
        container.append(field);
        const onFocus = vi.fn();
        const a11y = mountTerminalA11y(container, { onFocus });
        await Promise.resolve();
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(onFocus).not.toHaveBeenCalled();
        a11y.destroy();
        const node = container.querySelector<HTMLElement>('[data-node-id="a"]')!;
        node.focus();
        node.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(onFocus).not.toHaveBeenCalled();
        container.remove();
    });
});

describe('camera following', () => {
    it('releases follow on wheel pan and restores it with End or the badge', () => {
        const container = document.createElement('div');
        document.body.append(container);
        const badge = document.createElement('button');
        const terminal = mountTerminal(graphDouble());
        terminal.append([line('a', 'alpha'), line('b', 'beta')]);
        const changes: boolean[] = [];
        const camera = mountTerminalCamera(container, terminal, { badge, onFollowChange: (v) => changes.push(v) });
        expect(terminal.following()).toBe(true);
        expect(badge.getAttribute('aria-pressed')).toBe('true');

        container.dispatchEvent(new WheelEvent('wheel', { deltaY: 30, bubbles: true }));
        expect(terminal.following()).toBe(false);
        expect(badge.textContent).toContain('free');

        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(terminal.following()).toBe(true);
        expect(badge.textContent).toBe('tail: follow');

        container.dispatchEvent(new WheelEvent('wheel', { deltaY: 30, bubbles: true }));
        badge.click();
        expect(terminal.following()).toBe(true);
        expect(changes).toEqual([true, false, true, false, true]);

        camera.destroy();
        container.dispatchEvent(new WheelEvent('wheel', { deltaY: 30, bubbles: true }));
        expect(terminal.following()).toBe(true);
        container.remove();
        terminal.destroy();
    });

    it('ignores wheel events from editable targets', () => {
        const container = document.createElement('div');
        const field = document.createElement('textarea');
        container.append(field);
        document.body.append(container);
        const terminal = mountTerminal(graphDouble());
        terminal.append([line('a', 'alpha')]);
        const camera = mountTerminalCamera(container, terminal);
        field.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
        expect(terminal.following()).toBe(true);
        camera.destroy();
        terminal.destroy();
        container.remove();
    });
});

describe('scene prompt', () => {
    it('renders an escaped textarea in a sized HtmlNode', () => {
        const node = terminalPromptNode([10, -20, 0], { placeholder: '<ask>' });
        expect(node.type).toBe('HtmlNode');
        expect(node.position).toEqual([10, -20, 0]);
        expect(node.data?.['html']).toContain('data-terminal-prompt');
        expect(node.data?.['html']).toContain('&lt;ask&gt;');
        expect(node.data?.['height']).toBe(44);
        expect(terminalPromptHTML()).toContain('tg-caret');
    });

    it('wires composer behaviour to a textarea that is already mounted', () => {
        const container = document.createElement('div');
        container.innerHTML = terminalPromptHTML();
        const onSubmit = vi.fn();
        const prompt = mountTerminalPrompt(container, { onSubmit, history: ['previous'] });
        const field = container.querySelector<HTMLTextAreaElement>('[data-terminal-prompt]')!;
        expect(prompt.composer()?.element).toBe(field);
        field.value = 'hello';
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(onSubmit).toHaveBeenCalledWith('hello');
        prompt.destroy();
        field.value = 'ignored';
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('attaches once the scene textarea appears and keeps history', async () => {
        const container = document.createElement('div');
        const onSubmit = vi.fn();
        const prompt = mountTerminalPrompt(container, { onSubmit, history: ['earlier'] });
        expect(prompt.composer()).toBeUndefined();
        container.innerHTML = terminalPromptHTML();
        await Promise.resolve();
        const field = container.querySelector<HTMLTextAreaElement>('[data-terminal-prompt]')!;
        expect(prompt.composer()?.element).toBe(field);
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(field.value).toBe('earlier');
        prompt.destroy();
    });
});

describe('range export', () => {
    const lines = [line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')];
    const range = {
        anchor: { nodeID: 'a', offset: 0 },
        focus: { nodeID: 'b', offset: 3 },
    };

    it('emits a Markdown excerpt of the addressed lines', () => {
        expect(terminalExport(lines, range, 'markdown')).toBe('- @ alpha `a`\n- @ beta `b`');
    });

    it('emits stable ids and turns as JSON, or the whole console without a range', () => {
        expect(JSON.parse(terminalExport(lines, range, 'json')).map((entry: { id: string }) => entry.id)).toEqual([
            'a',
            'b',
        ]);
        expect(terminalExport(lines, undefined, 'json')).toContain('"id":"c"');
    });

    it('trims boundary lines for an exact excerpt and exports committed metadata', () => {
        const exact = terminalExcerpt(lines, range, terminalOrder(lines), { exact: true });
        expect(exact.map((entry) => entry.text)).toEqual(['alpha', 'bet']);
        expect(terminalExcerpt(lines, range)).toHaveLength(2);
        const single = {
            anchor: { nodeID: 'b', offset: 1 },
            focus: { nodeID: 'b', offset: 4 },
        };
        expect(terminalExcerpt(lines, single, terminalOrder(lines), { exact: true })[0]?.text).toBe(
            'eta',
        );
        const exported = JSON.parse(
            terminalExport(lines, range, 'json', undefined, { exact: true }),
        ) as {
            id: string;
            text: string;
            start: number;
            end: number;
            role?: string;
            at?: number;
        }[];
        expect(exported[0]).toMatchObject({ id: 'a', text: 'alpha', start: 0, end: 5 });
        expect(exported[1]).toMatchObject({ id: 'b', text: 'bet', start: 6, end: 9 });
        const rich = [{ ...lines[0]!, role: 'user', at: 123 }];
        const full = JSON.parse(terminalExport(rich, undefined, 'json')) as {
            role?: string;
            at?: number;
            start: number;
        }[];
        expect(full[0]).toMatchObject({ role: 'user', at: 123, start: 0 });
    });
});

describe('cached indices', () => {
    it('supplies the cached order map and flattened text to hosts and copy', () => {
        const graph = graphDouble();
        let cached: ReadonlyMap<string, number> | undefined;
        const terminal = mountTerminal(graph, {
            project: ({ index }) => {
                cached = index;
                return { nodes: [], edges: [] };
            },
        });
        terminal.append([line('a', 'alpha'), line('b', 'beta')]);
        expect(cached?.get('b')).toBe(1);
        terminal.select({ anchor: { nodeID: 'a', offset: 0 }, focus: { nodeID: 'b', offset: 3 } });
        expect(terminal.copy()).toBe('alpha\nbet');
        expect(terminal.text()).toBe('alpha\nbeta');
        terminal.destroy();
    });
});

describe('shift selection', () => {
    it('extends the anchored range with Shift+Arrow and announces the span', () => {
        const container = document.createElement('div');
        ['a', 'b', 'c'].forEach((id) => {
            const node = document.createElement('div');
            node.dataset['nodeId'] = id;
            container.append(node);
        });
        document.body.append(container);
        const announce = vi.fn();
        const onSelect = vi.fn();
        let current: ReturnType<typeof terminalRangeFromKey> | undefined;
        const a11y = mountTerminalA11y(container, {
            announce,
            selection: () => current,
            onSelect: (next) => {
                current = next;
                onSelect(next);
            },
        });
        const nodes = [...container.querySelectorAll<HTMLElement>('[data-node-id]')];
        nodes[0]!.focus();
        nodes[0]!.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }),
        );
        expect(current).toEqual({
            anchor: { nodeID: 'a', offset: 0 },
            focus: { nodeID: 'b', offset: 0 },
        });
        nodes[1]!.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }),
        );
        expect(current?.focus).toEqual({ nodeID: 'c', offset: 0 });
        expect(current?.anchor).toEqual({ nodeID: 'a', offset: 0 });
        expect(announce).toHaveBeenLastCalledWith('Selected 3 lines');
        expect(onSelect).toHaveBeenCalledTimes(2);
        a11y.destroy();
        container.remove();
    });
});

describe('camera follow API', () => {
    it('lets a host re-engage follow through the badge path', () => {
        const container = document.createElement('div');
        document.body.append(container);
        const badge = document.createElement('button');
        const terminal = mountTerminal(graphDouble());
        terminal.append([line('a', 'alpha'), line('b', 'beta')]);
        const changes: boolean[] = [];
        const camera = mountTerminalCamera(container, terminal, {
            badge,
            onFollowChange: (value) => changes.push(value),
        });
        container.dispatchEvent(new WheelEvent('wheel', { deltaY: 30, bubbles: true }));
        expect(terminal.following()).toBe(false);
        camera.follow(true);
        expect(terminal.following()).toBe(true);
        expect(badge.textContent).toBe('tail: follow');
        expect(changes).toEqual([true, false, true]);
        camera.destroy();
        terminal.destroy();
        container.remove();
    });
});

describe('wide glyphs', () => {
    const widthOf = (character: string): number => (character.codePointAt(0)! > 0xffff ? 2 : 1);

    it('wraps by display width without splitting surrogate pairs', () => {
        expect(terminalTextWidth('a😀b', widthOf)).toBe(4);
        expect(terminalWrap('a😀b', 3, widthOf)).toEqual(['a😀', 'b']);
    });

    it('supports zero-width combining marks and keeps the default unit grid', () => {
        const combining = (character: string): number => (character === '\u0301' ? 0 : 1);
        expect(terminalWrap('e\u0301x', 2, combining)).toEqual(['e\u0301x']);
        expect(terminalWrap('abcd', 2)).toEqual(['ab', 'cd']);
        const grid = terminalGrid({ minWidth: 0, maxWidth: 1000 });
        expect(terminalLineSize('a😀b', grid, 0, widthOf)[0]).toBeGreaterThan(
            terminalLineSize('abc', grid, 0)[0],
        );
    });

    it('keeps row offsets in code units across surrogate pairs and combining marks', () => {
        expect(terminalWrapRows('a😀b', 3, widthOf)).toEqual([
            { text: 'a😀', start: 0, end: 3, width: 3 },
            { text: 'b', start: 3, end: 4, width: 1 },
        ]);
        const combining = (character: string): number => (character === '\u0301' ? 0 : 1);
        expect(terminalWrapRows('e\u0301x', 2, combining)).toEqual([
            { text: 'e\u0301x', start: 0, end: 3, width: 2 },
        ]);
    });
});

describe('window telemetry', () => {
    it('reports node diffs and window slides to the host', () => {
        const graph = graphDouble();
        const cameras: { readonly slides: number }[] = [];
        const terminal = mountTerminal(graph, {
            windowConfig: { size: 1, margin: 0, hysteresis: 0 },
            onCamera: ({ churn }) => cameras.push(churn),
        });
        terminal.append([line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')]);
        expect(terminal.churn().mounted).toBeGreaterThan(0);
        expect(terminal.churn().slides).toBe(cameras.at(-1)?.slides);
        const slides = terminal.churn().slides;
        terminal.setWindow('a', 'a');
        expect(terminal.churn().unmounted).toBeGreaterThan(0);
        expect(terminal.churn().slides).toBe(slides + 1);
        terminal.destroy();
    });
});

describe('replay animation', () => {
    const steps = () =>
        terminalReplaySteps([line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')]);

    it('reveals prefixes one step at a time', async () => {
        vi.useFakeTimers();
        const rendered: string[][] = [];
        const onStep = vi.fn();
        const handle = playTerminalReplay(
            steps(),
            (lines) => rendered.push(lines.map((entry) => entry.id)),
            { intervalMs: 10, onStep },
        );
        expect(rendered).toEqual([['a']]);
        vi.advanceTimersByTime(10);
        expect(rendered.at(-1)).toEqual(['a', 'b']);
        vi.advanceTimersByTime(10);
        expect(rendered.at(-1)).toEqual(['a', 'b', 'c']);
        expect(onStep).toHaveBeenCalledTimes(3);
        await handle.finished();
        vi.useRealTimers();
    });

    it('jumps to the final prefix under reduced motion and stops on cancel', async () => {
        vi.useFakeTimers();
        const rendered: string[][] = [];
        const reduced = playTerminalReplay(steps(), (lines) =>
            rendered.push(lines.map((entry) => entry.id)), { reducedMotion: true },
        );
        expect(rendered).toEqual([['a', 'b', 'c']]);
        await reduced.finished();

        const cancelled = playTerminalReplay(steps(), (lines) =>
            rendered.push(lines.map((entry) => entry.id)), { intervalMs: 10 });
        expect(rendered).toHaveLength(2);
        cancelled.cancel();
        vi.advanceTimersByTime(100);
        expect(rendered).toHaveLength(2);
        await cancelled.finished();
        vi.useRealTimers();
    });
});

describe('terminalSelect', () => {
    const sample = [
        line('a', 'alpha ERROR'),
        line('b', 'beta'),
        line('c', 'gamma error'),
        line('d', 'delta'),
    ];

    it('is an identity projection with no selector', () => {
        const selection = terminalSelect(sample);
        expect(selection.lines).toEqual(sample);
        expect(selection.matches).toEqual([]);
        expect(selection.hidden).toEqual([]);
    });

    it('composes window, filter, search and maxLines', () => {
        const selection = terminalSelect(sample, {
            filter: (entry) => entry.id !== 'd',
            search: 'error',
            rows: { start: 'a', end: 'c' },
            maxLines: 2,
        });
        expect(selection.lines.map((entry) => entry.id)).toEqual(['b', 'c']);
        expect(selection.matches).toEqual([{ lineID: 'c', start: 23, end: 28 }]);
        expect(selection.hidden.map((entry) => entry.id)).toEqual(['a', 'd']);
    });

    it('maps search matches to flattened global spans', () => {
        expect(terminalSelect(sample, { search: 'error' }).matches).toEqual([
            { lineID: 'a', start: 6, end: 11 },
            { lineID: 'c', start: 23, end: 28 },
        ]);
    });

    it('extracts matched lines in derived mode and highlights in place otherwise', () => {
        expect(
            terminalSelect(sample, { search: 'error', mode: 'derived' }).lines.map(
                (entry) => entry.id,
            ),
        ).toEqual(['a', 'c']);
        const live = terminalSelect(sample, { search: 'error' });
        expect(live.lines.map((entry) => entry.id)).toEqual(['a', 'b', 'c', 'd']);
        expect(lineHTML(live.lines[0]!, terminalGlyphs(), undefined, [[6, 11]])).toContain(
            'alpha <mark>ERROR</mark>',
        );
        expect(lineHTML(live.lines[0]!)).not.toContain('<mark>');
    });

    it('snapshots stay fixed as committed lines change', () => {
        const mutable: TerminalLine[] = [line('a', 'alpha'), line('b', 'beta')];
        const snapshot = terminalSnapshot(mutable, { maxLines: 2 });
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.lines)).toBe(true);
        expect(Object.isFrozen(snapshot.lines[0])).toBe(true);
        (mutable[0] as { text: string }).text = 'changed';
        mutable.push(line('c', 'gamma'));
        expect(snapshot.lines.map((entry) => entry.text)).toEqual(['alpha', 'beta']);
        expect(mutable).toHaveLength(3);
    });
});

describe('console command catalog', () => {
    it('carries every console verb with gates for unavailable actions', () => {
        const commands = terminalConsoleCommands({
            selection: false,
            lines: false,
            fork: false,
        });
        expect(commands.list().map((command) => command.id)).toEqual([
            'copy', 'export', 'search', 'filter', 'read', 'zoom',
            'pin.live', 'pin.snapshot',
            'pin.matches', 'profile', 'asOf', 'fork', 'why', 'monitor', 'lod', 'grow', 'embed',
            'autoZoom', 'regions',
            'read.lens',
            'lens.focus', 'bookmark', 'help',
        ]);
        expect(commands.get('copy')?.disabledReason).toBe('Select lines first');
        expect(commands.get('fork')?.disabledReason).toBe('Nothing to fork');
        expect(commands.get('search')?.disabledReason).toBeUndefined();
        expect(commands.run('copy')).toBe(false);
    });

    it('derives menu data from the same catalog and gates copy on a selection', () => {
        const commands = terminalConsoleCommands().list();
        expect(terminalContextMenu(undefined, commands).find((item) => item.id === 'copy')?.disabled)
            .toBe(true);
        const range = {
            anchor: { nodeID: 'a', offset: 0 },
            focus: { nodeID: 'a', offset: 1 },
        };
        const items = terminalContextMenu(range, commands);
        expect(items.find((item) => item.id === 'copy')?.disabled).toBe(false);
        expect(items.find((item) => item.id === 'pin.snapshot')?.label).toBe('pin snapshot');
    });
});

describe('terminalSearch', () => {
    const sample = [
        line('a', 'alpha ERROR'),
        line('b', 'beta error'),
        line('c', 'gamma Error'),
    ];

    it('is case-insensitive by default and exact when requested', () => {
        expect(terminalSearch(sample, 'error').map((match) => match.lineID)).toEqual([
            'a', 'b', 'c',
        ]);
        expect(terminalSearch(sample, 'error', { caseSensitive: true })).toEqual([
            { lineID: 'b', start: 17, end: 22 },
        ]);
    });

    it('supports regex spans and reports invalid patterns as no matches', () => {
        expect(terminalSearch(sample, 'e.r', { regex: true })).toEqual([
            { lineID: 'a', start: 6, end: 9 },
            { lineID: 'b', start: 17, end: 20 },
            { lineID: 'c', start: 29, end: 32 },
        ]);
        expect(terminalSearch(sample, '[', { regex: true })).toEqual([]);
    });

    it('restricts matches to an anchored scope', () => {
        const scope = {
            anchor: { nodeID: 'a', offset: 0 },
            focus: { nodeID: 'b', offset: 0 },
        };
        expect(terminalSearch(sample, 'error', { scope }).map((match) => match.lineID)).toEqual([
            'a', 'b',
        ]);
    });

    it('maps global spans to line-relative ranges and extracts a derived view', () => {
        const matches = terminalSearch(sample, 'error');
        expect(terminalMatchFlags(sample, matches).get('b')).toEqual([[5, 10]]);
        expect(terminalDerived(sample, { search: 'error' }).lines.map((entry) => entry.id)).toEqual([
            'a', 'b', 'c',
        ]);
    });
});

describe('lens targets and bookmarks', () => {
    const sample = [line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')];
    const layout = terminalLayout(sample, terminalGrid());

    it('round-trips every target kind through one key', () => {
        const targets: readonly TerminalLensTarget[] = [
            { kind: 'line', id: 'b' },
            { kind: 'column', id: 'b', offset: 2 },
            {
                kind: 'range',
                range: {
                    anchor: { nodeID: 'a', offset: 0 },
                    focus: { nodeID: 'b', offset: 1 },
                },
            },
            { kind: 'window', window: { start: 'a', end: 'b' } },
            { kind: 'selection', ids: ['a', 'c'] },
        ];
        targets.forEach((target) => expect(terminalLensFromKey(terminalLensKey(target))).toEqual(target));
        expect(terminalLensFromKey('unknown:x')).toBeUndefined();
    });

    it('resolves every target kind to its addressed line ids', () => {
        const ids = sample.map((line) => line.id);
        expect(terminalLensIDs({ kind: 'line', id: 'b' }, ids)).toEqual(['b']);
        expect(
            terminalLensIDs(
                { kind: 'window', window: { start: 'a', end: 'b' } },
                ids,
            ),
        ).toEqual(['a', 'b']);
        expect(
            terminalLensIDs(
                {
                    kind: 'range',
                    range: {
                        anchor: { nodeID: 'a', offset: 0 },
                        focus: { nodeID: 'b', offset: 0 },
                    },
                },
                ids,
            ),
        ).toEqual(['a', 'b']);
        expect(terminalLensIDs({ kind: 'selection', ids: ['a', 'c'] }, ids)).toEqual([
            'a', 'c',
        ]);
    });

    it('maps targets to bounding rectangles in placement space', () => {
        const rect = terminalLensRect(layout, { kind: 'line', id: 'b' }, sample);
        const placement = layout.placements.get('b')!;
        expect(rect?.width).toBe(placement.size[0]);
        const windowRect = terminalLensRect(
            layout,
            { kind: 'window', window: { start: 'a', end: 'b' } },
            sample,
        );
        expect(windowRect?.height).toBeGreaterThan(rect!.height);
    });

    it('clamps column offsets to the available columns', () => {
        const grid = terminalGrid();
        const placement = layout.placements.get('b')!;
        const left = rectFor('b', -4, grid)!;
        expect(left.x).toBe(placement.position[0] - placement.size[0] / 2);
        const right = rectFor('b', 999, grid)!;
        expect(right.x).toBeLessThanOrEqual(
            placement.position[0] - placement.size[0] / 2 + placement.size[0],
        );
    });

    function rectFor(id: string, offset: number, grid: TerminalGrid) {
        return terminalLensRect(layout, { kind: 'column', id, offset }, sample, grid);
    }

    it('round-trips a bookmark through the view-state codec', () => {
        const bookmark = { key: terminalBookmark.key(3), target: { kind: 'line' as const, id: 'c' } };
        expect(terminalBookmark.decode(terminalBookmark.encode(bookmark))).toEqual(bookmark);
        expect(terminalBookmark.key(12)).toBe('bm9');
        expect(terminalBookmark.key(Number.NaN)).toBe('bm0');
        expect(terminalBookmark.decode('not-a-bookmark')).toBeUndefined();
    });
});

describe('graphs grown from a line', () => {
    const nodes = [
        { id: 'a', label: 'Alpha', kind: 'message' },
        { id: 'b', label: 'Beta', kind: 'action' },
        { id: 'c', label: 'Gamma', kind: 'tool' },
        { id: 'd', label: 'Delta', kind: 'artifact' },
    ];
    const edges = [
        { source: 'a', target: 'b', kind: 'contains' },
        { source: 'b', target: 'c', kind: 'orders' },
        { source: 'c', target: 'd', kind: 'contains' },
    ];

    it('grows a bounded neighbourhood with placements and connectors', () => {
        const growth = terminalGrow('a', nodes, edges, { depth: 2, limit: 3 });
        expect(growth?.chips.map((chip) => chip.id)).toEqual(['b']);
        expect(growth?.chips[0]?.children.map((chip) => chip.id)).toEqual(['c']);
        expect(growth?.placements).toHaveLength(1);
        expect(growth?.connectors).toHaveLength(1);
        expect(growth?.connectors.every(({ x1, y1, x2, y2 }) =>
            [x1, y1, x2, y2].every((value) => value >= 0 && value <= 100),
        )).toBe(true);
    });

    it('returns nothing when no graph grows from the seed', () => {
        expect(terminalGrow('missing', nodes, edges)).toBeUndefined();
        expect(terminalGrow('e', [...nodes, { id: 'e', label: 'Empty', kind: 'state' }], edges)).toBeUndefined();
    });
});

describe('reading lens and profiles', () => {
    const sample = [line('a', 'alpha'), line('b', 'beta'), line('c', 'gamma')];

    it('maps quick-read scopes to safe reading nodes', () => {
        expect(terminalReadingLens(sample, {}, {}, 'current').map((node) => node.id)).toEqual([
            'c',
        ]);
        expect(
            terminalReadingLens(sample, { maxLines: 2 }, {}, 'last').map((node) => node.id),
        ).toEqual(['b', 'c']);
        expect(
            terminalReadingLens(sample, { search: 'beta' }, {}, 'filtered').map((node) => node.id),
        ).toEqual(['b']);
        expect(terminalReadingLens(sample, {}, { reflow: true }, 'all')[0]?.format).toBe('markdown');
        expect(terminalReadingLens(sample, {}, { lineNumbers: true }, 'all')[1]?.meta?.['line']).toBe(
            '2',
        );
    });

    it('exposes named profiles with one presentation contract', () => {
        expect(TERMINAL_PROFILES.map((profile) => profile.id)).toEqual([
            'logs', 'presentation', 'high-contrast', 'big-text', 'fractal', 'documents',
        ]);
        expect(terminalProfile('big-text').presentation.wrap).toBe(true);
        expect(terminalProfile('missing').id).toBe('logs');
    });
});

describe('continuous fidelity', () => {
    it('derives opacity and rhythm from scale importance without changing geometry', () => {
        expect(terminalFidelity(0, 'dot').opacity).toBeLessThan(terminalFidelity(1, 'detail').opacity);
        expect(terminalFidelity(1, 'detail').opacity).toBe(1);
        expect(terminalFidelity(1, 'detail').stagger).toBe(0);
        expect(terminalFidelity(0.5, 'card').stagger).toBeGreaterThan(0);
    });

    it('plays stable-id band swaps and snaps under reduced motion', () => {
        expect(terminalFidelityChange('card', 'card')).toBeUndefined();
        const change = terminalFidelityChange('dot', 'card', 0.2);
        expect(change).toEqual({ id: 'fidelity:card', from: 'dot', to: 'card', duration: 0.2 });
        const values: number[] = [];
        const playback = playTerminalFidelity(change, (value) => values.push(value));
        playback?.advance(0.1);
        expect(values.length).toBe(1);
        playback?.finish();
        expect(values.at(-1)).toBe(1);
        const snapped: number[] = [];
        expect(playTerminalFidelity(change, (value) => snapped.push(value), { reducedMotion: true })?.done).toBe(true);
        expect(snapped).toEqual([1]);
    });
});

describe('chapter portals', () => {
    it('maps chapters onto shareable window lens targets', () => {
        const entries = [
            { ...line('a', 'a'), turn: 1 },
            { ...line('b', 'b'), turn: 1 },
            { ...line('c', 'c'), turn: 2 },
        ];
        const chapters = terminalChapters(entries);
        expect(terminalChapterTargets(chapters)).toEqual(
            chapters.map((chapter) => ({
                kind: 'window',
                window: { start: chapter.startID, end: chapter.endID },
            })),
        );
    });
});

describe('structural console graph', () => {
    it('dedupes edges and drops endpoints outside the visible window', () => {
        const entries = [line('a', 'a'), line('b', 'b', 'a'), line('c', 'c')];
        const layout = terminalLayout(entries, terminalGrid());
        const edges = terminalEdges(entries, entries.slice(0, 2), layout, [
            {
                id: 'overlay-edge',
                lineID: 'b',
                slot: 'gap',
                reveal: 'always',
                edge: { id: 'a->b', source: 'a', target: 'b', type: 'CurvedEdge' },
            },
        ]);
        expect(edges.map((edge) => edge.id)).toEqual(['a->b']);
        expect(edges[0]?.source).toBe('a');
        expect(edges[0]?.target).toBe('b');
    });

    it('boxes the nodes addressed by a lens target', () => {
        const nodes = [
            { id: 'a', position: [0, 0, 0] as const, size: [100, 20, 1] as const },
            { id: 'b', position: [0, -20, 0] as const, size: [100, 20, 1] as const },
        ];
        const group = terminalGroup({ kind: 'selection', ids: ['a', 'b'] }, nodes);
        expect(group?.members).toEqual(['a', 'b']);
        expect(group?.position).toEqual([0, -10, 0]);
        expect(group?.size[0]).toBeGreaterThan(100);
        expect(group?.size[1]).toBeGreaterThan(40);
        expect(terminalGroup({ kind: 'line', id: 'missing' }, nodes)).toBeUndefined();
    });
});

describe('facets', () => {
    const entries: readonly TerminalLine[] = [
        { ...line('a', 'alpha'), kind: 'tool', status: 'failed', role: 'assistant', turn: 1, at: 1000 },
        { ...line('b', 'beta'), kind: 'tool', status: 'complete', role: 'assistant', turn: 1, at: 2000 },
        { ...line('c', 'gamma'), kind: 'user', status: 'complete', role: 'user', turn: 2 },
    ];

    it('counts committed fields as addressable tokens', () => {
        const counts = terminalFacets(entries);
        expect(counts.get('kind:tool')).toBe(2);
        expect(counts.get('status:failed')).toBe(1);
        expect(counts.get('role:assistant')).toBe(2);
        expect(counts.get('turn:1')).toBe(2);
        expect(counts.get('at:1000')).toBe(1);
        expect(counts.has('at:undefined')).toBe(false);
    });

    it('composes facets with OR in a key and AND across keys before search', () => {
        const exprs = terminalFacetExprs('kind:tool status:failed');
        expect(exprs).toEqual([
            ['kind', 'tool'],
            ['status', 'failed'],
        ]);
        expect(terminalFacetMatch(entries[0]!, exprs)).toBe(true);
        expect(terminalFacetMatch(entries[1]!, exprs)).toBe(false);
        expect(
            terminalSelect(entries, { facet: 'kind:tool status:failed' }).lines.map((entry) => entry.id),
        ).toEqual(['a']);
        expect(
            terminalSelect(entries, { facet: ['kind:tool', 'kind:user'] }).lines,
        ).toHaveLength(3);
        expect(
            terminalSelect(entries, { facet: 'kind:tool', search: 'beta', mode: 'derived' }).lines.map(
                (entry) => entry.id,
            ),
        ).toEqual(['b']);
        expect(terminalSelect(entries, { facet: 'unknown:x' }).lines).toHaveLength(3);
    });

    it('keeps search spans global when a facet or filter narrows the lines', () => {
        const all = [line('skip', 'ignore'), ...entries];
        const selection = terminalSelect(all, { facet: 'kind:tool', search: 'beta' });
        expect(selection.matches).toHaveLength(1);
        expect(selection.matches[0]?.lineID).toBe('b');
        expect(terminalMatchFlags(all, selection.matches).get('b')).toEqual([[0, 4]]);
        const filtered = terminalSelect(all, {
            filter: (entry) => entry.id !== 'skip',
            search: 'beta',
        });
        expect(terminalMatchFlags(all, filtered.matches).get('b')).toEqual([[0, 4]]);
    });
});

describe('addressable presentation', () => {
    it('round-trips canonical flags and rejects unknown keys', () => {
        expect(terminalPresentationKey({ lineNumbers: true, wrap: true })).toBe('wn');
        expect(terminalPresentationFromKey('wn')).toEqual({ wrap: true, lineNumbers: true });
        expect(terminalPresentationFromKey('')).toEqual({});
        expect(terminalPresentationFromKey(undefined)).toBeUndefined();
        expect(terminalPresentationFromKey('nw')).toBeUndefined();
        expect(terminalPresentationFromKey('q')).toBeUndefined();
        expect(terminalPresentationFromKey('tfm')).toEqual({
            inlineTokens: true,
            focusDimming: true,
            markdownDetail: true,
        });
    });
});

describe('structured text', () => {
    it('tokenizes inline grammar with source offsets and safe hrefs', () => {
        const text = 'use `npm run` and [docs](https://example.com) with **bold** and *soft*';
        expect(terminalTokens(text)).toEqual([
            { kind: 'code', start: 4, end: 13, text: 'npm run' },
            { kind: 'link', start: 18, end: 45, text: 'docs', href: 'https://example.com' },
            { kind: 'strong', start: 51, end: 59, text: 'bold' },
            { kind: 'em', start: 64, end: 70, text: 'soft' },
        ]);
    });

    it('rejects unsafe hrefs and composes token and match boundaries before escaping', () => {
        const text = '[bad](javascript:alert(1)) [on](https://ok/?a=1&b=2)';
        expect(terminalTokens(text).map((token) => token.href)).toEqual([undefined, 'https://ok/?a=1&b=2']);
        const html = terminalLineHTML(line('a', '`x<y>` tail'), terminalGlyphs(), {
            tokens: terminalTokens('`x<y>` tail'),
            matches: [[0, 7]],
        });
        expect(html).toContain('<mark><code>x&lt;y&gt;</code></mark>');
        expect(html).not.toContain('<y>');
        const unsafe = terminalLineHTML(line('b', '[bad](javascript:alert(1))'), terminalGlyphs(), {
            tokens: terminalTokens('[bad](javascript:alert(1))'),
        });
        expect(unsafe).toContain('bad');
        expect(unsafe).not.toContain('href=');
        expect(unsafe).not.toContain('javascript:');
    });

    it('weights focus, selection and matches without mutating line order', () => {
        const entries = ['a', 'b', 'c', 'd'].map((id) => line(id, id));
        const weights = terminalFocusWeights(entries, 'b', new Set(['d']), new Set(['c']));
        expect(weights.get('b')).toBe(1);
        expect(weights.get('a')).toBe(0.75);
        expect(weights.get('c')).toBe(1);
        expect(weights.get('d')).toBe(1);
        expect(terminalFocusWeights(entries, undefined).get('a')).toBe(1);
    });

    it('sizes markdown details from parsed blocks and keeps text cards compact', () => {
        const detail = {
            title: '<b>note</b>',
            fields: [['kind', 'tool']] as const,
            text: '# Heading\n\n- one\n- two',
        };
        expect(terminalDetailSize(detail, terminalGrid(), 'text', 'inline')).toEqual([520, 30]);
        expect(terminalDetailSize(detail, terminalGrid(), 'text')).toEqual([360, 84]);
        const long = { ...detail, text: Array.from({ length: 8 }, (_, i) => `# H${i}`).join('\n\n') };
        expect(terminalDetailSize(long, terminalGrid(), 'markdown')[1]).toBeGreaterThan(84);
        const html = terminalDetailHTML(detail, { format: 'markdown' });
        expect(html).toContain('&lt;b&gt;note&lt;/b&gt;');
        expect(html).toContain('<h1>Heading</h1>');
        expect(html).not.toContain('<b>note</b>');
    });
});

describe('regions and dirty projection', () => {
    const regional = [
        { ...line('a', 'alpha'), kind: 'user', turn: 1, role: 'user' },
        { ...line('b', 'beta'), kind: 'user', turn: 1, role: 'user' },
        { ...line('c', 'gamma'), kind: 'tool', turn: 2, role: 'assistant' },
        { ...line('d', 'delta'), kind: 'tool', turn: 2, role: 'assistant' },
    ];
    const layout = terminalLayout(regional, terminalGrid());

    it('infers regions from kind and turn runs', () => {
        expect(terminalRegions(regional, layout).map((region) => region.lines)).toEqual([
            ['a', 'b'],
            ['c', 'd'],
        ]);
    });

    it('splits regions on role changes and layout distance', () => {
        const same = ['a', 'b', 'c'].map((id, index) => ({
            ...line(id, ['alpha', 'beta', 'gamma'][index]!),
            kind: 'tool',
            turn: 1,
            role: 'assistant',
        }));
        expect(terminalRegions(same, terminalLayout(same)).map((region) => region.lines)).toEqual([
            ['a', 'b', 'c'],
        ]);
        const sparse = terminalPlace(same, terminalGrid(), {
            width: terminalGrid().maxWidth,
            rowGap: 200,
        });
        expect(terminalRegions(same, sparse).map((region) => region.lines)).toEqual([
            ['a'], ['b'], ['c'],
        ]);
        const roles = same.map((entry, index) =>
            index === 2 ? { ...entry, role: 'user' } : entry,
        );
        expect(terminalRegions(roles, terminalLayout(roles)).map((region) => region.lines)).toEqual([
            ['a', 'b'], ['c'],
        ]);
    });

    it('ranks an auto-zoom window near the tail and keeps context', () => {
        const zoom = terminalAutoZoom(regional, terminalRegions(regional, layout), {
            context: 1,
        });
        expect(zoom?.region.lines).toEqual(['c', 'd']);
        expect(zoom?.target.kind).toBe('window');
    });

    it('ignores auto-zoom regions whose ids are no longer in the window', () => {
        const stale = {
            id: 'stale', label: 'stale', kind: 'tool', startID: 'gone', endID: 'gone', lines: ['gone'],
        };
        expect(terminalAutoZoom(regional, [stale])).toBeUndefined();
    });

    it('skips sink.render when controller state has not changed', () => {
        const sink = {
            render: vi.fn(),
            show: () => undefined,
            select: () => undefined,
            onNodeClick: () => () => undefined,
            onZoomBand: () => () => undefined,
        };
        const terminal = mountTerminalSink(sink);
        terminal.setLines([line('a', 'alpha')]);
        expect(sink.render).toHaveBeenCalledTimes(1);
        terminal.focusLine('missing');
        expect(sink.render).toHaveBeenCalledTimes(1);
        terminal.refresh();
        expect(sink.render).toHaveBeenCalledTimes(2);
        terminal.destroy();
    });
});

describe('selector invariants (fixed seed)', () => {
    it('never invents ids or drops committed lines across seeded selectors', () => {
        let seed = 42;
        const next = (): number =>
            ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
        for (let round = 0; round < 24; round++) {
            const count = 1 + Math.floor(next() * 8);
            const lines = Array.from({ length: count }, (_, index) =>
                line(`l${index}`, `text ${index} ERROR`),
            );
            const selector: TerminalSelector = {
                filter: next() > 0.5 ? (entry) => entry.id !== 'l0' : undefined,
                facet: next() > 0.5 ? (next() > 0.5 ? 'kind:user' : 'status:complete') : undefined,
                search: next() > 0.5 ? 'error' : undefined,
                maxLines: 1 + Math.floor(next() * count),
                follow: next() > 0.5,
            };
            const selection = terminalSelect(lines, selector);
            const ids = new Set(lines.map((entry) => entry.id));
            expect(selection.lines.every((entry) => ids.has(entry.id))).toBe(true);
            expect(selection.hidden.every((entry) => ids.has(entry.id))).toBe(true);
            expect(new Set([...selection.lines, ...selection.hidden]).size).toBe(count);
            expect(selection.matches.every((match) => ids.has(match.lineID))).toBe(true);
            if (selector.facet)
                expect(
                    selection.lines.every((entry) =>
                        terminalFacetMatch(entry, terminalFacetExprs(selector.facet!)),
                    ),
                ).toBe(true);
        }
    });
});
