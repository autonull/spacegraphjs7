// `spacegraphjs/terminal` — pure projection primitives for a line-addressable vector console.
// The host owns vocabulary, theme and camera; nothing here imports a graph runtime or an app.

import { mountComposer, type ComposerController, type ComposerOptions } from './composer';
import { transcriptLane, type TranscriptLaneOptions } from './layout/transcript';
import { escapeHtml } from './markup';
import { DEFAULT_RUNG_IDS } from './representations/ladder';
import type { EdgeSpec, GraphSpec, NodeSpec } from './types';
import { clamp } from './utils/math';

export type TerminalLine = {
    readonly id: string;
    readonly kind: string;
    readonly status: string;
    readonly label: string;
    readonly text: string;
    readonly turn?: number;
    readonly parent?: string;
    readonly octave?: number;
};

export type TerminalSlot = 'gap' | 'gutter' | 'margin';
export type TerminalReveal = 'always' | 'zoom' | 'hover' | 'select';

export type TerminalOverlay = {
    readonly id: string;
    readonly lineID: string;
    readonly slot: TerminalSlot;
    readonly reveal: TerminalReveal;
    readonly band?: string;
    readonly size?: readonly [number, number];
    readonly node?: NodeSpec;
    readonly edge?: EdgeSpec;
};

export type TerminalPoint = { readonly nodeID: string; readonly offset: number };
export type TerminalRange = { readonly anchor: TerminalPoint; readonly focus: TerminalPoint };
export type TerminalWindow = { readonly start: string; readonly end: string };

/** URL-safe range key; ids may contain `:`, so the offset is read after the last separator. */
export const terminalRangeKey = (range: TerminalRange): string =>
    `${range.anchor.nodeID}:${range.anchor.offset}~${range.focus.nodeID}:${range.focus.offset}`;

export const terminalRangeFromKey = (key: string | undefined): TerminalRange | undefined => {
    if (!key) return undefined;
    const [anchor, focus] = key.split('~');
    const point = (value: string | undefined): TerminalPoint | undefined => {
        if (!value) return undefined;
        const separator = value.lastIndexOf(':');
        const offset = Number(value.slice(separator + 1));
        if (separator < 1 || !Number.isFinite(offset) || offset < 0) return undefined;
        return { nodeID: value.slice(0, separator), offset };
    };
    const a = point(anchor);
    const b = point(focus);
    return a && b ? { anchor: a, focus: b } : undefined;
};

export type TerminalGrid = {
    readonly charWidth: number;
    readonly lineHeight: number;
    readonly gutter: number;
    readonly minWidth: number;
    readonly maxWidth: number;
};

export const terminalGrid = (options: Partial<TerminalGrid> = {}): TerminalGrid => ({
    charWidth: options.charWidth ?? 8.2,
    lineHeight: options.lineHeight ?? 16,
    gutter: options.gutter ?? 12,
    minWidth: options.minWidth ?? 180,
    maxWidth: options.maxWidth ?? 520,
});

/** Hard-wrap by character count so every span maps back to an entry-id and offset. */
export const terminalWrap = (text: string, columns: number): readonly string[] => {
    if (!text.length) return [''];
    if (columns <= 0) return [text];
    const width = Math.floor(columns);
    return Array.from({ length: Math.ceil(text.length / width) }, (_, index) =>
        text.slice(index * width, (index + 1) * width),
    );
};

export const terminalLineSize = (
    text: string,
    grid: TerminalGrid = terminalGrid(),
    octave = 0,
): readonly [number, number] => {
    const scale = 2 ** clamp(octave, -2, 0);
    const charWidth = grid.charWidth * scale;
    const lineHeight = grid.lineHeight * scale;
    const columns = Math.max(1, Math.floor((grid.maxWidth - grid.gutter) / charWidth));
    const rows = terminalWrap(text, columns).length;
    const width = clamp(
        text.length * charWidth + grid.gutter,
        grid.minWidth * scale,
        grid.maxWidth * scale,
    );
    return [width, Math.max(lineHeight, rows * lineHeight + grid.gutter * scale)];
};

