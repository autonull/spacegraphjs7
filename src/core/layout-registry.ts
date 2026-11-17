/** Layout registry entry: name + description for UI/CLI discovery. */
export interface LayoutRegistryEntry {
    id: string;
    name: string;
    description: string;
}

/** Built-in layout registry for discovery. */
export const LAYOUT_REGISTRY: LayoutRegistryEntry[] = [
    { id: 'force-layout', name: 'Force Directed', description: 'Spring-electrical simulation for organic layouts' },
    { id: 'grid-layout', name: 'Grid', description: 'Nodes arranged in a grid' },
    { id: 'circular-layout', name: 'Circular', description: 'Nodes placed on a circle' },
    { id: 'tree-layout', name: 'Tree', description: 'Hierarchical tree layout' },
    { id: 'hierarchical-layout', name: 'Hierarchical', description: 'Layered hierarchical layout' },
    { id: 'radial-layout', name: 'Radial', description: 'Radial tree layout' },
    { id: 'spectral-layout', name: 'Spectral', description: 'Eigenvector-based layout' },
    { id: 'cluster-layout', name: 'Cluster', description: 'Clustered force layout' },
    { id: 'geo-layout', name: 'Geographic', description: 'Lat/long positioned nodes' },
    { id: 'timeline-layout', name: 'Timeline', description: 'Time-based linear layout' },
];

/** Get all registered layout names (built-in + runtime). */
export function listLayouts(): string[] {
    return LAYOUT_REGISTRY.map((entry) => entry.id);
}

/** Get layout registry entries (built-in + runtime). */
export function getLayoutRegistry(): LayoutRegistryEntry[] {
    return [...LAYOUT_REGISTRY];
}
