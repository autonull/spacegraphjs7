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