export type TerminalPlacement = {
    readonly id: string;
    readonly position: readonly [number, number, number];
    readonly octave: number;
    readonly size: readonly [number, number];
};

export type TerminalLayout = {
    readonly placements: ReadonlyMap<string, TerminalPlacement>;
    readonly spine: readonly string[];
};

/** Append-only spine with attached context in halving columns; caller-owned text sizes the nodes. */
export const terminalLayout = (
    lines: readonly TerminalLine[],
    grid: TerminalGrid = terminalGrid(),
    options: TranscriptLaneOptions = {},
): TerminalLayout => {
    const ids = new Set(lines.map((line) => line.id));
    const parentOf = new Map(
        lines
            .filter((line) => line.parent && line.parent !== line.id && ids.has(line.parent))
            .map((line) => [line.id, line.parent!] as const),
    );
    const octaveOf = (line: TerminalLine): number => {
        if (line.octave !== undefined) return line.octave;
        const seen = new Set([line.id]);
        let parent = parentOf.get(line.id);
        let depth = 0;
        while (parent && !seen.has(parent)) {
            seen.add(parent);
            depth++;
            parent = parentOf.get(parent);
        }
        return -depth;
    };
    const sizes = new Map(
        lines.map(
            (line) => [line.id, terminalLineSize(line.text, grid, octaveOf(line))] as const,
        ),
    );
    const solved = transcriptLane(
        lines.map((line) => {
            const [width, height] = sizes.get(line.id)!;
            return { id: line.id, parent: line.parent, width, height };
        }),
        { gutter: grid.gutter, ...options },
    );
    const spine = lines.filter((line) => !parentOf.has(line.id)).map((line) => line.id);
    const placements = new Map(
        lines.map((line) => {
            const point = solved.positions.get(line.id)!;
            return [
                line.id,
                {
                    id: line.id,
                    position: [point.x, point.y, point.z] as const,
                    octave: solved.octaves.get(line.id) ?? octaveOf(line),
                    size: sizes.get(line.id)!,
                },
            ] as const;
        }),
    );
    return { placements, spine };
};

export type TerminalGap = { readonly after: string; readonly lines: number };

/** Cumulative world-y shift per id: a gap opens after its anchor and moves only later lines. */
export const terminalGaps = (
    order: readonly string[],
    gaps: readonly TerminalGap[],
    lineHeight: number,
): ReadonlyMap<string, number> => {
    const byAfter = new Map(gaps.map((gap) => [gap.after, gap.lines]));
    const offsets = new Map<string, number>();
    let offset = 0;
    order.forEach((id) => {
        offsets.set(id, offset);
        offset -= Math.max(0, byAfter.get(id) ?? 0) * lineHeight;
    });
    return offsets;
};

export type TerminalWindowConfig = {
    readonly size?: number;
    readonly margin?: number;
    readonly hysteresis?: number;
};

/** Slide a window only when the focus leaves its stable core; prefetch `margin` rows on each side. */
export const terminalWindow = (
    ids: readonly string[],
    focusID: string,
    config: TerminalWindowConfig = {},
    previous?: TerminalWindow,
): TerminalWindow => {
    if (!ids.length) return { start: '', end: '' };
    const size = Math.max(1, config.size ?? 40);
    const margin = Math.max(0, config.margin ?? 8);
    const hysteresis = Math.max(0, config.hysteresis ?? 4);
    const index = ids.indexOf(focusID);
    const cursor = index < 0 ? 0 : index;
    const previousStart = previous ? ids.indexOf(previous.start) : -1;
    const previousEnd = previous ? ids.indexOf(previous.end) : -1;
    const stable =
        previousStart >= 0 &&
        previousEnd >= previousStart &&
        cursor >= previousStart + hysteresis &&
        cursor <= previousEnd - hysteresis;
    const first = clamp(
        stable ? previousStart : cursor - Math.floor(size / 2),
        0,
        ids.length - 1,
    );
    const lo = clamp(first - margin, 0, ids.length - 1);
    const hi = clamp(first + size - 1 + margin, 0, ids.length - 1);
    return { start: ids[lo]!, end: ids[hi]! };
};

