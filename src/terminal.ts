// `spacegraphjs/terminal` — pure projection primitives for a line-addressable vector console.
// The host owns vocabulary, theme and camera; nothing here imports a graph runtime or an app.

import { createAnnouncer } from './a11y/announcer';
import { CommandRegistry, type Command } from './commands';
import { mountComposer, type ComposerController, type ComposerOptions } from './composer';
import { transcriptLane, type TranscriptLaneOptions } from './layout/transcript';
import {
    innerConnectors,
    innerPlacements,
    innerTree,
    type InnerChip,
    type InnerConnector,
    type InnerLayout,
    type InnerPlacement,
    type InnerSourceEdge,
    type InnerSourceNode,
} from './inspect/inner-topology';
import { parseDocument, safeDocumentHTML } from './documents';
import { escapeHtml, SAFE_HREF } from './markup';
import { DEFAULT_RUNG_IDS, type RungChange } from './representations/ladder';
import {
    playRepresentationChanges,
    type RepresentationPlayback,
} from './representations/playback';
import type { ReadingNode } from './reading';
import type { EdgeSpec, GraphSpec, NodeSpec } from './types';
import { isEditableTarget } from './utils/DOMUtils';
import { clamp } from './utils/math';
import { viewStateCodec } from './view-state';

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

const groupBy = <T, K>(values: readonly T[], keyOf: (value: T) => K): Map<K, T[]> => {
    const grouped = new Map<K, T[]>();
    values.forEach((value) => {
        const key = keyOf(value);
        const list = grouped.get(key) ?? [];
        list.push(value);
        grouped.set(key, list);
    });
    return grouped;
};

const pointKey = ({ nodeID, offset }: TerminalPoint): string => `${nodeID}:${offset}`;

const pointFromKey = (value: string | undefined): TerminalPoint | undefined => {
    if (!value) return undefined;
    const separator = value.lastIndexOf(':');
    const offset = Number(value.slice(separator + 1));
    if (separator < 1 || !Number.isFinite(offset) || offset < 0) return undefined;
    return { nodeID: value.slice(0, separator), offset };
};

/** URL-safe range key; ids may contain `:`, so the offset is read after the last separator. */
export const terminalRangeKey = (range: TerminalRange): string =>
    `${pointKey(range.anchor)}~${pointKey(range.focus)}`;

export const terminalRangeFromKey = (key: string | undefined): TerminalRange | undefined => {
    if (!key) return undefined;
    const [anchor, focus] = key.split('~');
    const a = pointFromKey(anchor);
    const b = pointFromKey(focus);
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

/** A wrapped row keeps its character offsets so text spans stay addressable. */
export type TerminalWrapRow = {
    readonly text: string;
    /** Start offset in the original text, in UTF-16 code units. */
    readonly start: number;
    /** Exclusive end offset in the original text. */
    readonly end: number;
    /** Display width consumed by the row. */
    readonly width: number;
};

export const terminalWrapRows = (
    text: string,
    columns: number,
    widthOf: TerminalCharWidth = unitWidth,
): readonly TerminalWrapRow[] => {
    if (!text.length) return [{ text: '', start: 0, end: 0, width: 0 }];
    if (columns <= 0)
        return [{ text, start: 0, end: text.length, width: terminalTextWidth(text, widthOf) }];
    const limit = Math.max(1, Math.floor(columns));
    const rows: TerminalWrapRow[] = [];
    let row = '';
    let start = 0;
    let index = 0;
    let width = 0;
    for (const character of text) {
        const measure = Math.max(0, widthOf(character));
        if (row && width + measure > limit) {
            rows.push({ text: row, start, end: index, width });
            row = '';
            start = index;
            width = 0;
        }
        row += character;
        width += measure;
        index += character.length;
    }
    if (row || !rows.length) rows.push({ text: row, start, end: index, width });
    return rows;
};

/** Wrap by display width so each span still maps back to an entry-id and offset. */
export const terminalWrap = (
    text: string,
    columns: number,
    widthOf: TerminalCharWidth = unitWidth,
): readonly string[] => terminalWrapRows(text, columns, widthOf).map((row) => row.text);

/** Columns available to a line at an octave; the one source for geometry and wrap rows. */
export const terminalColumns = (grid: TerminalGrid = terminalGrid(), octave = 0): number => {
    const scale = 2 ** clamp(octave, -2, 0);
    return Math.max(1, Math.floor((grid.maxWidth - grid.gutter) / (grid.charWidth * scale)));
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
    const rows = terminalWrapRows(text, terminalColumns(grid, octave), widthOf).length;
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
    const octaves = new Map(lines.map((line) => [line.id, octaveOf(line)] as const));
    const sizes = new Map(lines.map((line) => [line.id, sizeOf(line, octaves.get(line.id)!)] as const));
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
                  octaves,
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
): readonly TerminalGap[] =>
    [
        ...groupBy(
            overlays.filter((overlay) => overlay.slot === 'gap'),
            (overlay) => overlay.lineID,
        ),
    ].map(([after, entries]) => ({ after, lines: entries.length * lineUnits }));

/** Gutter and margin overlays grouped by the line they annotate, in declaration order. */
export const terminalSlots = (
    overlays: readonly TerminalOverlay[],
    slot: Exclude<TerminalSlot, 'gap'>,
): ReadonlyMap<string, readonly TerminalOverlay[]> =>
    groupBy(
        overlays.filter((overlay) => overlay.slot === slot),
        (overlay) => overlay.lineID,
    );

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
            .filter((line) => byID.has(line.id) && byID.get(line.id)!.text !== line.text)
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

/** Chapters become shareable window lens targets, never a second scope store. */
export const terminalChapterTargets = (
    chapters: readonly TerminalChapter[],
): readonly TerminalLensTarget[] =>
    chapters.map((chapter) => ({
        kind: 'window',
        window: { start: chapter.startID, end: chapter.endID },
    }));

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
    const at = clamp(Math.floor(index), 0, flat.text.length);
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
    return span.start + clamp(Math.floor(point.offset), 0, span.end - span.start);
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

/** Emphasis weights for focus, selection and matches; suitable for `applyModelEmphasis`. */
export const terminalFocusWeights = (
    lines: readonly TerminalLine[],
    focusID: string | undefined,
    selectedIDs: ReadonlySet<string> = new Set(),
    matchIDs: ReadonlySet<string> = new Set(),
): ReadonlyMap<string, number> => {
    const order = terminalOrder(lines);
    const focus = focusID === undefined ? undefined : order.get(focusID);
    return new Map(
        lines.map((line, index) => {
            const weight =
                matchIDs.has(line.id) || selectedIDs.has(line.id)
                    ? 1
                    : focus === undefined
                      ? 1
                      : clamp(1 - Math.abs(index - focus) * 0.25, 0.2, 1);
            return [line.id, weight] as const;
        }),
    );
};

export const TERMINAL_MODES = ['live', 'follow', 'snapshot', 'derived'] as const;
export type TerminalMode = (typeof TERMINAL_MODES)[number];

/** One declarative read model: window, filter, search, budget and view mode. */
export type TerminalSelector = {
    readonly rows?: TerminalWindow;
    readonly columns?: number;
    readonly filter?: (line: TerminalLine) => boolean;
    /** Committed-field facets applied before search and windowing. */
    readonly facet?: string | readonly string[];
    readonly search?: string;
    readonly searchOptions?: TerminalSearchOptions;
    readonly maxLines?: number;
    readonly follow?: boolean;
    readonly mode?: TerminalMode;
};

export const TERMINAL_FACET_KEYS = ['kind', 'status', 'role', 'turn', 'at'] as const;
export type TerminalFacetKey = (typeof TERMINAL_FACET_KEYS)[number];
export type TerminalFacetExpr = readonly [TerminalFacetKey, string];

const facetValue = (line: TerminalLine, key: TerminalFacetKey): string | undefined => {
    const value = line[key];
    return value === undefined || value === '' ? undefined : String(value);
};

/** Committed-field counts such as `kind:tool` or `status:failed`, over the supplied lines. */
export const terminalFacets = (
    lines: readonly TerminalLine[],
): ReadonlyMap<string, number> => {
    const counts = new Map<string, number>();
    lines.forEach((line) =>
        TERMINAL_FACET_KEYS.forEach((key) => {
            const value = facetValue(line, key);
            if (value === undefined) return;
            const token = `${key}:${value}`;
            counts.set(token, (counts.get(token) ?? 0) + 1);
        }),
    );
    return counts;
};

/** Parse `kind:tool status:failed`; a bare token defaults to the `kind` facet. */
export const terminalFacetExprs = (
    facet: string | readonly string[],
): readonly TerminalFacetExpr[] =>
    (typeof facet === 'string' ? facet.split(/\s+/) : facet)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => {
            const separator = token.indexOf(':');
            return separator < 0
                ? (['kind', token] as const)
                : ([token.slice(0, separator), token.slice(separator + 1)] as const);
        })
        .filter(
            (entry): entry is TerminalFacetExpr =>
                TERMINAL_FACET_KEYS.includes(entry[0] as TerminalFacetKey) && Boolean(entry[1]),
        );

