// `spacegraphjs/terminal` — pure projection primitives for a line-addressable vector console.
// The host owns vocabulary, theme and camera; nothing here imports a graph runtime or an app.

import { createAnnouncer } from './a11y/announcer';
import { mountComposer, type ComposerController, type ComposerOptions } from './composer';
import { transcriptLane, type TranscriptLaneOptions } from './layout/transcript';
import { escapeHtml } from './markup';
import { DEFAULT_RUNG_IDS } from './representations/ladder';
import type { EdgeSpec, GraphSpec, NodeSpec } from './types';
import { isEditableTarget } from './utils/DOMUtils';
import { clamp } from './utils/math';

export type TerminalLine = {
    readonly id: string;
    readonly kind: string;
    readonly status: string;
    readonly label: string;
    readonly text: string;
    readonly turn?: number;
    /** Host role such as user or assistant; used for colour coding, never for text. */
    readonly role?: string;
    /** Optional timestamp or ordered time value used by historical views. */
    readonly at?: number;
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
    /** Presentation hint for hosts that place detail cards in vector space. */
    readonly mode?: 'inline' | 'popup' | 'rail';
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

/** Code-point width: 1 by default, 2 for wide glyphs, 0 for combining marks. */
export type TerminalCharWidth = (character: string) => number;
const unitWidth: TerminalCharWidth = () => 1;

export const terminalTextWidth = (
    text: string,
    widthOf: TerminalCharWidth = unitWidth,
): number => [...text].reduce((total, character) => total + Math.max(0, widthOf(character)), 0);

/** Wrap by display width so each span still maps back to an entry-id and offset. */
export const terminalWrap = (
    text: string,
    columns: number,
    widthOf: TerminalCharWidth = unitWidth,
): readonly string[] => {
    if (!text.length) return [''];
    if (columns <= 0) return [text];
    const limit = Math.max(1, Math.floor(columns));
    const lines: string[] = [];
    let line = '';
    let used = 0;
    for (const character of text) {
        const measure = Math.max(0, widthOf(character));
        if (line && used + measure > limit) {
            lines.push(line);
            line = '';
            used = 0;
        }
        line += character;
        used += measure;
    }
    if (line || !lines.length) lines.push(line);
    return lines;
};

export const terminalLineSize = (
    text: string,
    grid: TerminalGrid = terminalGrid(),
    octave = 0,
    widthOf: TerminalCharWidth = unitWidth,
): readonly [number, number] => {
    const scale = 2 ** clamp(octave, -2, 0);
    const charWidth = grid.charWidth * scale;
    const lineHeight = grid.lineHeight * scale;
    const columns = Math.max(1, Math.floor((grid.maxWidth - grid.gutter) / charWidth));
    const rows = terminalWrap(text, columns, widthOf).length;
    const width = clamp(
        terminalTextWidth(text, widthOf) * charWidth + grid.gutter,
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

/** One placement contract for every console builder: the lane uses text widths, a fixed-width host
 * uses an even column, and a tight-text host drops the gutter and opens a row gap. */
export type TerminalPlacementRule = TranscriptLaneOptions & {
    readonly width?: number;
    readonly rowGap?: number;
    readonly trimGutter?: boolean;
    readonly sizeOf?: (line: TerminalLine, octave: number) => readonly [number, number];
};

/** Place lines and their context; both `terminalSpec` and host projections consume this result. */
export const terminalPlace = (
    lines: readonly TerminalLine[],
    grid: TerminalGrid = terminalGrid(),
    rule: TerminalPlacementRule = {},
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
    const sizeOf = (line: TerminalLine, octave: number): readonly [number, number] => {
        const explicit = rule.sizeOf?.(line, octave);
        if (explicit) return explicit;
        const measured = terminalLineSize(line.text, grid, octave);
        return [
            rule.width ?? measured[0],
            rule.trimGutter ? Math.max(grid.lineHeight, measured[1] - grid.gutter) : measured[1],
        ];
    };
    const sizes = new Map(lines.map((line) => [line.id, sizeOf(line, octaveOf(line))] as const));
    const lane: TranscriptLaneOptions = {
        gutter: rule.gutter ?? grid.gutter,
        ...(rule.spineStep === undefined ? {} : { spineStep: rule.spineStep }),
        ...(rule.contextStep === undefined ? {} : { contextStep: rule.contextStep }),
    };
    const fixedWidth = rule.width;
    const solved =
        fixedWidth === undefined
            ? transcriptLane(
                  lines.map((line) => {
                      const [lineWidth, height] = sizes.get(line.id)!;
                      return { id: line.id, parent: line.parent, width: lineWidth, height };
                  }),
                  lane,
              )
            : {
                  positions: new Map(
                      lines.map((line, index) => [
                          line.id,
                          {
                              x: fixedWidth / 2,
                              y: -index * (sizes.get(line.id)![1] + (rule.rowGap ?? 0)),
                              z: 0,
                          },
                      ]),
                  ),
                  octaves: new Map(lines.map((line) => [line.id, line.octave ?? 0])),
              };
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

/** Default contract: append-only spine with attached context in halving columns. */
export const terminalLayout = (
    lines: readonly TerminalLine[],
    grid: TerminalGrid = terminalGrid(),
    options: TranscriptLaneOptions = {},
): TerminalLayout => terminalPlace(lines, grid, options);

export type TerminalGap = { readonly after: string; readonly lines: number };

/** Every visible gap overlay opens a fixed number of line units after its anchor. */
export const terminalOverlayGaps = (
    overlays: readonly TerminalOverlay[],
    lineUnits = 2,
): readonly TerminalGap[] => {
    const counts = new Map<string, number>();
    overlays
        .filter((overlay) => overlay.slot === 'gap')
        .forEach((overlay) =>
            counts.set(overlay.lineID, (counts.get(overlay.lineID) ?? 0) + 1),
        );
    return [...counts].map(([after, count]) => ({ after, lines: count * lineUnits }));
};

/** Gutter and margin overlays grouped by the line they annotate, in declaration order. */
export const terminalSlots = (
    overlays: readonly TerminalOverlay[],
    slot: Exclude<TerminalSlot, 'gap'>,
): ReadonlyMap<string, readonly TerminalOverlay[]> => {
    const byLine = new Map<string, TerminalOverlay[]>();
    overlays
        .filter((overlay) => overlay.slot === slot)
        .forEach((overlay) => {
            const list = byLine.get(overlay.lineID) ?? [];
            list.push(overlay);
            byLine.set(overlay.lineID, list);
        });
    return byLine;
};

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

export type TerminalLineDiff = {
    readonly added: readonly string[];
    readonly removed: readonly string[];
    readonly changed: readonly string[];
};

/** Compare two projections of one kernel without inventing or dropping committed ids. */
export const terminalDiff = (
    left: readonly TerminalLine[],
    right: readonly TerminalLine[],
): TerminalLineDiff => {
    const byID = new Map(left.map((line) => [line.id, line] as const));
    const nextIDs = new Set(right.map((line) => line.id));
    return {
        added: right.filter((line) => !byID.has(line.id)).map((line) => line.id),
        removed: left.filter((line) => !nextIDs.has(line.id)).map((line) => line.id),
        changed: right
            .filter((line) => byID.get(line.id)?.text !== line.text && byID.has(line.id))
            .map((line) => line.id),
    };
};

/** Copy selection and followed tail from the first controller that has them to its peers. */
export const terminalLink = (
    controllers: readonly TerminalController[],
): { sync(): void } => ({
    sync: () => {
        const leader = controllers.find((controller) => controller.selection() || controller.tail());
        if (!leader) return;
        const range = leader.selection();
        const tail = leader.tail();
        controllers.forEach((controller) => {
            if (controller === leader) return;
            controller.select(range);
            if (tail) controller.focusLine(tail);
        });
    },
});

/** Lines committed at or before `asOf`; undated lines always remain visible. */
export const terminalVisibleAt = (
    lines: readonly TerminalLine[],
    asOf: number | undefined,
): readonly TerminalLine[] =>
    asOf === undefined ? lines : lines.filter((line) => line.at === undefined || line.at <= asOf);

export type TerminalChapter = {
    readonly id: string;
    readonly label: string;
    readonly startID: string;
    readonly endID: string;
    readonly turn?: number;
    readonly at?: number;
};

/** Consecutive lines sharing a turn form one chapter; ids and offsets stay addressable. */
export const terminalChapters = (lines: readonly TerminalLine[]): readonly TerminalChapter[] => {
    const groups: { readonly turn?: number; readonly lines: TerminalLine[] }[] = [];
    lines.forEach((line, index) => {
        const last = groups.at(-1);
        const startsChapter =
            !last ||
            (line.turn !== undefined
                ? last.turn !== line.turn
                : last.turn !== undefined || (line.role === 'user' && index > 0));
        if (!last || startsChapter) groups.push({ turn: line.turn, lines: [line] });
        else last.lines.push(line);
    });
    return groups.map((group, index) => {
        const first = group.lines[0]!;
        return {
            id: `chapter-${index + 1}`,
            label:
                group.turn === undefined
                    ? group.lines.some((entry) => entry.role === 'user')
                        ? `Turn ${index + 1}`
                        : `Lines ${index + 1}`
                    : `Turn ${group.turn}`,
            startID: first.id,
            endID: group.lines.at(-1)!.id,
            turn: group.turn,
            at: group.lines.find((line) => line.at !== undefined)?.at,
        };
    });
};

/** Progressive prefixes for replay-as-typing; each step keeps the same committed ids. */
export const terminalReplaySteps = (
    lines: readonly TerminalLine[],
): readonly (readonly TerminalLine[])[] => lines.map((_, index) => lines.slice(0, index + 1));

export type TerminalReplayOptions = {
    readonly intervalMs?: number;
    readonly reducedMotion?: boolean;
    readonly onStep?: (step: number, total: number) => void;
};

export type TerminalReplayHandle = {
    cancel(): void;
    finished(): Promise<void>;
};

/** Reveals replay prefixes in order; reduced motion jumps straight to the final prefix. */
export const playTerminalReplay = (
    steps: readonly (readonly TerminalLine[])[],
    render: (lines: readonly TerminalLine[]) => void,
    options: TerminalReplayOptions = {},
): TerminalReplayHandle => {
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let complete!: () => void;
    const finished = new Promise<void>((resolve) => {
        complete = resolve;
    });
    const stop = (): void => {
        cancelled = true;
        if (timer !== undefined) clearTimeout(timer);
        complete();
    };
    const advance = (): void => {
        if (cancelled) return;
        render(steps[index] ?? []);
        options.onStep?.(index + 1, steps.length);
        index += 1;
        if (index >= steps.length) {
            complete();
            return;
        }
        timer = setTimeout(advance, Math.max(0, options.intervalMs ?? 90));
    };
    if (options.reducedMotion) {
        render(steps.at(-1) ?? []);
        options.onStep?.(steps.length, steps.length);
        complete();
    } else advance();
    return { cancel: stop, finished: () => finished };
};

export type TerminalSpan = {
    readonly lineID: string;
    /** Inclusive global index in the flattened console text. */
    readonly start: number;
    /** Exclusive global index; the separator that follows this line is not part of the span. */
    readonly end: number;
};

export type TerminalFlatText = {
    /** Committed line text joined by newlines, so global indices match copied ranges. */
    readonly text: string;
    readonly spans: readonly TerminalSpan[];
};

export const terminalFlatten = (lines: readonly TerminalLine[]): TerminalFlatText => {
    const spans: TerminalSpan[] = [];
    let text = '';
    lines.forEach((line, index) => {
        const start = text.length;
        text += line.text;
        spans.push({ lineID: line.id, start, end: text.length });
        if (index < lines.length - 1) text += '\n';
    });
    return { text, spans };
};

export const terminalPointAtIndex = (
    flat: TerminalFlatText,
    index: number,
): TerminalPoint | undefined => {
    if (!flat.spans.length) return undefined;
    const at = Math.max(0, Math.min(flat.text.length, Math.floor(index)));
    const span =
        flat.spans.find((entry) => at >= entry.start && at < entry.end) ??
        flat.spans.find((entry) => at === entry.end) ??
        flat.spans.at(-1)!;
    return { nodeID: span.lineID, offset: at - span.start };
};

export const terminalIndexOfPoint = (
    flat: TerminalFlatText,
    point: TerminalPoint,
): number | undefined => {
    const span = flat.spans.find((entry) => entry.lineID === point.nodeID);
    if (!span) return undefined;
    return span.start + Math.max(0, Math.min(span.end - span.start, Math.floor(point.offset)));
};

export const terminalRangeFromIndices = (
    flat: TerminalFlatText,
    start: number,
    end: number,
): TerminalRange | undefined => {
    const anchor = terminalPointAtIndex(flat, start);
    const focus = terminalPointAtIndex(flat, end);
    return anchor && focus ? { anchor, focus } : undefined;
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
    flat: TerminalFlatText = terminalFlatten(lines),
): string => {
    const normalized = terminalRange(range.anchor, range.focus, order);
    const from = terminalIndexOfPoint(flat, normalized.anchor);
    const to = terminalIndexOfPoint(flat, normalized.focus);
    return from === undefined || to === undefined ? '' : flat.text.slice(from, Math.max(from, to));
};

export type TerminalExportFormat = 'markdown' | 'json';

/** Lines addressed by a range, in linear order; an absent range exports the whole console. */
export const terminalExcerpt = (
    lines: readonly TerminalLine[],
    range?: TerminalRange,
    order: ReadonlyMap<string, number> = terminalOrder(lines),
): readonly TerminalLine[] => {
    if (!range) return lines;
    const byID = new Map(lines.map((line) => [line.id, line] as const));
    return terminalRangeIDs(range, order)
        .map((id) => byID.get(id))
        .filter((line): line is TerminalLine => line !== undefined);
};

/** Shareable excerpt of a console range; ids and turn numbers stay stable across exports. */
export const terminalExport = (
    lines: readonly TerminalLine[],
    range: TerminalRange | undefined,
    format: TerminalExportFormat,
    order: ReadonlyMap<string, number> = terminalOrder(lines),
): string => {
    const excerpt = terminalExcerpt(lines, range, order);
    if (format === 'json')
        return JSON.stringify(
            excerpt.map(({ id, kind, status, text, turn }) => ({ id, kind, status, text, turn })),
        );
    return excerpt
        .map((line) => `- ${lineGlyph(line)} ${line.text} \`${line.id}\``)
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

/** Palettes name theme tokens; hosts supply the actual colours in their CSS. */
export type TerminalPalette = {
    readonly id: string;
    readonly label: string;
    readonly glyphs: TerminalGlyphs;
    readonly tokens: Readonly<Record<string, string>>;
};

const retroGlyphs = terminalGlyphs({
    kind: { user: '>', assistant: '*', file: '#', tool: '~', approval: '!', error: 'x', artifact: 'o' },
    status: { complete: 'v', pending: '.', failed: 'x' },
});

export const TERMINAL_PALETTES: readonly TerminalPalette[] = [
    {
        id: 'classic',
        label: 'Classic',
        glyphs: terminalGlyphs(),
        tokens: {
            background: '--surface',
            text: '--text',
            accent: '--accent',
            muted: '--muted',
            attention: '--warn',
        },
    },
    {
        id: 'amber',
        label: 'Amber',
        glyphs: terminalGlyphs(),
        tokens: {
            background: '--surface',
            text: '--accent',
            accent: '--accent',
            muted: '--muted',
            attention: '--warn',
        },
    },
    {
        id: 'green',
        label: 'Phosphor',
        glyphs: terminalGlyphs(),
        tokens: {
            background: '--surface',
            text: '--success',
            accent: '--success',
            muted: '--muted',
            attention: '--warn',
        },
    },
    {
        id: 'retro',
        label: 'Retro',
        glyphs: retroGlyphs,
        tokens: {
            background: '--surface',
            text: '--text',
            accent: '--text',
            muted: '--muted',
            attention: '--warn',
        },
    },
];

export const terminalPalette = (id: string): TerminalPalette =>
    TERMINAL_PALETTES.find((palette) => palette.id === id) ?? TERMINAL_PALETTES[0]!;

export const lineGlyph = (line: TerminalLine, glyphs: TerminalGlyphs = terminalGlyphs()): string =>
    glyphs.kind[line.kind] ?? '·';
export const statusGlyph = (line: TerminalLine, glyphs: TerminalGlyphs = terminalGlyphs()): string =>
    glyphs.status[line.status] ?? '';

/** Text direction applies to the text span only; the gutter stays in logical (LTR) order. */
export const lineHTML = (
    line: TerminalLine,
    glyphs: TerminalGlyphs = terminalGlyphs(),
    direction?: 'ltr' | 'rtl',
): string =>
    `<span class="tg-gutter">${escapeHtml(lineGlyph(line, glyphs))} ${escapeHtml(statusGlyph(line, glyphs))}</span><span class="tg-text"${direction ? ` dir="${direction}"` : ''}>${escapeHtml(line.text)}</span>`;

export type TerminalDetail = {
    readonly title: string;
    readonly fields: readonly (readonly [string, string])[];
    readonly text?: string;
};

/** Safe, escaped markup for an expandable detail card in any of the overlay slots. */
export const terminalDetailHTML = (detail: TerminalDetail): string => {
    const rows = detail.fields
        .map(
            ([key, value]) =>
                `<span class="tg-detail-field"><b>${escapeHtml(key)}</b> ${escapeHtml(value)}</span>`,
        )
        .join('');
    return `<div class="tg-detail"><strong>${escapeHtml(detail.title)}</strong>${detail.text ? `<p>${escapeHtml(detail.text)}</p>` : ''}<div class="tg-detail-fields">${rows}</div></div>`;
};

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

export type TerminalA11yOptions = {
    /** Selector that identifies addressable line nodes inside the container. */
    readonly selector?: string;
    readonly announce?: (message: string) => void;
    readonly onFocus?: (id: string) => void;
    /** Current anchored range; Shift+Arrow extends it from the original anchor. */
    readonly selection?: () => TerminalRange | undefined;
    readonly onSelect?: (range: TerminalRange) => void;
};

/** Roving focus, list roles and announced line navigation over scene-rendered nodes. */
export const mountTerminalA11y = (
    container: HTMLElement,
    options: TerminalA11yOptions = {},
): { destroy(): void } => {
    const selector = options.selector ?? '[data-node-id]';
    const announcer = options.announce ? undefined : createAnnouncer();
    const say = (message: string): void => (options.announce ?? announcer?.announce)?.(message);
    const decorate = (): void => {
        container.querySelectorAll<HTMLElement>(selector).forEach((node) => {
            if (isEditableTarget(node)) return;
            node.tabIndex = 0;
            node.setAttribute('role', 'listitem');
        });
    };
    const observer = new MutationObserver(decorate);
    observer.observe(container, { childList: true, subtree: true });
    decorate();
    const onKeyDown = (event: KeyboardEvent): void => {
        if (isEditableTarget(event.target)) return;
        const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(selector);
        if (!target || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const nodes = [...container.querySelectorAll<HTMLElement>(selector)];
        const index = nodes.indexOf(target);
        const next =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? nodes.length - 1
                  : Math.max(0, Math.min(nodes.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
        const node = nodes[next];
        if (!node?.dataset['nodeId']) return;
        if (event.shiftKey && options.onSelect) {
            const ids = nodes.flatMap((entry) => {
                const id = entry.dataset['nodeId'];
                return id ? [id] : [];
            });
            const order = new Map(ids.map((id, position) => [id, position] as const));
            const anchor = options.selection?.()?.anchor ?? {
                nodeID: target.dataset['nodeId']!,
                offset: 0,
            };
            const range = terminalRange(anchor, { nodeID: node.dataset['nodeId'], offset: 0 }, order);
            options.onSelect(range);
            say(`Selected ${terminalRangeIDs(range, order).length} lines`);
        } else say(`Line ${next + 1} of ${nodes.length}`);
        node.focus();
        options.onFocus?.(node.dataset['nodeId']);
    };
    container.addEventListener('keydown', onKeyDown);
    return {
        destroy: () => {
            observer.disconnect();
            container.removeEventListener('keydown', onKeyDown);
            announcer?.destroy();
        },
    };
};

export type TerminalCameraOptions = {
    /** Wheel travel in pixels before the camera is considered user-controlled. */
    readonly threshold?: number;
    /** Optional badge; its label and click re-engage tail following. */
    readonly badge?: HTMLElement;
    readonly onFollowChange?: (following: boolean) => void;
};

export type TerminalCameraController = {
    /** Re-engage or release tail-follow through the same badge and announcement path. */
    follow(enabled: boolean): void;
    destroy(): void;
};

/** Wheel panning releases tail-follow; End, the badge or a host action restores it. */
export const mountTerminalCamera = (
    container: HTMLElement,
    controller: TerminalController,
    options: TerminalCameraOptions = {},
): TerminalCameraController => {
    const threshold = Math.max(1, options.threshold ?? 24);
    let travel = 0;
    const report = (enabled: boolean): void => {
        if (options.badge) {
            options.badge.textContent = enabled ? 'tail: follow' : 'tail: free · click to follow';
            options.badge.setAttribute('aria-pressed', String(enabled));
        }
        options.onFollowChange?.(enabled);
    };
    const setFollow = (enabled: boolean): void => {
        if (controller.following() === enabled) return;
        travel = 0;
        controller.followTail(enabled);
        report(enabled);
    };
    const onWheel = (event: WheelEvent): void => {
        if (isEditableTarget(event.target)) return;
        travel += Math.abs(event.deltaY) + Math.abs(event.deltaX);
        if (travel >= threshold) setFollow(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
        if (isEditableTarget(event.target) || event.key !== 'End') return;
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        event.preventDefault();
        setFollow(true);
    };
    const onBadgeClick = (): void => setFollow(true);
    container.addEventListener('wheel', onWheel, { passive: true });
    container.addEventListener('keydown', onKeyDown);
    options.badge?.addEventListener('click', onBadgeClick);
    report(controller.following());
    return {
        follow: setFollow,
        destroy: () => {
            container.removeEventListener('wheel', onWheel);
            container.removeEventListener('keydown', onKeyDown);
            options.badge?.removeEventListener('click', onBadgeClick);
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

/** Cumulative window activity; hosts use it to tune mount/unmount hysteresis. */
export type TerminalChurn = {
    readonly mounted: number;
    readonly unmounted: number;
    readonly slides: number;
};

/** A host-owned model sink. `project` may return any model the host can render. */
export type TerminalSink<Model = GraphSpec> = {
    render(model: Model): void;
    show(id: string, visible: boolean): void;
    select(target: string | readonly string[] | null): void;
    onNodeClick(callback: (id: string) => void): () => void;
    onZoomBand(callback: (band: string) => void): () => void;
    /** Reports per-render node diffs when the sink performs incremental diffing. */
    readonly onChurn?: (
        listener: (stats: { readonly mounted: number; readonly unmounted: number }) => void,
    ) => () => void;
    destroy?(): void;
};

export type TerminalProjectionContext = {
    readonly lines: readonly TerminalLine[];
    readonly visible: readonly TerminalLine[];
    readonly order: readonly string[];
    /** Cached id-to-index map; hosts use it instead of rebuilding `terminalOrder`. */
    readonly index: ReadonlyMap<string, number>;
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
    /** Initial palette id or explicit palette; supplies glyphs for the default line markup. */
    readonly palette?: string | TerminalPalette;
    readonly onReveal?: (id: string) => void;
    readonly onFocus?: (id: string) => void;
    readonly onCopy?: (text: string) => void;
    readonly onCamera?: (state: {
        band: string;
        window: TerminalWindow;
        following: boolean;
        churn: TerminalChurn;
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
    /** Committed line text joined by newlines; indices match `terminalPointAtIndex`. */
    text(): string;
    lines(): readonly TerminalLine[];
    /** Active palette id; hosts can map its token names onto their CSS. */
    palette(): string;
    setPalette(id: string): void;
    following(): boolean;
    /** Cumulative mount/unmount and window-slide counts. */
    churn(): TerminalChurn;
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
    let band: string = DEFAULT_RUNG_IDS[0]!;
    let following = true;
    let palette: TerminalPalette =
        typeof hooks.palette === 'string'
            ? terminalPalette(hooks.palette)
            : (hooks.palette ?? TERMINAL_PALETTES[0]!);
    let ids: readonly string[] = [];
    let index: ReadonlyMap<string, number> = new Map();
    let flat: TerminalFlatText = { text: '', spans: [] };
    let churn: TerminalChurn = { mounted: 0, unmounted: 0, slides: 0 };
    const unsubscribeChurn = sink.onChurn?.((stats) => {
        churn = {
            mounted: churn.mounted + stats.mounted,
            unmounted: churn.unmounted + stats.unmounted,
            slides: churn.slides,
        };
    });
    const cacheIndices = (): void => {
        ids = lines.map((line) => line.id);
        index = terminalOrder(lines);
        flat = terminalFlatten(lines);
    };
    const layout = (): TerminalLayout => terminalLayout(lines, hooks.grid ?? terminalGrid(), hooks.lane);
    const windowed = (): readonly TerminalLine[] => {
        const from = ids.indexOf(windowState.start);
        const to = ids.indexOf(windowState.end);
        return lines.filter((_, position) => position >= from && position <= to);
    };
    const selectedIDs = (): readonly string[] => (range ? terminalRangeIDs(range, index) : []);

    const project = (): Model => {
        const context: TerminalProjectionContext = {
            lines,
            visible: windowed(),
            order: ids,
            index,
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
            glyphs: palette.glyphs,
        }).spec as Model;
    };

    const apply = (): void => {
        sink.render(project());
        const filter = hooks.filter;
        if (filter) lines.forEach((entry) => sink.show(entry.id, filter(entry)));
        const selected = selectedIDs();
        sink.select(selected.length ? selected : focusID || null);
        hooks.onCamera?.({ band, window: windowState, following, churn });
    };

    const moveWindow = (id: string): void => {
        const next = terminalWindow(ids, id, hooks.windowConfig);
        if (next.start !== windowState.start || next.end !== windowState.end)
            churn = { ...churn, slides: churn.slides + 1 };
        windowState = next;
    };
    const commit = (next: readonly TerminalLine[], focus?: string): void => {
        lines = [...next];
        cacheIndices();
        focusID = focus ?? lines.at(-1)?.id ?? '';
        if (following) moveWindow(focusID);
        apply();
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
            range = undefined;
            commit(next);
        },
        append: (added) => {
            const incoming = new Set(added.map((entry) => entry.id));
            commit(
                [...lines.filter((entry) => !incoming.has(entry.id)), ...added],
                added.at(-1)?.id ?? focusID,
            );
        },
        setWindow: (startID, endID) => {
            if (startID !== windowState.start || endID !== windowState.end)
                churn = { ...churn, slides: churn.slides + 1 };
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
        text: () => flat.text,
        lines: () => lines,
        palette: () => palette.id,
        setPalette: (id) => {
            palette = terminalPalette(id);
            apply();
        },
        following: () => following,
        churn: () => churn,
        copy: () => {
            const text = range
                ? terminalRangeText(range, lines, index, flat)
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
            if (enabled) commit(lines);
            else apply();
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
            unsubscribeChurn?.();
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
    const churnListeners: ((stats: { readonly mounted: number; readonly unmounted: number }) => void)[] = [];
    const sink: TerminalSink<GraphSpec> = {
        render: (spec) => {
            const nodes = spec.nodes ?? [];
            const edges = spec.edges ?? [];
            const previousNodes = new Set(nodeIDs);
            const nextNodes = new Set(nodes.map((node) => node.id));
            const nextEdges = new Set(edges.map((edge) => edge.id));
            const removed = nodeIDs.filter((id) => !nextNodes.has(id));
            const mounted = nodes.filter((node) => !previousNodes.has(node.id)).length;
            removed.forEach((id) => graph.removeNode(id));
            edgeIDs.filter((id) => !nextEdges.has(id)).forEach((id) => graph.removeEdge(id));
            nodes.forEach((node) => graph.addNode(node));
            edges.forEach((edge) => graph.addEdge(edge));
            const positions = Object.fromEntries(
                nodes.filter((node) => node.position).map((node) => [node.id, node.position!]),
            );
            if (Object.keys(positions).length) graph.setPositions(positions);
            if (churnListeners.length && (mounted || removed.length))
                churnListeners.forEach((listener) =>
                    listener({ mounted, unmounted: removed.length }),
                );
            nodeIDs = [...nextNodes];
            edgeIDs = [...nextEdges];
        },
        show: (id, visible) => {
            graph.show(id, visible);
        },
        select: (target) => {
            graph.select(target);
        },
        onNodeClick: graph.onNodeClick,
        onZoomBand: graph.onZoomBand,
        onChurn: (listener) => {
            churnListeners.push(listener);
            return () => {
                const index = churnListeners.indexOf(listener);
                if (index >= 0) churnListeners.splice(index, 1);
            };
        },
        destroy: () => {
            nodeIDs.forEach((id) => graph.removeNode(id));
            edgeIDs.forEach((id) => graph.removeEdge(id));
        },
    };
    return mountTerminalSink(sink, hooks);
};