export const terminalOrder = (lines: readonly TerminalLine[]): ReadonlyMap<string, number> =>
    new Map(lines.map((line, index) => [line.id, index] as const));

export const terminalCompare = (
    order: ReadonlyMap<string, number>,
    a: TerminalPoint,
    b: TerminalPoint,
): number =>
    (order.get(a.nodeID) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.nodeID) ?? Number.MAX_SAFE_INTEGER) ||
    a.offset - b.offset;

export const terminalRange = (
    a: TerminalPoint,
    b: TerminalPoint,
    order: ReadonlyMap<string, number>,
): TerminalRange =>
    terminalCompare(order, a, b) <= 0 ? { anchor: a, focus: b } : { anchor: b, focus: a };

export const terminalRangeIDs = (
    range: TerminalRange,
    order: ReadonlyMap<string, number>,
): readonly string[] => {
    const anchor = order.get(range.anchor.nodeID);
    const focus = order.get(range.focus.nodeID);
    if (anchor === undefined || focus === undefined) return [];
    const lo = Math.min(anchor, focus);
    const hi = Math.max(anchor, focus);
    return [...order.entries()]
        .sort((a, b) => a[1] - b[1])
        .filter(([, index]) => index >= lo && index <= hi)
        .map(([id]) => id);
};

export const terminalRangeText = (
    range: TerminalRange,
    lines: readonly TerminalLine[],
    order: ReadonlyMap<string, number> = terminalOrder(lines),
): string => {
    const normalized = terminalRange(range.anchor, range.focus, order);
    const byID = new Map(lines.map((line) => [line.id, line.text] as const));
    return terminalRangeIDs(normalized, order)
        .map((id) => {
            const text = byID.get(id) ?? '';
            const from =
                id === normalized.anchor.nodeID
                    ? clamp(normalized.anchor.offset, 0, text.length)
                    : 0;
            const to =
                id === normalized.focus.nodeID
                    ? clamp(normalized.focus.offset, 0, text.length)
                    : text.length;
            return text.slice(from, Math.max(from, to));
        })
        .filter(Boolean)
        .join('\n');
};

export const terminalMoveLine = (
    point: TerminalPoint,
    ids: readonly string[],
    delta: number,
): TerminalPoint => {
    const index = ids.indexOf(point.nodeID);
    if (index < 0) return point;
    const next = clamp(index + delta, 0, ids.length - 1);
    return { nodeID: ids[next]!, offset: next === index ? point.offset : 0 };
};

export const STATUS_GLYPHS: Readonly<Record<string, string>> = {
    complete: '✓',
    pending: '…',
    failed: '×',
};
export const KIND_GLYPHS: Readonly<Record<string, string>> = {
    user: '@',
    assistant: '✦',
    file: '▤',
    tool: '⚙',
    approval: '!',
    error: '×',
    artifact: '◇',
};

export type TerminalGlyphs = {
    readonly status: Readonly<Record<string, string>>;
    readonly kind: Readonly<Record<string, string>>;
};

export const terminalGlyphs = (
    overrides: Partial<{ status: Readonly<Record<string, string>>; kind: Readonly<Record<string, string>> }> = {},
): TerminalGlyphs => ({
    status: { ...STATUS_GLYPHS, ...overrides.status },
    kind: { ...KIND_GLYPHS, ...overrides.kind },
});

export const lineGlyph = (line: TerminalLine, glyphs: TerminalGlyphs = terminalGlyphs()): string =>
    glyphs.kind[line.kind] ?? '·';