/** OR within one facet key, AND across keys. */
export const terminalFacetMatch = (
    line: TerminalLine,
    exprs: readonly TerminalFacetExpr[],
): boolean => {
    if (!exprs.length) return true;
    return [...groupBy(exprs, ([key]) => key)].every(([key, values]) =>
        values.some(([, value]) => facetValue(line, key) === value),
    );
};

export type TerminalPresentation = {
    readonly wrap?: boolean;
    readonly reflow?: boolean;
    readonly lineNumbers?: boolean;
    readonly sourceStamp?: boolean;
    readonly highlightMatches?: boolean;
    /** Collapse lines to accessible glyphs at far zoom bands. */
    readonly zoomLOD?: boolean;
    readonly inlineTokens?: boolean;
    readonly focusDimming?: boolean;
    readonly markdownDetail?: boolean;
    /** Project structural edges and a group frame over the visible console window. */
    readonly graphEdges?: boolean;
    readonly continuousFidelity?: boolean;
};

const PRESENTATION_FLAGS = [
    ['wrap', 'w'],
    ['reflow', 'r'],
    ['lineNumbers', 'n'],
    ['sourceStamp', 's'],
    ['highlightMatches', 'h'],
    ['zoomLOD', 'z'],
    ['inlineTokens', 't'],
    ['focusDimming', 'f'],
    ['markdownDetail', 'm'],
    ['graphEdges', 'g'],
    ['continuousFidelity', 'v'],
] as const satisfies readonly (readonly [keyof TerminalPresentation, string])[];

/** Canonical compact key for addressable presentation flags, e.g. `nsw`. */
export const terminalPresentationKey = (presentation: TerminalPresentation): string =>
    PRESENTATION_FLAGS.filter(([flag]) => presentation[flag]).map(([, code]) => code).join('');

export const terminalPresentationFromKey = (
    key: string | undefined,
): TerminalPresentation | undefined => {
    if (key === undefined) return undefined;
    const codes = new Set(key);
    const parsed = Object.fromEntries(
        PRESENTATION_FLAGS.filter(([, code]) => codes.has(code)).map(([flag]) => [flag, true]),
    ) as TerminalPresentation;
    return key === terminalPresentationKey(parsed) ? parsed : undefined;
};

export type TerminalSelection = {
    readonly lines: readonly TerminalLine[];
    readonly matches: readonly TerminalSpan[];
    readonly hidden: readonly TerminalLine[];
};

/** Resolve a selector against committed lines; match spans use flattened global indices. */
export const terminalSelect = (
    lines: readonly TerminalLine[],
    selector: TerminalSelector = {},
): TerminalSelection => {
    const filter = selector.filter;
    const exprs = selector.facet ? terminalFacetExprs(selector.facet) : [];
    const allowed = (filter ? lines.filter((line) => filter(line)) : lines).filter((line) =>
        terminalFacetMatch(line, exprs),
    );
    const query = selector.search?.trim() ?? '';
    const allowedIDs = new Set(allowed.map((line) => line.id));
    const matches = terminalSearch(lines, query, selector.searchOptions).filter((match) =>
        allowedIDs.has(match.lineID),
    );
    const matched = new Set(matches.map((match) => match.lineID));
    let selected =
        query && selector.mode === 'derived'
            ? allowed.filter((line) => matched.has(line.id))
            : allowed;
    const { start, end } = selector.rows ?? {};
    if (start || end) {
        const from = start ? selected.findIndex((line) => line.id === start) : 0;
        const to = end ? selected.findIndex((line) => line.id === end) : selected.length - 1;
        if (from >= 0 || to >= 0) {
            const lo = from < 0 ? 0 : from;
            const hi = to < 0 ? selected.length - 1 : Math.max(lo, to);
            selected = selected.slice(lo, hi + 1);
        }
    }
    const budget = selector.maxLines;
    if (budget !== undefined && budget >= 0 && selected.length > budget)
        selected = selector.follow === false
            ? selected.slice(0, budget)
            : selected.slice(selected.length - budget);
    const kept = new Set(selected.map((line) => line.id));
    return {
        lines: selected,
        matches: matches.filter((match) => kept.has(match.lineID)),
        hidden: lines.filter((line) => !kept.has(line.id)),
    };
};

/** Materialize a selector result that stays fixed as committed lines grow. */
export const terminalSnapshot = (
    lines: readonly TerminalLine[],
    selector?: TerminalSelector,
): TerminalSelection => {
    const selection = terminalSelect(lines, selector);
    const freezeLines = (values: readonly TerminalLine[]): readonly TerminalLine[] =>
        Object.freeze(values.map((value) => Object.freeze({ ...value })));
    return Object.freeze({
        lines: freezeLines(selection.lines),
        matches: Object.freeze(selection.matches.map((match) => Object.freeze({ ...match }))),
        hidden: freezeLines(selection.hidden),
    });
};

export type TerminalConsoleCommandGates = {
    readonly selection?: boolean;
    readonly lines?: boolean;
    readonly fork?: boolean;
};

