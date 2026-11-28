import {
    escapeHtml,
    type RenderModel,
    type RenderNode,
} from '@spacegraphjs/renderer';
import {
    lineHTML,
    terminalGaps,
    terminalOrder,
    terminalPlace,
    terminalOverlays,
    terminalOverlayGaps,
    terminalPromptHTML,
    terminalRangeIDs,
    terminalSlots,
    type TerminalGlyphs,
    type TerminalGrid,
    type TerminalLine,
    type TerminalProjectionContext,
    type TerminalRange,
} from 'spacegraphjs/terminal';

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
    { visible, order, overlays, band }: TerminalProjectionContext,
    state: ConsoleModelState,
): RenderModel => {
    const { grid, glyphs, lines, detailMode } = state;
    const selected = state.selection
        ? new Set(terminalRangeIDs(state.selection, state.index ?? terminalOrder(lines)))
        : new Set<string>();
    const revealed = terminalOverlays(overlays, { band });
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
    const lineNodes: RenderNode[] = visible.map((entry) => {
        const placement = layout.placements.get(entry.id)!;
        const [width, height] = placement.size;
        const attrs = `data-selected="${selected.has(entry.id)}" data-kind="${escapeHtml(
            entry.kind,
        )}" data-status="${escapeHtml(entry.status)}" data-role="${escapeHtml(entry.role ?? '')}"`;
        return {
            id: entry.id,
            kind: entry.kind,
            label: entry.label,
            html: `<div class="sg-terminal-line" ${attrs}>${lineHTML(entry, glyphs, state.direction)}</div>`,
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
    return { nodes, edges: [] };
};
