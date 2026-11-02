/**
 * Shared patch utilities for renderer adapters.
 * Extracted from duplicate implementations in SpaceGraphRenderer and CytoscapeRenderer.
 */
import type { RenderModel, RenderModelPatch } from './index';
/**
 * Applies a RenderModelPatch to a RenderModel, returning a new merged model.
 * This is pure and has no side effects.
 */
export declare function mergeRenderModelPatch(
    model: RenderModel,
    patch: RenderModelPatch,
): RenderModel;
//# sourceMappingURL=patch.d.ts.map