/** One catalog for the prompt, palette, context menu, keys, help and tests. */
export const terminalConsoleCommands = (
    gates: TerminalConsoleCommandGates = {},
): CommandRegistry => {
    const gate = (allowed: boolean | undefined, reason: string): string | undefined =>
        allowed === false ? reason : undefined;
    const entry = (
        id: string,
        label: string,
        hint: string,
        keywords: readonly string[] = [],
        disabledReason?: string,
    ): Command => ({
        id,
        label,
        group: 'console',
        hint,
        keywords,
        ...(disabledReason ? { disabledReason } : {}),
    });
    return new CommandRegistry([
        entry('copy', 'copy', '/copy', ['clipboard'], gate(gates.selection, 'Select lines first')),
        entry('export', 'export', '/export [markdown|json]', ['save'], gate(gates.lines, 'No console lines')),
        entry('search', 'search', '/search <text>', ['find']),
        entry('filter', 'filter', '/filter <facets>', ['scope']),
        entry('read', 'read', '/read [line]', ['document'], gate(gates.lines, 'No console lines')),
        entry('zoom', 'zoom', '/zoom <landmark>', ['scale']),
        entry('pin.live', 'pin live', '/pin live', ['follow']),
        entry('pin.snapshot', 'pin snapshot', '/pin snapshot', ['freeze']),
        entry('pin.matches', 'pin matches', '/pin matches', ['snapshot', 'find']),
        entry(
            'profile',
            'profile',
            '/profile <logs|presentation|high-contrast|big-text|fractal|documents>',
            ['theme'],
        ),
        entry('asOf', 'as of', '/as of <seq>', ['asof', 'history']),
        entry('fork', 'fork', '/fork [line]', ['branch'], gate(gates.fork, 'Nothing to fork')),
        entry('why', 'why', '/why', ['provenance']),
        entry('monitor', 'monitor', '/monitor', ['sidecar', 'logtail']),
        entry('lod', 'lod', '/lod <dot|glyph|card|detail|auto>', ['fidelity', 'density']),
        entry('graph', 'graph', '/graph [on|off]', ['edges', 'frames']),
        entry('grow', 'grow', '/grow [line]', ['graph', 'subgraph', 'expand']),
        entry('embed', 'embed', '/embed [on|off]', ['node', 'graph', 'console']),
        entry('autoZoom', 'auto zoom', '/auto zoom', ['regions', 'flyTo']),
        entry('regions', 'regions', '/regions [on|off]', ['bands']),
        entry('read.lens', 'read lens', '/read lens [scope]', ['document', 'reading']),
        entry('lens.focus', 'lens focus', '/lens focus <target>', ['bookmark', 'zoom']),
        entry('bookmark', 'bookmark', '/bookmark <0-9>', ['bm', 'recall']),
        entry('help', 'help', '/help', ['?']),
    ]);
};

export type TerminalMenuItem = {
    readonly id: string;
    readonly label: string;
    readonly group: string;
    readonly hint?: string;
    readonly disabled: boolean;
    readonly disabledReason?: string;
};

/** Menu data over the same catalog; the host supplies the focus-trapping overlay. */
export const terminalContextMenu = (
    range: TerminalRange | undefined,
    commands: readonly Command[],
): readonly TerminalMenuItem[] =>
    commands.map((command) => {
        const needsSelection = command.id === 'copy' || command.id === 'export';
        const reason =
            command.disabledReason ?? (needsSelection && !range ? 'Select lines first' : undefined);
        return {
            id: command.id,
            label: command.label,
            group: command.group,
            ...(command.hint ? { hint: command.hint } : {}),
            disabled: Boolean(reason),
            ...(reason ? { disabledReason: reason } : {}),
        };
    });

export type TerminalSearchOptions = {
    readonly regex?: boolean;
    readonly caseSensitive?: boolean;
    /** Restrict matches to lines addressed by an anchored range. */
    readonly scope?: TerminalRange;
};

/** Exact global spans over committed lines; invalid regular expressions match nothing. */
export const terminalSearch = (
    lines: readonly TerminalLine[],
    query: string,
    options: TerminalSearchOptions = {},
): readonly TerminalSpan[] => {
    if (!query) return [];
    const order = terminalOrder(lines);
    const scoped = options.scope ? terminalRangeIDs(options.scope, order) : undefined;
    const allowed = new Set(scoped ?? lines.map((line) => line.id));
    const flat = terminalFlatten(lines);
    const pattern = options.regex
        ? (() => {
              try {
                  return new RegExp(query, options.caseSensitive ? 'g' : 'gi');
              } catch {
                  return undefined;
              }
          })()
        : undefined;
    if (options.regex && !pattern) return [];
    const needle = options.caseSensitive ? query : query.toLowerCase();
    const matches: TerminalSpan[] = [];
    lines.forEach((line, index) => {
        if (!allowed.has(line.id)) return;
        const span = flat.spans[index]!;
        const text = options.caseSensitive ? line.text : line.text.toLowerCase();
        const hits: (readonly [number, number])[] = [];
        if (pattern) {
            pattern.lastIndex = 0;
            for (let found = pattern.exec(text); found; found = pattern.exec(text)) {
                hits.push([found.index, found[0].length]);
                if (!found[0].length) pattern.lastIndex++;
            }
        } else
            for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length))
                hits.push([at, needle.length]);
        hits.forEach(([start, length]) =>
            matches.push({
                lineID: line.id,
                start: span.start + start,
                end: span.start + start + length,
            }),
        );
    });
    return matches;
};

/** Convert global match spans to line-relative ranges ready for `lineHTML`. */
export const terminalMatchFlags = (
    lines: readonly TerminalLine[],
    matches: readonly TerminalSpan[],
): ReadonlyMap<string, readonly (readonly [number, number])[]> => {
    const spans = new Map(terminalFlatten(lines).spans.map((span) => [span.lineID, span] as const));
    const grouped = new Map<string, (readonly [number, number])[]>();
    matches.forEach((match) => {
        const span = spans.get(match.lineID);
        if (!span) return;
        const ranges = grouped.get(match.lineID) ?? [];
        ranges.push([match.start - span.start, match.end - span.start]);
        grouped.set(match.lineID, ranges);
    });
    return grouped;
};

/** Recompute a derived read model from the committed fold; other modes stay live views. */
export const terminalDerived = (
    lines: readonly TerminalLine[],
    selector: TerminalSelector,
): TerminalSelection => terminalSelect(lines, { ...selector, mode: 'derived' });

export type TerminalLensTarget =
    | { readonly kind: 'line'; readonly id: string }
    | { readonly kind: 'column'; readonly id: string; readonly offset: number }
    | { readonly kind: 'range'; readonly range: TerminalRange }
    | { readonly kind: 'window'; readonly window: TerminalWindow }
    | { readonly kind: 'selection'; readonly ids: readonly string[] }
    | { readonly kind: 'region'; readonly ids: readonly string[] };

export type TerminalLensRect = {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
};

