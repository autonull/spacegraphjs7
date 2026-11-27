// `spacegraphjs/terminal` — pure projection primitives for a line-addressable vector console.
// The host owns vocabulary, theme and camera; nothing here imports a graph runtime or an app.

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
    const window = terminalWindow(
        ids,
        options.focusID ?? ids.at(-1) ?? '',
        options.window,
        options.previous,
    );
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

export type TerminalController = {
    append(lines: readonly TerminalLine[]): void;
    setWindow(startID: string, endID: string): void;
    select(range?: TerminalRange): void;
    selection(): TerminalRange | undefined;
    setOverlays(overlays: readonly TerminalOverlay[]): void;
    followTail(enabled: boolean): void;
    focusLine(id: string): void;
    destroy(): void;
};
