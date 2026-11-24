import type { EdgeConfidence, RenderEdge } from '@spacegraphjs/renderer';

export type EdgeStyleSpec = {
    readonly style: RenderEdge['style'];
    readonly confidence: EdgeConfidence;
    readonly tone: 'muted' | 'ink' | 'warning' | 'accent' | 'error';
    readonly caption: boolean;
};

/** Edge hierarchy from committed kinds only. No kind outside this table is ever styled or invented. */
const EDGE_STYLE: Readonly<Record<string, EdgeStyleSpec>> = {
    orders: { style: 'solid', confidence: 'structural', tone: 'muted', caption: false },
    owns: { style: 'solid', confidence: 'explicit', tone: 'ink', caption: true },
    delegates: { style: 'solid', confidence: 'explicit', tone: 'ink', caption: true },
    'sleeps-on': { style: 'dashed', confidence: 'structural', tone: 'warning', caption: true },
    'waiting.on': { style: 'dashed', confidence: 'structural', tone: 'warning', caption: true },
    checkpoint: { style: 'dotted', confidence: 'structural', tone: 'accent', caption: false },
    fork: { style: 'solid', confidence: 'structural', tone: 'muted', caption: true },
    forkedFrom: { style: 'solid', confidence: 'structural', tone: 'muted', caption: false },
    retry: { style: 'dashed', confidence: 'explicit', tone: 'error', caption: true },
};

export const edgeStyleForKind = (kind: string): EdgeStyleSpec =>
    EDGE_STYLE[kind] ?? { style: 'solid', confidence: 'structural', tone: 'muted', caption: false };

export const isCommittedEdgeKind = (kind: string): boolean => kind in EDGE_STYLE;