export const terminalLensKey = (target: TerminalLensTarget): string => {
    switch (target.kind) {
        case 'line':
            return `line:${target.id}`;
        case 'column':
            return `column:${pointKey({ nodeID: target.id, offset: target.offset })}`;
        case 'range':
            return `range:${terminalRangeKey(target.range)}`;
        case 'window':
            return `window:${target.window.start}~${target.window.end}`;
        case 'selection':
        case 'region':
            return `${target.kind}:${target.ids.join(',')}`;
    }
};

export const terminalLensFromKey = (key: string | undefined): TerminalLensTarget | undefined => {
    if (!key) return undefined;
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    const value = key.slice(separator + 1);
    if (kind === 'line' && value) return { kind, id: value };
    if (kind === 'column') {
        const point = pointFromKey(value);
        return point ? { kind, id: point.nodeID, offset: point.offset } : undefined;
    }
    if (kind === 'range') {
        const range = terminalRangeFromKey(value);
        return range ? { kind, range } : undefined;
    }
    if (kind === 'window') {
        const [start, end] = value.split('~');
        return start && end ? { kind, window: { start, end } } : undefined;
    }
    if (kind === 'selection' || kind === 'region')
        return { kind, ids: value.split(',').filter(Boolean) };
    return undefined;
};

/** Line ids addressed by a lens target, in console order. */
export const terminalLensIDs = (
    target: TerminalLensTarget,
    ids: readonly string[],
): readonly string[] => {
    switch (target.kind) {
        case 'line':
        case 'column':
            return [target.id];
        case 'range':
            return terminalRangeIDs(
                target.range,
                new Map(ids.map((id, index) => [id, index] as const)),
            );
        case 'window':
            return ids.slice(
                Math.max(0, ids.indexOf(target.window.start)),
                target.window.end ? ids.indexOf(target.window.end) + 1 : ids.length,
            );
        case 'selection':
        case 'region':
            return target.ids;
    }
};

/** Bounding rectangle of a lens target in the shared placement space; ids never become coordinates. */
export const terminalLensRect = (
    layout: TerminalLayout,
    target: TerminalLensTarget,
    lines?: readonly TerminalLine[],
    grid: TerminalGrid = terminalGrid(),
): TerminalLensRect | undefined => {
    const ids = lines?.map((line) => line.id) ?? [...layout.placements.keys()];
    const chosen = terminalLensIDs(target, ids);
    const rects = chosen.flatMap((id) => {
        const placement = layout.placements.get(id);
        return placement
            ? [
                  {
                      x: placement.position[0] - placement.size[0] / 2,
                      y: placement.position[1] - placement.size[1] / 2,
                      width: placement.size[0],
                      height: placement.size[1],
                  },
              ]
            : [];
    });
    if (!rects.length) return undefined;
    if (target.kind === 'column') {
        const rect = rects[0]!;
        const x = rect.x + clamp(target.offset, 0, rect.width / grid.charWidth) * grid.charWidth;
        return { x, y: rect.y, width: grid.charWidth, height: rect.height };
    }
    const x = Math.min(...rects.map((rect) => rect.x));
    const y = Math.min(...rects.map((rect) => rect.y));
    return {
        x,
        y,
        width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
        height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
    };
};

export type TerminalBookmark = {
    readonly key: string;
    readonly target: TerminalLensTarget;
};

const bookmarkCodec = viewStateCodec<TerminalBookmark>({
    format: 'compact',
    keys: ['key', 'target', 'version'],
    flatten: (bookmark) => ({ key: bookmark.key, target: terminalLensKey(bookmark.target) }),
    parse: (record) => {
        if (typeof record.key !== 'string' || typeof record.target !== 'string') return undefined;
        const target = terminalLensFromKey(record.target);
        return target ? { key: record.key, target } : undefined;
    },
});

/** Thin bookmark codec over view-state; no second URI format. */
export const terminalBookmark = {
    ...bookmarkCodec,
    key: (index: number): string =>
        `bm${Number.isFinite(index) ? clamp(Math.floor(index), 0, 9) : 0}`,
};

export type TerminalReadingScope = 'all' | 'selection' | 'current' | 'last' | 'filtered';

/** Convert a selector into safe reading nodes; text and meta stay committed host facts. */
export const terminalReadingLens = (
    lines: readonly TerminalLine[],
    selector: TerminalSelector = {},
    presentation: TerminalPresentation = {},
    scope: TerminalReadingScope = 'all',
): readonly ReadingNode[] => {
    const selection = terminalSelect(lines, selector);
    const matched = new Set(selection.matches.map((match) => match.lineID));
    const order = terminalOrder(lines);
    const chosen =
        scope === 'current'
            ? lines.slice(-1)
            : scope === 'last'
              ? lines.slice(-Math.max(1, selector.maxLines ?? 8))
              : scope === 'filtered'
                ? lines.filter((line) => matched.has(line.id))
                : scope === 'selection'
                  ? selection.lines
                  : lines;
    return chosen.map((line) => ({
        id: line.id,
        label: line.label || line.kind,
        text: line.text,
        format: presentation.reflow ? 'markdown' : 'text',
        meta: {
            kind: line.kind,
            status: line.status,
            ...(presentation.lineNumbers ? { line: String((order.get(line.id) ?? 0) + 1) } : {}),
            ...(presentation.sourceStamp && line.at !== undefined
                ? { at: new Date(line.at).toISOString() }
                : {}),
        },
    }));
};

export type TerminalProfile = {
    readonly id: string;
    readonly label: string;
    readonly palette: string;
    readonly grid: Partial<TerminalGrid>;
    readonly presentation: TerminalPresentation;
};

/** Named presets replace scattered host flags; the host still owns palette application. */
export const TERMINAL_PROFILES: readonly TerminalProfile[] = [
    {
        id: 'logs',
        label: 'Logs',
        palette: 'classic',
        grid: {},
        presentation: { lineNumbers: true },
    },
    {
        id: 'presentation',
        label: 'Presentation',
        palette: 'classic',
        grid: { charWidth: 9.6, lineHeight: 18 },
        presentation: { reflow: true, lineNumbers: true },
    },
    {
        id: 'high-contrast',
        label: 'High contrast',
        palette: 'amber',
        grid: {},
        presentation: { highlightMatches: true, sourceStamp: true, lineNumbers: true },
    },
    {
        id: 'big-text',
        label: 'Big text',
        palette: 'classic',
        grid: { charWidth: 11, lineHeight: 22 },
        presentation: { wrap: true },
    },
    {
        id: 'fractal',
        label: 'Fractal text',
        palette: 'classic',
        grid: {},
        presentation: { zoomLOD: true },
    },
    {
        id: 'documents',
        label: 'Documents',
        palette: 'classic',
        grid: {},
        presentation: {
            reflow: true,
            inlineTokens: true,
            markdownDetail: true,
            focusDimming: true,
        },
    },
];

export const terminalProfile = (id: string): TerminalProfile =>
    TERMINAL_PROFILES.find((profile) => profile.id === id) ?? TERMINAL_PROFILES[0]!;

