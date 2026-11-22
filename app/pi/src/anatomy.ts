import { escapeHtml, type CardContext } from '@spacegraphjs/adapter';
import { innerConnectors, innerPlacements, type InnerChip, type InnerLayout } from './inner';

export type AnatomyRung = 'overview' | 'execution' | 'detail';
export type PortSide = 'start' | 'end' | 'top' | 'bottom';

export interface NodePorts {
    readonly source?: PortSide;
    readonly target?: PortSide;
}

interface AnatomyNode {
    readonly id: string;
    readonly label: string;
    readonly summary?: string;
    readonly status: string;
    readonly kind: string;
    readonly scope?: string;
    readonly focusRole?: string;
    readonly data?: Readonly<Record<string, unknown>>;
}

/** Ports read from node data, which the host derives from edges and positions. */
export const nodePorts = (node: AnatomyNode): NodePorts | undefined => {
    const ports = node.data?.ports;
    return ports && typeof ports === 'object' ? (ports as NodePorts) : undefined;
};

/** The side facing the majority of neighbours on each edge direction, in card-local CSS sides. */
export const derivePorts = (
    id: string,
    edges: readonly { readonly source: string; readonly target: string }[],
    positionOf: (id: string) => { readonly x: number; readonly y: number } | undefined,
): NodePorts | undefined => {
    const neighbours = (role: 'source' | 'target'): readonly string[] =>
        edges
            .filter((edge) => edge[role] === id)
            .map((edge) => (role === 'source' ? edge.target : edge.source));
    const outgoing = neighbours('source');
    const incoming = neighbours('target');
    if (!outgoing.length && !incoming.length) return undefined;
    const side = (ids: readonly string[], fallback: PortSide): PortSide => {
        const here = positionOf(id);
        if (!here) return fallback;
        const sum = ids.reduce(
            (total, other) => {
                const pos = positionOf(other);
                return pos
                    ? { x: total.x + pos.x - here.x, y: total.y + pos.y - here.y }
                    : total;
            },
            { x: 0, y: 0 },
        );
        if (!sum.x && !sum.y) return fallback;
        return Math.abs(sum.x) >= Math.abs(sum.y)
            ? sum.x >= 0 ? 'end' : 'start'
            : sum.y >= 0 ? 'top' : 'bottom';
    };
    return {
        ...(outgoing.length ? { source: side(outgoing, 'end') } : {}),
        ...(incoming.length ? { target: side(incoming, 'start') } : {}),
    };
};

const PORTAL_GLYPHS = ['▣', '▤', '▥', '▦'] as const;
const SHAPE_SPAN = '<i class="rung-shape" aria-hidden="true"></i>';

/** A stable glyph per child scope, so a portal keeps the same identity across rungs and rebuilds. */
export const portalGlyph = (scope: string): string =>
    PORTAL_GLYPHS[[...scope].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PORTAL_GLYPHS.length]!;

const detailOf = (node: AnatomyNode): string => {
    const data = node.data ?? {};
    for (const key of ['text', 'summary', 'path', 'args', 'result', 'reason', 'level', 'fullLabel']) {
        if (typeof data[key] === 'string' && data[key]) return String(data[key]);
    }
    return node.summary ?? '';
};

const actionButton = (action: string, target: string, label: string, title: string): string =>
    `<button type="button" class="focus-button" data-node-action="${action}" data-target="${escapeHtml(target)}" data-sg-interactive="true" title="${escapeHtml(title)}">${escapeHtml(label)}</button>`;

/** Header: the label plus any trailing status and signal, in one horizontal part. */
export const anatomyHeader = (title: string, size: number, trailing = ''): string =>
    `<span class="anatomy-head" style="font-size:${size}px"><span class="anatomy-title">${title}</span>${trailing}</span>`;

export const anatomyStatus = (status: string): string =>
    `<span class="anatomy-status focus-status">${status}</span>`;

/** A compact status channel for cards; the full chip is reserved for the enlarged lens. */
export const anatomyStatusDot = (status: string): string =>
    `<i class="anatomy-status-dot" data-anatomy-status="${status}" title="${status}" aria-label="${status}"></i>`;

export const anatomySignal = (heights: readonly number[]): string =>
    `<span class="anatomy-signal" aria-hidden="true">${heights.map((height) => `<i style="height:${Math.round(height * 100)}%"></i>`).join('')}</span>`;

