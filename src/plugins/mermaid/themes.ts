export const MERMAID_THEMES = {
    default: {
        nodeColors: [
            'rgba(59, 130, 246, 0.9)',
            'rgba(139, 92, 246, 0.9)',
            'rgba(16, 185, 129, 0.9)',
            'rgba(245, 158, 11, 0.9)',
            'rgba(239, 68, 68, 0.9)',
            'rgba(236, 72, 153, 0.9)',
            'rgba(6, 182, 212, 0.9)',
            'rgba(132, 204, 22, 0.9)',
        ],
        edgeColor: 0x64748b,
        textColor: '#ffffff',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
    },
    forest: {
        nodeColors: [
            'rgba(34, 197, 94, 0.9)',
            'rgba(22, 163, 74, 0.9)',
            'rgba(21, 128, 61, 0.9)',
            'rgba(20, 184, 166, 0.9)',
            'rgba(13, 148, 136, 0.9)',
        ],
        edgeColor: 0x22543d,
        textColor: '#ffffff',
        backgroundColor: 'rgba(6, 78, 59, 0.95)',
    },
    neutral: {
        nodeColors: [
            'rgba(71, 85, 105, 0.9)',
            'rgba(100, 116, 139, 0.9)',
            'rgba(148, 163, 184, 0.9)',
        ],
        edgeColor: 0x475569,
        textColor: '#f1f5f9',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
    },
    neon: {
        nodeColors: [
            'rgba(251, 146, 60, 0.9)',
            'rgba(251, 191, 36, 0.9)',
            'rgba(34, 211, 238, 0.9)',
            'rgba(167, 139, 250, 0.9)',
            'rgba(244, 114, 182, 0.9)',
        ],
        edgeColor: 0x06b6d4,
        textColor: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
};

export type MermaidThemeName = keyof typeof MERMAID_THEMES;

export const LAYOUT_NAMES = [
    'force',
    'circular',
    'grid',
    'hierarchical',
    'radial',
    'tree',
    'spectral',
    'cluster',
] as const;

export type LayoutName = (typeof LAYOUT_NAMES)[number];

const LAYOUT_LABELS: Record<LayoutName, string> = {
    force: 'Force Directed',
    circular: 'Circular',
    grid: 'Grid',
    hierarchical: 'Hierarchical',
    radial: 'Radial',
    tree: 'Tree',
    spectral: 'Spectral',
    cluster: 'Cluster',
};

export function getLayoutLabel(name: LayoutName): string {
    return LAYOUT_LABELS[name];
}