export type TerminalRegion = {
    readonly id: string;
    readonly label: string;
    readonly kind: string;
    readonly startID: string;
    readonly endID: string;
    readonly lines: readonly string[];
};

/** Infer reading regions from kind/role runs, turn changes, gaps, gutter slots and layout distance. */
export const terminalRegions = (
    lines: readonly TerminalLine[],
    layout: TerminalLayout,
    gaps: readonly TerminalGap[] = [],
    overlays: readonly TerminalOverlay[] = [],
): readonly TerminalRegion[] => {
    const after = new Set(gaps.map((gap) => gap.after));
    const gutters = new Set(
        overlays.filter((overlay) => overlay.slot === 'gutter').map((overlay) => overlay.lineID),
    );
    const groups: TerminalLine[][] = [];
    let current: TerminalLine[] = [];
    lines.forEach((line, index) => {
        const previous = lines[index - 1];
        const before = previous ? layout.placements.get(previous.id) : undefined;
        const afterPlacement = layout.placements.get(line.id);
        const distant =
            before && afterPlacement
                ? Math.abs(afterPlacement.position[1] - before.position[1]) >
                  before.size[1] + afterPlacement.size[1]
                : false;
        const boundary =
            previous &&
            (previous.kind !== line.kind ||
                previous.role !== line.role ||
                (line.turn !== undefined && previous.turn !== line.turn) ||
                after.has(previous.id) ||
                gutters.has(previous.id) ||
                distant);
        if (boundary && current.length) {
            groups.push(current);
            current = [];
        }
        current.push(line);
    });
    if (current.length) groups.push(current);
    return groups.map((group) => {
        const first = group[0]!;
        return {
            id: `region-${first.id}`,
            label: first.role ?? first.kind,
            kind: first.kind,
            startID: first.id,
            endID: group.at(-1)!.id,
            lines: group.map((line) => line.id),
        };
    });
};

export type TerminalAutoZoomOptions = {
    readonly minLines?: number;
    readonly context?: number;
};

/** Rank regions by size near the tail and keep context lines around the chosen window. */
export const terminalAutoZoom = (
    lines: readonly TerminalLine[],
    regions: readonly TerminalRegion[],
    options: TerminalAutoZoomOptions = {},
): { readonly region: TerminalRegion; readonly target: TerminalLensTarget } | undefined => {
    const candidates = regions.filter((region) => region.lines.length >= (options.minLines ?? 2));
    if (!candidates.length || !lines.length) return undefined;
    const tail = lines.length - 1;
    const ranked = candidates
        .flatMap((region) => {
            const start = lines.findIndex((line) => line.id === region.startID);
            if (start < 0) return [];
            return [{ region, start, score: region.lines.length - Math.abs(start - tail) * 0.5 }];
        })
        .sort((a, b) => b.score - a.score)[0];
    if (!ranked) return undefined;
    const context = Math.max(0, options.context ?? 1);
    const start = Math.max(0, ranked.start - context);
    const end = Math.min(
        lines.length - 1,
        ranked.start + ranked.region.lines.length - 1 + context,
    );
    return {
        region: ranked.region,
        target: {
            kind: 'window',
            window: { start: lines[start]!.id, end: lines[end]!.id },
        },
    };
};

export type TerminalGrowth = {
    readonly seed: string;
    readonly chips: readonly InnerChip[];
    readonly placements: readonly InnerPlacement[];
    readonly connectors: readonly InnerConnector[];
};

/** A bounded graph growing out of one terminal line; the host owns the markup and navigation. */
export const terminalGrow = (
    seed: string,
    nodes: readonly InnerSourceNode[],
    edges: readonly InnerSourceEdge[],
    options: {
        readonly depth?: number;
        readonly limit?: number;
        readonly layout?: InnerLayout;
    } = {},
): TerminalGrowth | undefined => {
    const chips = innerTree(seed, nodes, edges, options.depth ?? 2, options.limit ?? 6);
    if (!chips.length) return undefined;
    const placements = innerPlacements(chips, options.layout ?? 'radial');
    return { seed, chips, placements, connectors: innerConnectors(placements) };
};

export type TerminalExportFormat = 'markdown' | 'json';
export type TerminalExcerptOptions = { readonly exact?: boolean };

/** Lines addressed by a range, in linear order; an absent range exports the whole console. */
export const terminalExcerpt = (
    lines: readonly TerminalLine[],
    range?: TerminalRange,
    order: ReadonlyMap<string, number> = terminalOrder(lines),
    { exact = false }: TerminalExcerptOptions = {},
): readonly TerminalLine[] => {
    if (!range) return lines;
    const byID = new Map(lines.map((line) => [line.id, line] as const));
    const addressed = terminalRangeIDs(range, order)
        .map((id) => byID.get(id))
        .filter((line): line is TerminalLine => line !== undefined);
    if (!exact) return addressed;
    const normalized = terminalRange(range.anchor, range.focus, order);
    return addressed.map((line) => {
        const from =
            line.id === normalized.anchor.nodeID
                ? clamp(normalized.anchor.offset, 0, line.text.length)
                : 0;
        const to =
            line.id === normalized.focus.nodeID
                ? clamp(normalized.focus.offset, 0, line.text.length)
                : line.text.length;
        const text = line.text.slice(from, Math.max(from, to));
        return text === line.text ? line : { ...line, text };
    });
};