export const anatomyRow = (content: string, tone: 'body' | 'meta' = 'body', extraClass = ''): string =>
    `<span class="anatomy-row${extraClass ? ` ${extraClass}` : ''}" data-tone="${tone}">${content}</span>`;

export const anatomyPort = (role: 'source' | 'target', side: PortSide): string =>
    `<i class="anatomy-port" data-port="${role}" data-side="${side}" aria-hidden="true"></i>`;

const portParts = (node: AnatomyNode): string => {
    const ports = nodePorts(node);
    return [
        ports?.target ? anatomyPort('target', ports.target) : '',
        ports?.source ? anatomyPort('source', ports.source) : '',
    ].join('');
};

type Arrangement = 'scope' | 'unit' | 'message' | 'tool' | 'artifact' | 'gate' | 'failure' | 'default';

const arrangementOf = (node: AnatomyNode): Arrangement => {
    if (node.scope || node.kind === 'run') return 'scope';
    switch (node.kind) {
        case 'unit': return 'unit';
        case 'message': return 'message';
        case 'tool':
        case 'read-tool':
        case 'action': return 'tool';
        case 'artifact':
        case 'file': return 'artifact';
        case 'approval': return 'gate';
        case 'error':
        case 'retry': return 'failure';
        default: return 'default';
    }
};

/** Every kind Pi renders gets the same anatomy; the default ladder stays the fallback. */
export const ANATOMY_KINDS = [
    'run', 'unit', 'message', 'action', 'tool', 'read-tool', 'artifact', 'file',
    'approval', 'error', 'state', 'retry',
] as const;

const SIGNAL_HEIGHTS = [0.3, 0.55, 0.8, 0.5, 0.95] as const;

/** The card skeleton per rung: a distinct arrangement of the same four parts. */
export const anatomyCard = (
    node: AnatomyNode,
    rung: AnatomyRung,
    context: CardContext,
    blend = 0,
    descending = false,
    labelPx = 0,
): string => {
    const arrangement = arrangementOf(node);
    const label = escapeHtml(node.label);
    const detail = escapeHtml(detailOf(node));
    const status = escapeHtml(node.status);
    const glyph = node.scope
        ? `<span aria-hidden="true" style="opacity:.7">${portalGlyph(node.scope)} </span>`
        : '';
    const badge = context.count ? `<span class="anatomy-count">${context.count}</span>` : '';
    const attributes = `data-rung="${rung}" data-blend="${blend.toFixed(2)}" data-kind="${escapeHtml(node.kind)}" data-status="${status}" data-focus="${escapeHtml(node.focusRole ?? 'none')}" data-anatomy="${arrangement}"${node.scope ? ` data-portal="${escapeHtml(node.scope)}"` : ''}${descending ? ' data-descending="true"' : ''}`;
    const box = 'position:relative;display:flex;flex-direction:column;justify-content:center;gap:var(--sg-spacing-hair);padding:6% 8%;box-sizing:border-box;height:100%;color:inherit;font-family:inherit;overflow:hidden;transition:opacity var(--pi-blend,120ms)';
    const ports = portParts(node);

    if (rung === 'overview') {
        return `<div ${attributes} class="anatomy" style="${box}">${SHAPE_SPAN}${anatomyHeader(`${glyph}${label}`, labelPx || 44, badge)}${ports}</div>`;
    }

    if (rung === 'execution') {
        const preview = typeof node.data?.preview === 'string' ? node.data.preview : '';
        const signal = arrangement === 'message' || arrangement === 'artifact'
            ? ''
            : anatomySignal(SIGNAL_HEIGHTS);
        const previewRow = preview ? anatomyRow(escapeHtml(preview), 'meta', 'card-preview') : '';
        return `<div ${attributes} class="anatomy" style="${box}">${SHAPE_SPAN}${anatomyHeader(`${glyph}${label}`, labelPx || 26, badge)}${signal}${previewRow}${anatomyRow(detail.slice(0, 80))}${ports}</div>`;
    }

    const labelSize = Math.min(24, Math.max(14, labelPx || 20));
    const telemetry = Object.entries(node.data ?? {})
        .filter(([key, value]) => key !== 'ports' && (typeof value === 'string' || typeof value === 'number'))
        .slice(0, 3)
        .map(([key, value]) => `<span style="opacity:.7">${escapeHtml(key)}: ${escapeHtml(String(value))}</span>`)
        .join(' · ');
    const metaline = telemetry || `${escapeHtml(node.kind)} · ${status}`;
    const scope = node.scope ? anatomyRow(`${portalGlyph(node.scope)} scope: ${escapeHtml(node.scope)}`, 'meta') : '';
    const statusDot = anatomyStatusDot(status);
    return `<div ${attributes} class="anatomy" style="${box};justify-content:flex-start;gap:var(--sg-spacing-xs)">${SHAPE_SPAN}${anatomyHeader(`${glyph}${label}`, labelSize, `${statusDot}${badge}`)}${anatomyRow(detail.slice(0, 320), 'body', 'anatomy-row-wrap')}${anatomyRow(metaline, 'meta', 'anatomy-row-wrap')}${scope}${ports}</div>`;
};

