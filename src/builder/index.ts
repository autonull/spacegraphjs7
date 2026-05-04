// builder/index.ts - Unified builder API
export { BaseBuilder, GenericBuilder } from './base';
export { NodeBuilder, WidgetBuilder } from './node';
export { EdgeBuilder } from './edge';
export { GraphBuilder as GraphSpecBuilder, GraphBuilder } from './graph';
export { Patterns } from './patterns';
export { Animate, Camera } from './animation';
export {
    graph,
    widget,
    button,
    toggle,
    slider,
    quickGraph,
    NodeFactory,
    EdgeFactory,
    Layout,
    NodeFactoryExtended,
    Presets,
    DataUtils,
    Batch,
} from './factories';

// Re-export types for convenience
export type { NodeSpec, EdgeSpec, GraphSpec } from '../types';

// ============= Convenience Shortcuts =============
// These provide a more fluent API for common operations

// Quick node spec creators
export const nodeSpec = (id: string, type = 'ShapeNode') => ({ id, type });
export const edgeSpec = (id: string, source: string, target: string) => ({ id, source, target });

// Convenience: create node specs with position
export const at = (id: string, x: number, y: number, z = 0) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number] });
export const box$ = (id: string, x: number, y: number, z = 0, size = 50) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number], data: { shape: 'box', size } });
export const sphere$ = (id: string, x: number, y: number, z = 0, size = 50) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number], data: { shape: 'sphere', size } });
export const circle$ = (id: string, x: number, y: number, z = 0, size = 50) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number], data: { shape: 'circle', size } });

// Convenience: create edge specs
export const connect$ = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target });
export const arrow$ = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target, data: { arrowhead: true } });
export const dashed$ = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target, data: { dashed: true } });
export const curved$ = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target, type: 'CurvedEdge' });

// Chain-friendly edge connection
export const $ = (source: string) => ({
    to: (target: string) => connect$(source, target),
    from: (target: string) => connect$(target, source),
});

// Quick layout options
export const layout$ = (type: string) => ({ type });