/** Shareable excerpt of a console range; ids and turn numbers stay stable across exports. */
export const terminalExport = (
    lines: readonly TerminalLine[],
    range: TerminalRange | undefined,
    format: TerminalExportFormat,
    order: ReadonlyMap<string, number> = terminalOrder(lines),
    options: TerminalExcerptOptions = {},
): string => {
    const excerpt = terminalExcerpt(lines, range, order, options);
    if (format === 'json') {
        const flat = terminalFlatten(excerpt);
        const spans = new Map(flat.spans.map((span) => [span.lineID, span] as const));
        return JSON.stringify(
            excerpt.map((line) => ({
                id: line.id,
                kind: line.kind,
                status: line.status,
                role: line.role,
                at: line.at,
                turn: line.turn,
                text: line.text,
                start: spans.get(line.id)!.start,
                end: spans.get(line.id)!.end,
            })),
        );
    }
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

/** Move a character point across flat text, using line boundaries at each separator. */
export const terminalMovePoint = (
    flat: TerminalFlatText,
    point: TerminalPoint,
    delta: number,
): TerminalPoint => {
    const at = terminalIndexOfPoint(flat, point);
    if (at === undefined) return point;
    const target = clamp(at + delta, 0, flat.text.length);
    return terminalPointAtIndex(flat, target) ?? point;
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

const paletteTokens = (text: string, accent = text) => ({
    background: '--surface',
    text,
    accent,
    muted: '--muted',
    attention: '--warn',
});

export const TERMINAL_PALETTES: readonly TerminalPalette[] = [
    { id: 'classic', label: 'Classic', glyphs: terminalGlyphs(), tokens: paletteTokens('--text', '--accent') },
    { id: 'amber', label: 'Amber', glyphs: terminalGlyphs(), tokens: paletteTokens('--accent') },
    { id: 'green', label: 'Phosphor', glyphs: terminalGlyphs(), tokens: paletteTokens('--success') },
    { id: 'retro', label: 'Retro', glyphs: retroGlyphs, tokens: paletteTokens('--text') },
];

export const terminalPalette = (id: string): TerminalPalette =>
    TERMINAL_PALETTES.find((palette) => palette.id === id) ?? TERMINAL_PALETTES[0]!;

export const lineGlyph = (line: TerminalLine, glyphs: TerminalGlyphs = terminalGlyphs()): string =>
    glyphs.kind[line.kind] ?? '·';
export const statusGlyph = (line: TerminalLine, glyphs: TerminalGlyphs = terminalGlyphs()): string =>
    glyphs.status[line.status] ?? '';

/** Reading chrome added to full-text lines; every field is optional and off by default. */
export type TerminalLineChrome = {
    readonly lineNumber?: number;
    /** ISO-8601 source stamp, escaped into a `<time>` element. */
    readonly source?: string;
    /** Pre-wrapped rows with original character offsets; emits one `tg-row` span each. */
    readonly rows?: readonly TerminalWrapRow[];
};

export type TerminalTokenKind = 'code' | 'link' | 'strong' | 'em';
export type TerminalToken = {
    readonly kind: TerminalTokenKind;
    readonly start: number;
    readonly end: number;
    /** Inner text without grammar markers; hosts escape before rendering. */
    readonly text: string;
    /** Present only when the link href passes the safe-href rule. */
    readonly href?: string;
};

/** Inline grammar tokens with source offsets; unsafe links degrade to plain text. */
export const terminalTokens = (text: string): readonly TerminalToken[] => {
    const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    const tokens: TerminalToken[] = [];
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        const [raw, code, label, href, strong, emphasis] = match;
        const start = match.index;
        const end = start + raw.length;
        if (tokens.some((token) => start < token.end && end > token.start)) continue;
        if (code !== undefined) tokens.push({ kind: 'code', start, end, text: code });
        else if (label !== undefined)
            tokens.push({
                kind: 'link',
                start,
                end,
                text: label,
                ...(SAFE_HREF.test(href!) ? { href } : {}),
            });
        else if (strong !== undefined) tokens.push({ kind: 'strong', start, end, text: strong });
        else if (emphasis !== undefined) tokens.push({ kind: 'em', start, end, text: emphasis });
    }
    return tokens;
};

type TerminalSegment = {
    readonly start: number;
    readonly end: number;
    readonly text: string;
    readonly kind?: TerminalTokenKind;
    readonly href?: string;
    readonly marked?: boolean;
};

const segmentHTML = ({ text, kind, href, marked }: TerminalSegment): string => {
    const escaped = escapeHtml(text);
    const value =
        kind === 'code'
            ? `<code>${escaped}</code>`
            : kind === 'strong'
              ? `<strong>${escaped}</strong>`
              : kind === 'em'
                ? `<em>${escaped}</em>`
                : kind === 'link' && href
                  ? `<a href="${escapeHtml(href)}">${escaped}</a>`
                  : escaped;
    return marked ? `<mark>${value}</mark>` : value;
};

/** Cut at token and match boundaries before escaping, so no tag is ever split or trusted. */
const composeText = (
    text: string,
    from: number,
    matches: readonly (readonly [number, number])[],
    tokens: readonly TerminalToken[],
): string => {
    const localTokens = tokens
        .filter((token) => token.start >= from && token.end <= from + text.length)
        .map((token) => ({ ...token, start: token.start - from, end: token.end - from }));
    const localMatches = matches
        .map(([start, end]) => [start - from, end - from] as const)
        .filter(([start, end]) => start >= 0 && end <= text.length && end > start);
    const cuts = new Set([0, text.length]);
    localTokens.forEach((token) => {
        cuts.add(token.start);
        cuts.add(token.end);
    });
    const insideToken = (value: number): boolean =>
        localTokens.some((token) => value > token.start && value < token.end);
    localMatches.forEach(([start, end]) => {
        if (!insideToken(start)) cuts.add(start);
        if (!insideToken(end)) cuts.add(end);
    });
    const sorted = [...cuts].sort((a, b) => a - b);
    return sorted
        .slice(0, -1)
        .map((start, index) => {
            const end = sorted[index + 1]!;
            if (end <= start) return '';
            const token = localTokens.find((entry) => entry.start === start && entry.end === end);
            const marked = localMatches.some(([a, b]) => a <= start && b >= end);
            return segmentHTML({
                start,
                end,
                text: token ? token.text : text.slice(start, end),
                ...(token ? { kind: token.kind, ...(token.href ? { href: token.href } : {}) } : {}),
                ...(marked ? { marked: true } : {}),
            });
        })
        .join('');
};

/** Text direction applies to the text span only; the gutter stays in logical (LTR) order. */
export const lineHTML = (
    line: TerminalLine,
    glyphs: TerminalGlyphs = terminalGlyphs(),
    direction?: 'ltr' | 'rtl',
    matches: readonly (readonly [number, number])[] = [],
    { lineNumber, source, rows }: TerminalLineChrome = {},
    tokens: readonly TerminalToken[] = [],
): string => {
    const body = rows
        ? rows
              .map(
                  (row) =>
                      `<span class="tg-row">${composeText(row.text, row.start, matches, tokens)}</span>`,
              )
              .join('')
        : composeText(line.text, 0, matches, tokens);
    const number =
        lineNumber === undefined ? '' : `<span class="tg-line-no" aria-hidden="true">${lineNumber}</span>`;
    const stamp =
        source === undefined
            ? ''
            : `<time class="tg-source" datetime="${escapeHtml(source)}">${escapeHtml(source)}</time>`;
    return `${number}<span class="tg-gutter">${escapeHtml(lineGlyph(line, glyphs))} ${escapeHtml(statusGlyph(line, glyphs))}</span><span class="tg-text"${direction ? ` dir="${direction}"` : ''}>${body}</span>${stamp}`;
};

export const TERMINAL_LOD_BANDS = ['dot', 'glyph', 'card', 'detail'] as const;
export type TerminalLODBand = (typeof TERMINAL_LOD_BANDS)[number];

export type TerminalLODStops = {
    readonly dot?: number;
    readonly glyph?: number;
    readonly detail?: number;
};

const DEFAULT_LOD_STOPS: TerminalLODStops = { dot: 0.15, glyph: 0.4, detail: 0.9 };

/** Map a continuous zoom position (0 far, 1 near) onto the terminal fidelity ladder. */
export const terminalLODFor = (
    normalized: number,
    ladder: readonly string[] = DEFAULT_RUNG_IDS,
    stops: TerminalLODStops = DEFAULT_LOD_STOPS,
): string => {
    const index =
        normalized < (stops.dot ?? 0.15)
            ? 0
            : normalized < (stops.glyph ?? 0.4)
              ? 1
              : normalized < (stops.detail ?? 0.9)
                ? 2
                : ladder.length - 1;
    return ladder[index]!;
};

/** Continuous fidelity from a scale-domain importance sample; never scales node geometry. */
export type TerminalFidelity = {
    readonly opacity: number;
    readonly stagger: number;
};

export const terminalFidelity = (
    importance: number,
    band: string = 'card',
): TerminalFidelity => {
    const value = clamp(importance, 0, 1);
    const floors: Readonly<Record<string, number>> = { dot: 0.45, glyph: 0.55, card: 0.7, detail: 1 };
    const floor = floors[band] ?? 0.7;
    return {
        opacity: clamp(floor + value * (1 - floor), 0, 1),
        stagger: band === 'detail' ? 0 : Math.round((1 - value) * 3) * 16,
    };
};

/** A stable-id fidelity swap played through the shared representation clock. */
export const terminalFidelityChange = (
    from: string,
    to: string,
    duration = 0.18,
): RungChange | undefined =>
    from === to ? undefined : { id: `fidelity:${to}`, from, to, duration };

export const playTerminalFidelity = (
    change: RungChange | undefined,
    interpolate: (value: number) => void,
    options: { readonly reducedMotion?: boolean } = {},
): RepresentationPlayback | undefined =>
    change
        ? playRepresentationChanges([change], (_, value) => interpolate(value), options)
        : undefined;

export type TerminalLineHTMLOptions = {
    readonly direction?: 'ltr' | 'rtl';
    readonly matches?: readonly (readonly [number, number])[];
    readonly band?: string;
    readonly ladder?: readonly string[];
    /** Characters kept in the label stage between glyph and full text. */
    readonly labelChars?: number;
    /** Visible reading chrome, applied only in the full-text band. */
    readonly chrome?: TerminalLineChrome;
    readonly tokens?: readonly TerminalToken[];
};

/** Zoom fidelity: glyph, short label, or full text. Identity and text stay addressable throughout. */
export const terminalLineHTML = (
    line: TerminalLine,
    glyphs: TerminalGlyphs = terminalGlyphs(),
    {
        direction,
        matches = [],
        band,
        ladder = DEFAULT_RUNG_IDS,
        labelChars = 20,
        chrome = {},
        tokens = [],
    }: TerminalLineHTMLOptions = {},
): string => {
    const at = band ? ladder.indexOf(band) : ladder.length - 1;
    const label = line.text || line.label;
    const escaped = escapeHtml(label);
    const gutter = `<span class="tg-gutter">${escapeHtml(lineGlyph(line, glyphs))} ${escapeHtml(statusGlyph(line, glyphs))}</span>`;
    if (at === 0)
        return `<span class="tg-glyph-only" aria-label="${escaped}" title="${escaped}">${escapeHtml(lineGlyph(line, glyphs))}</span>`;
    if (at === 1) {
        const short = escapeHtml(label.slice(0, Math.max(1, labelChars)).trim());
        const suffix = label.length > labelChars ? '…' : '';
        return `${gutter}<span class="tg-glyph-label" aria-label="${escaped}" title="${escaped}">${short}${suffix}</span>`;
    }
    return lineHTML(line, glyphs, direction, matches, chrome, tokens);
};

export type TerminalDetail = {
    readonly title: string;
    readonly fields: readonly (readonly [string, string])[];
    readonly text?: string;
};

export type TerminalDetailOptions = {
    readonly format?: 'text' | 'markdown';
};

/** Safe, escaped markup for an expandable detail card in any of the overlay slots. */
export const terminalDetailHTML = (
    detail: TerminalDetail,
    { format = 'text' }: TerminalDetailOptions = {},
): string => {
    const rows = detail.fields
        .map(
            ([key, value]) =>
                `<span class="tg-detail-field"><b>${escapeHtml(key)}</b> ${escapeHtml(value)}</span>`,
        )
        .join('');
    const body = detail.text
        ? format === 'markdown'
            ? safeDocumentHTML(detail.text)
            : `<p>${escapeHtml(detail.text)}</p>`
        : '';
    return `<div class="tg-detail"><strong>${escapeHtml(detail.title)}</strong>${body}<div class="tg-detail-fields">${rows}</div></div>`;
};

/** Card geometry from parsed block count; text cards keep the compact host dimensions. */
export const terminalDetailSize = (
    detail: TerminalDetail,
    grid: TerminalGrid = terminalGrid(),
    format: 'text' | 'markdown' = 'text',
    mode: 'inline' | 'popup' | 'rail' = 'popup',
): readonly [number, number] => {
    if (format === 'text')
        return [mode === 'inline' ? grid.maxWidth : 360, mode === 'inline' ? 30 : 84];
    const blocks = parseDocument(detail.text ?? '').length;
    const width = clamp(grid.maxWidth * 0.55, grid.minWidth, grid.maxWidth);
    const height = Math.max(mode === 'inline' ? 30 : 84, blocks * grid.lineHeight + grid.gutter);
    return [width, clamp(height, grid.lineHeight, grid.maxWidth)];
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
        composer?.destroy();
        composer = mountComposer(field, {
            onSubmit: options.onSubmit,
            history: options.history,
            commands: options.commands,
            onCommand: options.onCommand,
            onComplete: options.onComplete,
        });
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
    /** Committed lines; enables character-precise Shift+ArrowLeft/Right movement. */
    readonly lines?: () => readonly TerminalLine[];
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
        if (!target) return;
        const nodes = [...container.querySelectorAll<HTMLElement>(selector)];
        const ids = nodes.flatMap((entry) => {
            const id = entry.dataset['nodeId'];
            return id ? [id] : [];
        });
        const order = new Map(ids.map((id, position) => [id, position] as const));
        if (
            event.shiftKey &&
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
            options.onSelect &&
            options.lines
        ) {
            event.preventDefault();
            const lines = options.lines();
            const selection = options.selection?.();
            const current = selection?.focus ?? { nodeID: target.dataset['nodeId']!, offset: 0 };
            const focus = terminalMovePoint(
                terminalFlatten(lines),
                current,
                event.key === 'ArrowRight' ? 1 : -1,
            );
            const range = terminalRange(selection?.anchor ?? current, focus, order);
            options.onSelect(range);
            say(`Selected ${terminalRangeText(range, lines, order)} characters`);
            return;
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
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

/** Structural spine/parent/overlay edges, deduped and restricted to visible endpoints. */
export const terminalEdges = (
    lines: readonly TerminalLine[],
    visible: readonly TerminalLine[],
    layout: TerminalLayout,
    overlays: readonly TerminalOverlay[] = [],
): readonly EdgeSpec[] => {
    const visibleIDs = new Set(visible.map((line) => line.id));
    const edges = new Map<string, EdgeSpec>();
    const add = (edge: EdgeSpec): void => {
        if (!edges.has(edge.id)) edges.set(edge.id, edge);
    };
    layout.spine.forEach((id, index) => {
        const previous = layout.spine[index - 1];
        if (previous && visibleIDs.has(previous) && visibleIDs.has(id))
            add({ id: `${previous}->${id}`, source: previous, target: id, type: 'CurvedEdge' });
    });
    lines.forEach((line) => {
        if (line.parent && visibleIDs.has(line.parent) && visibleIDs.has(line.id))
            add({
                id: `${line.parent}->${line.id}`,
                source: line.parent,
                target: line.id,
                type: line.octave === -1 ? 'DottedEdge' : 'Edge',
            });
    });
    overlays.forEach((overlay) => {
        if (overlay.edge && visibleIDs.has(overlay.lineID)) add(overlay.edge);
    });
    return [...edges.values()];
};

/** A structural group frame around the line nodes addressed by a lens target. */
export type TerminalGroupNode = {
    readonly id: string;
    readonly position: readonly [number, number, number];
    readonly size?: readonly [number, number, number];
};

export type TerminalGroup = {
    readonly id: string;
    readonly members: readonly string[];
    readonly position: readonly [number, number, number];
    readonly size: readonly [number, number];
};

export const terminalGroup = (
    target: TerminalLensTarget,
    nodes: readonly TerminalGroupNode[],
): TerminalGroup | undefined => {
    const ids = new Set(terminalLensIDs(target, nodes.map((node) => node.id)));
    const members = nodes.filter((node) => ids.has(node.id));
    if (!members.length) return undefined;
    const bounds = members.map((node) => {
        const width = (node.size?.[0] ?? 0) / 2;
        const height = (node.size?.[1] ?? 0) / 2;
        return {
            left: node.position[0] - width,
            right: node.position[0] + width,
            top: node.position[1] - height,
            bottom: node.position[1] + height,
        };
    });
    const left = Math.min(...bounds.map((box) => box.left));
    const right = Math.max(...bounds.map((box) => box.right));
    const top = Math.min(...bounds.map((box) => box.top));
    const bottom = Math.max(...bounds.map((box) => box.bottom));
    return {
        id: `group:${terminalLensKey(target)}`,
        members: members.map((node) => node.id),
        position: [(left + right) / 2, (top + bottom) / 2, 0],
        size: [right - left + 24, bottom - top + 12],
    };
};

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
    /** Active zoom ladder band; far bands render glyph-only lines. */
    readonly band?: string;
    readonly render?: (line: TerminalLine) => string;
    /** Explicit selector result; wins over the window slice when provided. */
    readonly selection?: TerminalSelection;
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
    const render = options.render ?? ((line: TerminalLine) => terminalLineHTML(line, options.glyphs, { band: options.band }));
    const selected = options.selection?.lines;
    const selectedIDs = selected ? new Set(selected.map((line) => line.id)) : undefined;
    const startIndex = ids.indexOf(window.start);
    const endIndex = ids.indexOf(window.end);
    const visible = selectedIDs
        ? lines.filter((line) => selectedIDs.has(line.id))
        : lines.filter((_, index) => index >= startIndex && index <= endIndex);
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
    const revealed = terminalOverlays(options.overlays ?? [], options.reveal ?? {});
    revealed.forEach((overlay) => {
        if (visibleIDs.has(overlay.lineID) && overlay.node) nodes.push(overlay.node);
    });
    const edges = [...terminalEdges(lines, visible, layout, revealed)];
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
    readonly selector?: TerminalSelector;
    readonly selection?: TerminalSelection;
    readonly matches?: readonly TerminalSpan[];
    readonly presentation?: TerminalPresentation;
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
    /** Initial declarative read model; live/follow/snapshot/derived are its modes. */
    readonly selector?: TerminalSelector;
    readonly presentation?: TerminalPresentation;
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
    setSelector(selector: TerminalSelector): void;
    selector(): TerminalSelector;
    setMode(mode: TerminalMode): void;
    /** Resolved selector result for the current committed lines and window. */
    view(): TerminalSelection;
    /** Active zoom ladder band, mapped by the host from its renderer band. */
    band(): string;
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
    let selector: TerminalSelector = hooks.selector ?? {};
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
    let dirty = true;
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
    const grid = (): TerminalGrid => {
        const base = hooks.grid ?? terminalGrid();
        return selector.columns
            ? {
                  ...base,
                  maxWidth: Math.max(
                      base.minWidth,
                      Math.floor(selector.columns * base.charWidth + base.gutter),
                  ),
              }
            : base;
    };
    const layout = (): TerminalLayout => terminalLayout(lines, grid(), hooks.lane);
    const view = (): TerminalSelection =>
        terminalSelect(lines, { ...selector, rows: selector.rows ?? windowState });
    const selectedIDs = (): readonly string[] => (range ? terminalRangeIDs(range, index) : []);
    const rangeKey = (value: TerminalRange | undefined): string =>
        value ? terminalRangeKey(value) : '';

    const project = (): Model => {
        const selection = view();
        const context: TerminalProjectionContext = {
            lines,
            visible: selection.lines,
            order: ids,
            index,
            window: windowState,
            gaps,
            overlays,
            band,
            layout: layout(),
            selector,
            selection,
            matches: selection.matches,
            presentation: hooks.presentation,
        };
        if (hooks.project) return hooks.project(context);
        return terminalSpec(lines, {
            grid: grid(),
            lane: hooks.lane,
            window: hooks.windowConfig,
            range: windowState,
            gaps,
            overlays: terminalOverlays(overlays, { band, selected: new Set(selectedIDs()) }),
            glyphs: palette.glyphs,
            band,
            selection,
        }).spec as Model;
    };

    const apply = (): void => {
        if (dirty) {
            sink.render(project());
            const filter = hooks.filter;
            if (filter) lines.forEach((entry) => sink.show(entry.id, filter(entry)));
            const selected = selectedIDs();
            sink.select(selected.length ? selected : focusID || null);
            dirty = false;
        }
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
        dirty = true;
        apply();
    };

    const unsubscribeNode = sink.onNodeClick((id) => {
        if (focusID !== id) dirty = true;
        focusID = id;
        sink.select(id);
        hooks.onReveal?.(id);
    });
    const unsubscribeBand = sink.onZoomBand((next) => {
        if (next === band) return;
        band = next;
        dirty = true;
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
            if (startID !== windowState.start || endID !== windowState.end) {
                churn = { ...churn, slides: churn.slides + 1 };
                dirty = true;
            }
            windowState = { start: startID, end: endID };
            following = false;
            apply();
        },
        select: (next) => {
            if (rangeKey(next) !== rangeKey(range)) dirty = true;
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
            if (palette.id !== id) dirty = true;
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
            if (next !== overlays) dirty = true;
            overlays = next;
            apply();
        },
        followTail: (enabled) => {
            if (following !== enabled) dirty = true;
            following = enabled;
            if (enabled) commit(lines);
            else apply();
        },
        focusLine: (id) => {
            if (!lines.some((entry) => entry.id === id) || focusID === id) return;
            focusID = id;
            if (following) moveWindow(id);
            hooks.onFocus?.(id);
            apply();
        },
        setSelector: (next) => {
            if (next !== selector) dirty = true;
            selector = next;
            apply();
        },
        selector: () => selector,
        setMode: (mode) => {
            if (selector.mode !== mode) dirty = true;
            selector = { ...selector, mode };
            apply();
        },
        view,
        band: () => band,
        refresh: () => {
            dirty = true;
            apply();
        },
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
