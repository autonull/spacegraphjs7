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
// Quick node spec creators - lightweight spec objects for fast graph construction
export const nodeSpec = (id: string, type = 'ShapeNode') => ({ id, type } as NodeSpec);
export const edgeSpec = (id: string, source: string, target: string) => ({ id, source, target } as EdgeSpec);

// Convenience: create node specs with position
export const at = (id: string, x: number, y: number, z = 0) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number] } as NodeSpec);
export const box = (id: string, x: number, y: number, z = 0, size = 50) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number], data: { shape: 'box', size } } as NodeSpec);
export const sphere = (id: string, x: number, y: number, z = 0, size = 50) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number], data: { shape: 'sphere', size } } as NodeSpec);
export const circle = (id: string, x: number, y: number, z = 0, size = 50) => ({ id, type: 'ShapeNode', position: [x, y, z] as [number, number, number], data: { shape: 'circle', size } } as NodeSpec);

// Convenience: create edge specs
export const connect = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target } as EdgeSpec);
export const arrow = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target, data: { arrowhead: true } } as EdgeSpec);
export const dashed = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target, data: { dashed: true } } as EdgeSpec);
export const curved = (source: string, target: string) => ({ id: `e-${source}-${target}`, source, target, type: 'CurvedEdge' } as EdgeSpec);

// Chain-friendly edge connection
export const $ = (source: string) => ({
    to: (target: string) => connect(source, target),
    from: (target: string) => connect(target, source),
});

// Quick layout options
export const layout = (type: string) => ({ type });