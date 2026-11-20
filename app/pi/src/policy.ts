import { KernelCodec, type Kernel } from '@spacegraphjs/kernel';
import type { AgentView } from '@spacegraphjs/agent';
import type { AgentLevel } from './adapter';

export type Position = { x: number; y: number; z: number };
export type VisionScores = { readonly overlap: number; readonly legibility: number };
export type UnsupportedSeam = { readonly id: string; readonly reason: string };

export const CARD_BUDGETS: Readonly<Record<AgentLevel, number>> = {
    overview: 12,
    execution: 40,
    detail: 24,
};

export const UNSUPPORTED: readonly UnsupportedSeam[] = [
    { id: 'webxr', reason: 'No host adapter registers an immersive session.' },
    { id: 'sound', reason: 'No host adapter registers an audio sink.' },
    { id: 'haptics', reason: 'No host adapter registers a haptic device.' },
];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const escapeHTML = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Host-side overlap estimate. The Playwright gate uses the library's full vision analyzer. */
export const scoreVision = (
    positions: ReadonlyMap<string, Position>,
    size: readonly [number, number] = [200, 64],
): VisionScores => {
    const items = [...positions.values()];
    let overlaps = 0;
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const a = items[i];
            const b = items[j];
            if (
                Math.abs(a.x - b.x) < size[0] &&
                Math.abs(a.y - b.y) < size[1] &&
                Math.abs(a.z - b.z) < 120
            ) {
                overlaps++;
            }
        }
    }
    return {
        overlap: clamp(overlaps / 8, 0, 1),
        legibility: clamp(1 - overlaps * 0.08, 0.25, 1),
    };
};

export const levelForZoom = (zoom: number, current: AgentLevel): AgentLevel => {
    if (current === 'overview') return zoom > 0.7 ? 'execution' : current;
    if (current === 'detail') return zoom < 1.5 ? 'execution' : current;
    if (zoom < 0.45) return 'overview';
    if (zoom > 1.8) return 'detail';
    return 'execution';
};

/** Keeps the full kernel for layout; only the newest turns are drawn. */
export const windowedView = (view: AgentView, turns: number): { view: AgentView; hidden: number } => {
    const recent = (view.turns ?? []).slice(-turns);
    if (!recent.length) return { view, hidden: 0 };
    const recentUnits = new Set(
        recent.flatMap((id) => {
            const unit = view.nodes.find((node) => node.id === id);
            const unitId = unit?.data?.unitId;
            return unitId === undefined ? [id] : [id, String(unitId)];
        }),
    );
    const nodes = view.nodes.filter(
        (node) =>
            node.kind === 'run' ||
            node.kind === 'unit' ||
            recentUnits.has(String(node.data?.unitId ?? '')) ||
            recentUnits.has(node.id),
    );
    const visible = new Set(nodes.map((node) => node.id));
    return {
        view: { ...view, nodes, edges: view.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)) },
        hidden: view.nodes.length - nodes.length,
    };
};

export const decayActivity = (activity: Map<string, number>, seconds: number): void => {
    const factor = Math.exp(-seconds * 1.6);
    for (const [id, value] of activity) {
        const next = value * factor;
        if (next < 0.02) activity.delete(id);
        else activity.set(id, next);
    }
};

const exportable = (view: AgentView, positions: ReadonlyMap<string, Position>) =>
    view.nodes
        .filter((node) => positions.has(node.id))
        .map((node) => ({ node, position: positions.get(node.id)! }));

export const exportHTML = (view: AgentView, positions: ReadonlyMap<string, Position>): string => {
    const rows = exportable(view, positions)
        .map(
            ({ node, position }) =>
                `<li data-kind="${escapeHTML(node.kind)}" data-x="${position.x.toFixed(1)}" data-y="${position.y.toFixed(1)}">${escapeHTML(node.label)}</li>`,
        )
        .join('\n');
    return `<!doctype html>\n<meta charset="utf-8">\n<title>Pi graph export</title>\n<ul>\n${rows}\n</ul>\n`;
};

export const exportSVG = (view: AgentView, positions: ReadonlyMap<string, Position>): string => {
    const edges = view.edges
        .map((edge) => {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);
            return from && to
                ? `<line x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}" stroke="#4a5d92"/>`
                : '';
        })
        .join('\n');
    const nodes = exportable(view, positions)
        .map(
            ({ node, position }) =>
                `<rect x="${(position.x - 100).toFixed(1)}" y="${(position.y - 32).toFixed(1)}" width="200" height="64" rx="8" fill="#1d2742"/><text x="${position.x.toFixed(1)}" y="${position.y.toFixed(1)}" fill="#e8edff" font-size="12">${escapeHTML(node.label)}</text>`,
        )
        .join('\n');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="-1200 -800 2400 1600">\n${edges}\n${nodes}\n</svg>\n`;
};

export const exportJSON = (kernel: Kernel): string => KernelCodec.encode(kernel);
