export { ModelAdapter } from './ModelAdapter';
export { VocabularyAdapter, type VocabularyAdapterConfig } from './vocabulary-adapter';
export { diffRenderModels } from './diff';
export { createPatchPainter } from './patch-painter';
export { escapeHtml, formatOpacity } from './html';
export { adapterConformance, type ConformanceCase, type ConformanceFixture } from './conformance';
export {
    chooseRendererStrategy,
    canvasRendererFor,
    DEFAULT_RENDERER_STRATEGY_THRESHOLDS,
    RENDERER_STRATEGIES,
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
