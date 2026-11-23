import type {
    GraphRenderer,
    RenderEdge,
    RenderModel,
    RenderNode,
    RenderTheme,
} from '@spacegraphjs/renderer';

export const MODEL: RenderModel = {
    nodes: [
        { id: 'root', kind: 'session', label: 'Session', position: [0, 0, 0] },
        { id: 'read', kind: 'call', label: 'read', position: [1, 0, 0] },
    ],
    edges: [{ id: 'e1', source: 'root', target: 'read', kind: 'part-of' }],
};

export const THEME: RenderTheme = {
    background: '#000',
    surface: '#111',
    surfaceMuted: '#222',
    text: '#fff',
    textMuted: '#888',
    border: '#333',
    accent: '#0af',
    success: '#0f0',
    warning: '#ff0',
    error: '#f00',
    edge: '#666',
    edgeMuted: '#444',
    selection: '#0af',
    focus: '#0af',
    fontFamily: 'sans-serif',
    fontSize: 12,
};

export const RENDER_THEME: RenderTheme = {
    background: '#101014',
    surface: '#1b1b22',
    surfaceMuted: '#2a2a33',
    text: '#f5f5f7',
    textMuted: '#a0a0aa',
    border: '#3a3a44',
    accent: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    edge: '#6b7280',
    edgeMuted: '#4b5563',
    selection: '#60a5fa',
    focus: '#93c5fd',
    fontFamily: 'ui-sans-serif',
    fontSize: 13,
};

export const node = (over: Partial<RenderNode> = {}): RenderNode => ({
    id: 'n1',
    kind: 'tool',
    label: 'read',
    position: [10, 20, 30],
    ...over,
});

export const edge = (over: Partial<RenderEdge> = {}): RenderEdge => ({
    id: 'e1',
    source: 'a',
    target: 'b',
    kind: 'reads',
    ...over,
});

type Handler = (payload: unknown) => void;

export function fakeRenderer() {
    const listeners = new Map<string, Set<Handler>>();
    const calls = {
        mounted: 0,
        models: [] as RenderModel[],
        disposed: 0,
        selection: [] as (readonly string[])[],
    };
    const renderer = {
        capabilities: {
            projections: ['2d', '3d'],
            domNodes: true,
            maxDomNodes: 40,
            edgeLabels: true,
            clusterNodes: true,
            minimap: false,
            maxRecommendedNodes: 300,
        },
        async mount() {
            calls.mounted += 1;
        },
        setModel(model: RenderModel) {
            calls.models.push(model);
        },
        setTheme() {},
        setProjection() {},
        setSelection(ids: readonly string[]) {
            calls.selection.push(ids);
        },
        setViewport() {},
        fit() {},
        focus() {},
        resize() {},
        on(event: string, handler: Handler) {
            const set = listeners.get(event) ?? new Set<Handler>();
            set.add(handler);
            listeners.set(event, set);
            return () => set.delete(handler);
        },
        dispose() {
            calls.disposed += 1;
        },
    };
    return { renderer: renderer as unknown as GraphRenderer, calls };
}
