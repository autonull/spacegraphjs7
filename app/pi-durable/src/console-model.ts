import {
    escapeHtml,
    type RenderEdge,
    type RenderModel,
    type RenderNode,
} from '@spacegraphjs/renderer';
import { applyModelEmphasis, mappingFor } from 'spacegraphjs/salience';
import {
    terminalChapterTargets,
    terminalChapters,
    terminalColumns,
    terminalLineHTML,
    terminalMatchFlags,
    terminalGaps,
    terminalOrder,
    terminalPlace,
    terminalOverlays,
    terminalOverlayGaps,
    terminalPromptHTML,
    terminalRangeIDs,
    terminalEdges,
    terminalFocusWeights,
    terminalGroup,
    terminalSlots,
    terminalTokens,
    terminalWrapRows,
    type TerminalGlyphs,
    type TerminalGrid,
    type TerminalLine,
    type TerminalLineChrome,
    type TerminalLensTarget,
    type TerminalPresentation,
    type TerminalProjectionContext,
    type TerminalRange,
} from 'spacegraphjs/terminal';
const DIM_MAPPING = mappingFor(['opacity', 'glow'], { opacity: [0.35, 1] });

export type ConsoleModelState = {
    readonly grid: TerminalGrid;
    readonly glyphs: TerminalGlyphs;
    readonly lines: readonly TerminalLine[];
    readonly selection?: TerminalRange;
    /** Controller cache; falls back to rebuilding the order for standalone callers. */
    readonly index?: ReadonlyMap<string, number>;
    readonly direction?: 'ltr' | 'rtl';
    /** Distinct prompt node id when multiple consoles share one scene. */
    readonly promptID?: string;
    readonly detailMode: 'inline' | 'popup' | 'rail';
    readonly presentation?: TerminalPresentation;
    readonly dimNonMatches?: boolean;
    /** Zoom-derived ladder band; used only when `presentation.zoomLOD` is set. */
    readonly lod?: string;
    /** Line under the pointer, for `reveal: 'hover'` overlays. */
    readonly hovered?: string;
    /** Followed line, used as the focus centre for dimming. */
    readonly focusID?: string;
    /** Lens target to frame as a structural group when graph projection is enabled. */
    readonly graphTarget?: TerminalLensTarget;
    readonly edges?: boolean;
    readonly chapterFrames?: boolean;
};

const lineStatus = (status: string): RenderNode['status'] =>
    status === 'failed' || status === 'error'
        ? 'error'
        : ['pending', 'sleeping', 'waiting', 'running'].includes(status)
          ? 'warning'
          : status === 'complete'
            ? 'success'
            : 'neutral';