/** The inspector lens is the detail rung enlarged: same parts, plus the bounded inner topology. */
export const anatomyLens = (
    node: AnatomyNode,
    chips: readonly InnerChip[],
    layout: InnerLayout,
    labelPx = 0,
): string => {
    const label = escapeHtml(node.label);
    const detail = escapeHtml(detailOf(node));
    const status = escapeHtml(node.status);
    const glyph = node.scope ? `<span aria-hidden="true">${portalGlyph(node.scope)} </span>` : '';
    const actions = [
        actionButton('focus', node.id, 'center', 'Center this node'),
        actionButton('trace', node.id, 'trace', 'Trace the path here'),
        actionButton('follow', node.id, 'follow', 'Follow the live stream'),
        ...(node.kind === 'approval'
            ? [actionButton('approve', node.id, 'approve', 'Approve'), actionButton('reject', node.id, 'reject', 'Reject')]
            : []),
    ].join('');
    const subchips = (chip: InnerChip): string =>
        chip.children.length
            ? `<span class="focus-subchips">${chip.children
                  .map((child) => actionButton('focus', child.id, child.label, `Focus ${child.label}`))
                  .join('')}</span>`
            : '';
    const placements = innerPlacements(chips, layout);
    const connectors =
        layout === 'radial' || layout === 'lane'
            ? `<svg class="focus-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${innerConnectors(placements)
                  .map(
                      ({ chipId, x1, y1, x2, y2 }) =>
                          `<line data-chip="${escapeHtml(chipId)}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`,
                  )
                  .join('')}</svg>`
            : '';
    const inner =
        connectors +
        placements
            .map(
                ({ chip, left, top, width, height }) =>
                    `<div class="focus-chip" data-kind="${escapeHtml(chip.kind)}" data-chip="${escapeHtml(chip.id)}" style="inset-inline-start:${left.toFixed(1)}%;top:${top.toFixed(1)}%;width:${width.toFixed(1)}%;height:${height.toFixed(1)}%"><span class="focus-chip-head"><span aria-hidden="true">${chip.scope ? portalGlyph(chip.scope) : '·'}</span> ${escapeHtml(chip.label)}</span><span class="focus-chip-meta">${escapeHtml(chip.role)} · ${escapeHtml(chip.kind)}</span><span class="focus-chip-status">${escapeHtml(chip.status ?? chip.kind)}</span><span class="focus-chip-signal">${[0.35, 0.6, 0.9, 0.5].map((height) => `<i style="height:${height * 100}%"></i>`).join('')}</span>${actionButton('focus', chip.id, '↗', `Focus ${chip.label}`)}${subchips(chip)}</div>`,
            )
            .join('');
    const titleSize = Math.min(28, Math.max(16, labelPx || 20));
    const header = anatomyHeader(
        `${glyph}${label}`,
        titleSize,
        `${anatomyStatus(status)}${anatomySignal([0.35, 0.6, 0.9, 0.5])}`,
    );
    return `<div data-rung="detail" data-focus="focus" data-kind="${escapeHtml(node.kind)}" data-status="${status}" data-anatomy="${arrangementOf(node)}"${node.scope ? ` data-portal="${escapeHtml(node.scope)}"` : ''} class="focus-panel anatomy" style="position:relative;width:100%;height:100%;box-sizing:border-box;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;gap:6px;padding:8px;overflow:hidden;font-family:inherit">${SHAPE_SPAN}${header}${anatomyRow(detail.slice(0, 240), 'body', 'focus-detail anatomy-row-wrap')}<div class="focus-inner" data-layout="${layout}">${inner}</div><div class="focus-actions">${actions}</div>${portParts(node)}</div>`;
};