export const statusGlyph = (line: TerminalLine, glyphs: TerminalGlyphs = terminalGlyphs()): string =>
    glyphs.status[line.status] ?? '';

export const lineHTML = (line: TerminalLine, glyphs: TerminalGlyphs = terminalGlyphs()): string =>
    `<span class="tg-gutter">${escapeHtml(lineGlyph(line, glyphs))} ${escapeHtml(statusGlyph(line, glyphs))}</span><span class="tg-text">${escapeHtml(line.text)}</span>`;

/** Caret and textarea markup for an `HtmlNode` tail node; the host owns the CSS. */
export const terminalPromptHTML = (placeholder = 'Send a message'): string =>
    `<div class="tg-prompt"><span class="tg-caret">›</span><textarea data-terminal-prompt rows="1" placeholder="${escapeHtml(placeholder)}" aria-label="Console prompt"></textarea></div>`;

export type TerminalPromptNodeOptions = {
    readonly id?: string;
    readonly placeholder?: string;
    readonly width?: number;
    readonly height?: number;
};

export const terminalPromptNode = (
    position: readonly [number, number, number],
    options: TerminalPromptNodeOptions = {},
): NodeSpec => ({
    id: options.id ?? 'terminal-prompt',
    type: 'HtmlNode',
    label: 'Prompt',
    position: [...position],
    data: {
        html: terminalPromptHTML(options.placeholder),
        useRawHtml: true,
        showControls: false,
        pointerEvents: 'auto',
        width: options.width ?? 520,
        height: options.height ?? 44,
        minWidth: 120,
        minHeight: 24,
    },
});

export type TerminalPromptOptions = ComposerOptions & {
    /** Selector for the textarea inside the rendered node. */
    readonly selector?: string;
};

export type TerminalPromptController = {
    readonly composer: () => ComposerController | undefined;
    destroy(): void;
};

/** Waits for the scene textarea to mount, then wires composer behaviour to it. */
export const mountTerminalPrompt = (
    container: HTMLElement,
    options: TerminalPromptOptions,
): TerminalPromptController => {
    const selector = options.selector ?? '[data-terminal-prompt]';
    let composer: ComposerController | undefined;
    let observer: MutationObserver | undefined;
    const attach = (): boolean => {
        const field = container.querySelector<HTMLTextAreaElement>(selector);
        if (!field || composer?.element === field) return false;
        composer = mountComposer(field, { onSubmit: options.onSubmit, history: options.history });
        observer?.disconnect();
        observer = undefined;
        return true;
    };
    if (!attach()) {
        observer = new MutationObserver(() => {
            attach();
        });
        observer.observe(container, { childList: true, subtree: true });
    }
    return {
        composer: () => composer,
        destroy: () => {
            observer?.disconnect();
            composer?.destroy();
            composer = undefined;
        },
    };
};

export type TerminalRevealState = {
    readonly band?: string;
    readonly hovered?: string;
    readonly selected?: ReadonlySet<string>;
};

export const terminalVisible = (
    overlay: TerminalOverlay,
    state: TerminalRevealState = {},
    ladder: readonly string[] = DEFAULT_RUNG_IDS,
): boolean => {
    switch (overlay.reveal) {
        case 'always':
            return true;
        case 'hover':
            return state.hovered === overlay.lineID;
        case 'select':
            return state.selected?.has(overlay.lineID) ?? false;
        case 'zoom': {
            if (!state.band) return false;
            const at = overlay.band ? ladder.indexOf(overlay.band) : 0;
            const now = ladder.indexOf(state.band);
            return at >= 0 && now >= at;
        }
    }
};

export const terminalOverlays = (
    overlays: readonly TerminalOverlay[],
    state: TerminalRevealState = {},
    ladder: readonly string[] = DEFAULT_RUNG_IDS,
): readonly TerminalOverlay[] => overlays.filter((overlay) => terminalVisible(overlay, state, ladder));

