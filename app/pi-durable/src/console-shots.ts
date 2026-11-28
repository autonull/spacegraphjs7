/** Pure capture declarations; safe to import from scripts without the host runtime. */
export type ConsoleShotMeta = {
    readonly id: string;
    readonly source: string;
    readonly palette?: string;
    readonly selection?: readonly [number, number];
    readonly zoomOut?: number;
    readonly detailMode?: 'inline' | 'popup' | 'rail';
    readonly detailLine?: number;
    readonly query?: string;
    readonly rtl?: boolean;
    readonly regions?: boolean;
    readonly profile?: string;
    /** Presentation key applied through the address codec, e.g. `wn` for wrap + line numbers. */
    readonly chrome?: string;
    readonly viewport?: { readonly width: number; readonly height: number };
};

export const CONSOLE_SHOT_META: readonly ConsoleShotMeta[] = [
    { id: 'console-turn', source: 'basic-turn' },
    { id: 'console-selection', source: 'basic-turn', selection: [0, 3] },
    { id: 'console-retro', source: 'basic-turn', palette: 'retro', selection: [1, 4] },
    { id: 'console-history', source: 'basic-turn', query: 'asOf=2' },
    { id: 'console-approval', source: 'sleeping-approval', palette: 'amber' },
    { id: 'console-fork', source: 'fork-tabs', selection: [0, 2] },
    {
        id: 'console-narrow',
        source: 'basic-turn',
        viewport: { width: 1000, height: 700 },
        selection: [0, 2],
    },
    { id: 'console-rtl', source: 'basic-turn', rtl: true },
    { id: 'console-zoom', source: 'basic-turn', zoomOut: 0.38 },
    { id: 'console-detail-inline', source: 'basic-turn', detailMode: 'inline', detailLine: 1 },
    { id: 'console-detail-popup', source: 'basic-turn', detailMode: 'popup', detailLine: 1 },
    { id: 'console-detail-rail', source: 'basic-turn', detailMode: 'rail', detailLine: 1 },
    { id: 'console-search', source: 'basic-turn', query: 'q=France' },
    { id: 'console-regions', source: 'basic-turn', regions: true },
    { id: 'console-fractal', source: 'basic-turn', profile: 'fractal' },
    { id: 'console-chrome', source: 'basic-turn', chrome: 'wn' },
];
