// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
    KIND_GLYPHS,
    lineGlyph,
    lineHTML,
    mountTerminal,
    mountTerminalPrompt,
    STATUS_GLYPHS,
    terminalPromptHTML,
    terminalPromptNode,
    terminalCompare,
    terminalGaps,
    terminalGlyphs,
    terminalOverlayGaps,
    terminalSlots,
    terminalGrid,
    terminalLayout,
    terminalLineSize,
    terminalMoveLine,
    terminalOrder,
    terminalOverlays,
    terminalRange,
    terminalRangeFromKey,
    terminalRangeIDs,
    terminalRangeKey,
    terminalRangeText,
    terminalSpec,
    terminalVisible,
    terminalWindow,
    terminalWrap,
    type TerminalGraph,
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