/** Project a terminal window into the renderer model without touching host kernel state. */
export const consoleModel = (
    {
        visible,
        order,
        overlays,
        band,
        lines: committed,
        matches,
        presentation,
        selection,
    }: TerminalProjectionContext,
    state: ConsoleModelState,
): RenderModel => {
    const { grid, glyphs, lines, detailMode } = state;
    const flags = presentation ?? state.presentation;
    const projected = selection?.lines ?? visible;
    const rangesByLine = terminalMatchFlags(committed, matches ?? []);
    const index = state.index ?? terminalOrder(lines);
    const selected = state.selection
        ? new Set(terminalRangeIDs(state.selection, index))
        : new Set<string>();
    const revealedBand = flags?.zoomLOD && state.lod ? state.lod : band;
    const revealed = terminalOverlays(overlays, {
        band: revealedBand,
        hovered: state.hovered,
        selected,
    });
    const offsets = terminalGaps(
        order,
        terminalOverlayGaps(revealed, detailMode === 'inline' ? 3 : 2),
        grid.lineHeight,
    );
    const lineWidth = grid.maxWidth;
    const layout = terminalPlace(visible, grid, {
        width: lineWidth,
        rowGap: 4,
        trimGutter: true,
    });
    const lineNodes: RenderNode[] = projected.map((entry) => {
        const placement = layout.placements.get(entry.id)!;
        const [width, height] = placement.size;
        const ranges = flags?.highlightMatches ? (rangesByLine.get(entry.id) ?? []) : [];
        const number = (index.get(entry.id) ?? 0) + 1;
        const source = entry.at === undefined ? undefined : new Date(entry.at).toISOString();
        const tokens = flags?.inlineTokens ? terminalTokens(entry.text) : [];
        const chrome: TerminalLineChrome = {
            ...(flags?.lineNumbers ? { lineNumber: number } : {}),
            ...(flags?.sourceStamp && source ? { source } : {}),
            ...(flags?.wrap
                ? { rows: terminalWrapRows(entry.text, terminalColumns(grid, placement.octave)) }
                : {}),
        };
        const attrs = `data-selected="${selected.has(entry.id)}" data-kind="${escapeHtml(
            entry.kind,
        )}" data-status="${escapeHtml(entry.status)}" data-role="${escapeHtml(entry.role ?? '')}"${
            flags?.zoomLOD && state.lod ? ` data-lod="${escapeHtml(state.lod)}"` : ''
        }${flags?.lineNumbers ? ` data-line-no="${number}"` : ''}${
            chrome.source ? ` data-source="${escapeHtml(chrome.source)}"` : ''
        }`;
        const className = `sg-terminal-line${flags?.wrap ? ' sg-terminal-wrap' : ''}${
            flags?.reflow ? ' sg-terminal-reflow' : ''
        }`;
        return {
            id: entry.id,
            kind: entry.kind,
            label: entry.label,
            html: `<div class="${className}" ${attrs}>${terminalLineHTML(entry, glyphs, {
                direction: state.direction,
                matches: ranges,
                band: flags?.zoomLOD ? state.lod : undefined,
                chrome,
                tokens,
            })}</div>`,
            position: [
                placement.position[0],
                placement.position[1] + (offsets.get(entry.id) ?? 0),
                placement.position[2],
            ],
            size: [width, height, 1],
            status: lineStatus(entry.status),
            interactive: true,
            data: { terminal: true, useRawHtml: true },
        };
    });
    const nodes: RenderNode[] = [...lineNodes];
    const byID = new Map(lineNodes.map((node) => [node.id, node] as const));
    const group = state.graphTarget ? terminalGroup(state.graphTarget, lineNodes) : undefined;
    if (group) {
        const members = new Set(group.members);
        nodes.push({
            id: group.id,
            kind: 'terminal-group',
            label: 'Console scope',
            shape: 'group',
            position: [...group.position],
            size: [group.size[0], group.size[1], 1],
            status: 'neutral',
            data: { members: group.members },
        });
        lineNodes.forEach((node) => {
            if (members.has(node.id)) node.parent = group.id;
        });
    }
    if (state.chapterFrames) {
        const chapters = terminalChapters(lines);
        terminalChapterTargets(chapters).forEach((target, index) => {
            const frame = terminalGroup(target, lineNodes);
            if (!frame) return;
            const id = `chapter-group-${index + 1}`;
            nodes.push({
                id,
                kind: 'terminal-chapter',
                label: chapters[index]!.label,
                shape: 'group',
                position: [...frame.position],
                size: [frame.size[0], frame.size[1], 1],
                status: 'neutral',
                data: { members: frame.members, chapter: chapters[index]!.id, lens: `window:${chapters[index]!.startID}~${chapters[index]!.endID}` },
            });
            frame.members.forEach((member) => {
                const node = byID.get(member);
                if (node && !node.parent) node.parent = id;
            });
        });
    }

    terminalSlots(revealed, 'gutter').forEach((entries, lineID) => {
        const line = byID.get(lineID);
        if (!line) return;
        entries.forEach((entry, index) =>
            nodes.push({
                id: entry.id,
                kind: 'terminal-gutter',
                label: 'attention',
                html: '<span class="sg-terminal-gutter">!</span>',
                position: [
                    line.position[0] - (line.size?.[0] ?? lineWidth) / 2 - 14,
                    line.position[1] + index * 10,
                    0,
                ],
                size: [12, 12, 1],
                status: 'warning',
                interactive: false,
                data: { terminalGutter: true, useRawHtml: true },
            }),
        );
    });

    revealed
        .filter((entry) => entry.node)
        .forEach((entry) => {
            const anchor = byID.get(entry.lineID);
            const spec = entry.node!;
            const html = spec.data?.['html'];
            if (!anchor || !html) return;
            const width = (spec.data?.['width'] as number) ?? 320;
            const height = (spec.data?.['height'] as number) ?? 60;
            const right = anchor.position[0] + (anchor.size?.[0] ?? lineWidth) / 2;
            const x =
                entry.mode === 'inline'
                    ? anchor.position[0]
                    : right + (entry.mode === 'rail' ? 48 : 24) + width / 2;
            const y =
                entry.mode === 'inline'
                    ? anchor.position[1] - (anchor.size?.[1] ?? 18) / 2 - height / 2 - 6
                    : anchor.position[1] - (entry.mode === 'rail' ? 40 : 0);
            nodes.push({
                id: spec.id,
                kind: 'terminal-detail',
                label: 'detail',
                html: String(html),
                position: [x, y, 0],
                size: [width, height, 1],
                status: 'neutral',
                interactive: true,
                data: {
                    terminalDetail: true,
                    useRawHtml: true,
                    className: `terminal-detail-${entry.mode ?? 'inline'}`,
                },
            });
        });

    const last = lineNodes.at(-1);
    if (last)
        nodes.push({
            id: state.promptID ?? 'terminal-prompt',
            kind: 'prompt',
            label: 'Prompt',
            html: terminalPromptHTML('Send a message'),
            position: [last.position[0], last.position[1] - 24, 0],
            size: [lineWidth, 22, 1],
            status: 'neutral',
            interactive: true,
            data: { terminal: true },
        });
    const edges: RenderEdge[] = state.edges
        ? terminalEdges(lines, projected, layout, revealed).map((edge) => ({
              id: `console:${edge.id}`,
              source: edge.source,
              target: edge.target,
              kind: edge.type ?? 'edge',
              style: edge.type === 'DottedEdge' ? 'dotted' : 'solid',
              directed: true,
              data: { terminal: true },
          }))
        : [];
    const model: RenderModel = { nodes, edges };
    if (flags?.focusDimming) {
        const weights = terminalFocusWeights(
            lines,
            state.focusID,
            selected,
            new Set(rangesByLine.keys()),
        );
        return applyModelEmphasis(model, weights, DIM_MAPPING);
    }
    if (!state.dimNonMatches || !rangesByLine.size) return model;
    const lineIDs = new Set(lineNodes.map((node) => node.id));
    const emphasis = new Map(
        nodes.map((node) => [node.id, lineIDs.has(node.id) && !rangesByLine.has(node.id) ? 0 : 1]),
    );
    return applyModelEmphasis(model, emphasis, DIM_MAPPING);
};