export type TerminalSpecOptions = {
    readonly grid?: TerminalGrid;
    readonly lane?: TranscriptLaneOptions;
    readonly window?: TerminalWindowConfig;
    /** Explicit bounds; wins over the hysteresis-based window derived from `focusID`. */
    readonly range?: TerminalWindow;
    readonly gaps?: readonly TerminalGap[];
    readonly overlays?: readonly TerminalOverlay[];
    readonly reveal?: TerminalRevealState;
    readonly focusID?: string;
    readonly previous?: TerminalWindow;
    readonly glyphs?: TerminalGlyphs;
    readonly render?: (line: TerminalLine) => string;
};

export const terminalSpec = (
    lines: readonly TerminalLine[],
    options: TerminalSpecOptions = {},
): {
    readonly spec: GraphSpec;
    readonly window: TerminalWindow;
    readonly layout: TerminalLayout;
} => {
    const grid = options.grid ?? terminalGrid();
    const layout = terminalLayout(lines, grid, options.lane);
    const ids = lines.map((line) => line.id);
    const window =
        options.range ??
        terminalWindow(ids, options.focusID ?? ids.at(-1) ?? '', options.window, options.previous);
    const offsets = terminalGaps(ids, options.gaps ?? [], grid.lineHeight);
    const render = options.render ?? ((line: TerminalLine) => lineHTML(line, options.glyphs));
    const startIndex = ids.indexOf(window.start);
    const endIndex = ids.indexOf(window.end);
    const visible = lines.filter((_, index) => index >= startIndex && index <= endIndex);
    const visibleIDs = new Set(visible.map((line) => line.id));
    const nodes: NodeSpec[] = visible.map((line) => {
        const placement = layout.placements.get(line.id)!;
        const [width, height] = placement.size;
        return {
            id: line.id,
            type: 'HtmlNode',
            label: line.label,
            position: [
                placement.position[0],
                placement.position[1] + (offsets.get(line.id) ?? 0),
                placement.position[2],
            ],
            data: {
                html: render(line),
                useRawHtml: true,
                showControls: false,
                pointerEvents: 'auto',
                width,
                height,
                minWidth: 32,
                minHeight: 6,
            },
        };
    });
    const edges: EdgeSpec[] = [];
    layout.spine.forEach((id, index) => {
        const previous = layout.spine[index - 1];
        if (previous && visibleIDs.has(previous) && visibleIDs.has(id)) {
            edges.push({ id: `${previous}->${id}`, source: previous, target: id, type: 'CurvedEdge' });
        }
    });
    lines.forEach((line) => {
        if (line.parent && visibleIDs.has(line.parent) && visibleIDs.has(line.id)) {
            edges.push({
                id: `${line.parent}->${line.id}`,
                source: line.parent,
                target: line.id,
                type: line.octave === -1 ? 'DottedEdge' : 'Edge',
            });
        }
    });
    terminalOverlays(options.overlays ?? [], options.reveal ?? {}).forEach((overlay) => {
        if (!visibleIDs.has(overlay.lineID)) return;
        if (overlay.node) nodes.push(overlay.node);
        if (overlay.edge) edges.push(overlay.edge);
    });
    return { spec: { nodes, edges }, window, layout };
};

/** The small graph surface the controller needs; a SpaceGraph adapter satisfies it at runtime. */
export type TerminalGraph = {
    addNode(spec: NodeSpec): unknown;
    addEdge(spec: EdgeSpec): unknown;
    removeNode(id: string): void;
    removeEdge(id: string): void;
    setPositions(positions: Record<string, [number, number, number]>): unknown;
    show(id: string, visible?: boolean): unknown;
    select(target: string | readonly string[] | null): unknown;
    onNodeClick(callback: (id: string) => void): () => void;
    onZoomBand(callback: (band: string) => void): () => void;
};

/** A host-owned model sink. `project` may return any model the host can render. */
export type TerminalSink<Model = GraphSpec> = {
    render(model: Model): void;
    show(id: string, visible: boolean): void;
    select(target: string | readonly string[] | null): void;
    onNodeClick(callback: (id: string) => void): () => void;
    onZoomBand(callback: (band: string) => void): () => void;
    destroy?(): void;
};

