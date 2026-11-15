export { ModelAdapter } from './ModelAdapter';
export { diffRenderModels } from './diff';
export { escapeHtml, formatOpacity } from './html';
export { adapterConformance, type ConformanceCase, type ConformanceFixture } from './conformance';
export {
    chooseRendererStrategy,
    canvasRendererFor,
    DEFAULT_RENDERER_STRATEGY_THRESHOLDS,
    type RendererStrategy,
    type RendererStrategyThresholds,
    type RendererStrategyOptions,
} from './renderer-strategy';
export type { RenderModelPatch } from '@spacegraphjs/renderer';
export type {
    AdapterAxisLabel,
    AdapterBounds,
    AdapterConfig,
    AdapterEdge,
    AdapterGeometry,
    AdapterLaneLabel,
    AdapterModel,
    AdapterNode,
    AdapterPosition,
    BandTemplate,
    BuildOptions,
    CardContext,
    CardTemplate,
} from './types';
