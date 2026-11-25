import type { EdgeConfidence, RenderEdge } from '@spacegraphjs/renderer';

export type EdgeStyleSpec = {
    readonly style: RenderEdge['style'];
    readonly confidence: EdgeConfidence;
    readonly tone: 'muted' | 'ink' | 'warning' | 'accent' | 'error';
    readonly caption: boolean;
    readonly glyph: string;
    readonly directed: boolean;
};

const UNKNOWN: EdgeStyleSpec = {
    style: 'solid', confidence: 'structural', tone: 'muted', caption: false, glyph: '·', directed: false,
};

/** Edge hierarchy from committed kinds only. No kind outside this table is ever styled or invented. */
const EDGE_STYLE: Readonly<Record<string, EdgeStyleSpec>> = {
    orders: { style: 'solid', confidence: 'explicit', tone: 'muted', caption: true, glyph: '→', directed: true },
    owns: { style: 'solid', confidence: 'explicit', tone: 'ink', caption: true, glyph: '◇', directed: true },
    delegates: { style: 'solid', confidence: 'explicit', tone: 'ink', caption: true, glyph: '↗', directed: true },
    'sleeps-on': { style: 'dashed', confidence: 'structural', tone: 'warning', caption: true, glyph: '◷', directed: true },
    'waiting.on': { style: 'dashed', confidence: 'inferred', tone: 'warning', caption: true, glyph: '⋯', directed: true },
    checkpoint: { style: 'dotted', confidence: 'inferred', tone: 'accent', caption: true, glyph: '⌁', directed: false },
    fork: { style: 'solid', confidence: 'structural', tone: 'muted', caption: true, glyph: '⑂', directed: true },
    forkedFrom: { style: 'solid', confidence: 'structural', tone: 'muted', caption: true, glyph: '↩', directed: true },
    retry: { style: 'dashed', confidence: 'explicit', tone: 'error', caption: true, glyph: '↺', directed: true },
};

export const edgeStyleForKind = (kind: string): EdgeStyleSpec => EDGE_STYLE[kind] ?? UNKNOWN;

export const isCommittedEdgeKind = (kind: string): boolean => kind in EDGE_STYLE;