export type TerminalProjectionContext = {
    readonly lines: readonly TerminalLine[];
    readonly visible: readonly TerminalLine[];
    readonly order: readonly string[];
    readonly window: TerminalWindow;
    readonly gaps: readonly TerminalGap[];
    readonly overlays: readonly TerminalOverlay[];
    readonly band: string;
    readonly layout: TerminalLayout;
};

export type TerminalHooks<Model = GraphSpec> = {
    /** Host projection; defaults to `terminalSpec` driven by the controller's state. */
    readonly project?: (context: TerminalProjectionContext) => Model;
    /** Host visibility predicate, re-evaluated by `refresh()`. */
    readonly filter?: (line: TerminalLine) => boolean;
    readonly grid?: TerminalGrid;
    readonly lane?: TranscriptLaneOptions;
    readonly windowConfig?: TerminalWindowConfig;
    readonly gaps?: readonly TerminalGap[];
    readonly overlays?: readonly TerminalOverlay[];
    readonly onReveal?: (id: string) => void;
    readonly onFocus?: (id: string) => void;
    readonly onCopy?: (text: string) => void;
    readonly onCamera?: (state: {
        band: string;
        window: TerminalWindow;
        following: boolean;
    }) => void;
    readonly announce?: (message: string) => void;
};

export type TerminalController = {
    append(lines: readonly TerminalLine[]): void;
    /** Replace the whole line set and re-anchor the window at the tail. */
    setLines(lines: readonly TerminalLine[]): void;
    setWindow(startID: string, endID: string): void;
    select(range?: TerminalRange): void;
    selection(): TerminalRange | undefined;
    /** Currently focused or followed line id. */
    tail(): string | undefined;
    copy(): string;
    setOverlays(overlays: readonly TerminalOverlay[]): void;
    followTail(enabled: boolean): void;
    focusLine(id: string): void;
    refresh(): void;
    destroy(): void;
};

/** Drives a windowed line projection through a host-owned model sink. */
export const mountTerminalSink = <Model = GraphSpec>(
    sink: TerminalSink<Model>,
    hooks: TerminalHooks<Model> = {},
): TerminalController => {
    let lines: TerminalLine[] = [];
    let windowState: TerminalWindow = { start: '', end: '' };
    let focusID = '';
    let range: TerminalRange | undefined;
    let overlays: readonly TerminalOverlay[] = hooks.overlays ?? [];
    const gaps = hooks.gaps ?? [];
    let band = 'dot';
    let following = true;

    const order = (): readonly string[] => lines.map((line) => line.id);
    const layout = (): TerminalLayout => terminalLayout(lines, hooks.grid ?? terminalGrid(), hooks.lane);
    const windowed = (): readonly TerminalLine[] => {
        const ids = order();
        const from = ids.indexOf(windowState.start);
        const to = ids.indexOf(windowState.end);
        return lines.filter((_, index) => index >= from && index <= to);
    };
    const selectedIDs = (): readonly string[] =>
        range ? terminalRangeIDs(range, terminalOrder(lines)) : [];

    const project = (): Model => {
        const context: TerminalProjectionContext = {
            lines,
            visible: windowed(),
            order: order(),
            window: windowState,
            gaps,
            overlays,
            band,
            layout: layout(),
        };
        if (hooks.project) return hooks.project(context);
        return terminalSpec(lines, {
            grid: hooks.grid,
            lane: hooks.lane,
            window: hooks.windowConfig,
            range: windowState,
            gaps,
            overlays: terminalOverlays(overlays, { band, selected: new Set(selectedIDs()) }),
        }).spec as Model;
    };

    const apply = (): void => {
        sink.render(project());
        const filter = hooks.filter;
        if (filter) lines.forEach((entry) => sink.show(entry.id, filter(entry)));
        const selected = selectedIDs();
        sink.select(selected.length ? selected : focusID || null);
        hooks.onCamera?.({ band, window: windowState, following });
    };

    const moveWindow = (id: string): void => {
        windowState = terminalWindow(order(), id, hooks.windowConfig);
    };

    const unsubscribeNode = sink.onNodeClick((id) => {
        focusID = id;
        sink.select(id);
        hooks.onReveal?.(id);
    });
    const unsubscribeBand = sink.onZoomBand((next) => {
        if (next === band) return;
        band = next;
        apply();
    });

    return {
        setLines: (next) => {
            lines = [...next];
            focusID = lines.at(-1)?.id ?? '';
            range = undefined;
            if (following) moveWindow(focusID);
            apply();
        },
        append: (added) => {
            const incoming = new Map(added.map((entry) => [entry.id, entry] as const));
            lines = [...lines.filter((entry) => !incoming.has(entry.id)), ...added];
            focusID = added.at(-1)?.id ?? focusID;
            if (following) moveWindow(focusID);
            apply();
        },
        setWindow: (startID, endID) => {
            windowState = { start: startID, end: endID };
            following = false;
            apply();
        },
        select: (next) => {
            range = next;
            apply();
            const count = selectedIDs().length;
            if (count) hooks.announce?.(`Selected ${count} lines`);
        },
        selection: () => range,
        tail: () => focusID || undefined,
        copy: () => {
            const text = range
                ? terminalRangeText(range, lines)
                : (lines.find((entry) => entry.id === focusID)?.text ?? '');
            hooks.onCopy?.(text);
            return text;
        },
        setOverlays: (next) => {
            overlays = next;
            apply();
        },
        followTail: (enabled) => {
            following = enabled;
            if (enabled) {
                focusID = lines.at(-1)?.id ?? focusID;
                if (focusID) moveWindow(focusID);
            }
            apply();
        },
        focusLine: (id) => {
            if (!lines.some((entry) => entry.id === id)) return;
            focusID = id;
            if (following) moveWindow(id);
            hooks.onFocus?.(id);
            apply();
        },
        refresh: apply,
        destroy: () => {
            unsubscribeNode();
            unsubscribeBand();
            sink.destroy?.();
            lines = [];
        },
    };
};

/** Adapts SpaceGraph-style methods into a sink with incremental node and edge diffing. */
export const mountTerminal = (
    graph: TerminalGraph,
    hooks: TerminalHooks<GraphSpec> = {},
): TerminalController => {
    let nodeIDs: readonly string[] = [];
    let edgeIDs: readonly string[] = [];
    const sink: TerminalSink<GraphSpec> = {
        render: (spec) => {
            const nodes = spec.nodes ?? [];
            const edges = spec.edges ?? [];
            const nextNodes = nodes.map((node) => node.id);
            const nextEdges = edges.map((edge) => edge.id);
            nodeIDs.filter((id) => !nextNodes.includes(id)).forEach((id) => graph.removeNode(id));
            edgeIDs.filter((id) => !nextEdges.includes(id)).forEach((id) => graph.removeEdge(id));
            nodes.forEach((node) => graph.addNode(node));
            edges.forEach((edge) => graph.addEdge(edge));
            const positions = Object.fromEntries(
                nodes.filter((node) => node.position).map((node) => [node.id, node.position!]),
            );
            if (Object.keys(positions).length) graph.setPositions(positions);
            nodeIDs = nextNodes;
            edgeIDs = nextEdges;
        },
        show: (id, visible) => {
            graph.show(id, visible);
        },
        select: (target) => {
            graph.select(target);
        },
        onNodeClick: graph.onNodeClick,
        onZoomBand: graph.onZoomBand,
        destroy: () => {
            nodeIDs.forEach((id) => graph.removeNode(id));
            edgeIDs.forEach((id) => graph.removeEdge(id));
        },
    };
    return mountTerminalSink(sink, hooks);
};
