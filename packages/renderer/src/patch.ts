/**
 * Shared patch utilities for renderer adapters.
 * Extracted from duplicate implementations in SpaceGraphRenderer and CytoscapeRenderer.
 */
import type { RenderModel, RenderModelPatch } from './index';

type PatchList<T extends { id: string }> = {
    removed: readonly string[];
    added: readonly T[];
    changed: readonly T[];
};
const applyPatch = <T extends { id: string }>(
    current: readonly T[],
    patch: PatchList<T>,
): Map<string, T> => {
    const byID = new Map(current.map((item) => [item.id, item]));
    for (const id of patch.removed) byID.delete(id);
    for (const item of [...patch.added, ...patch.changed]) byID.set(item.id, item);
    return byID;
};

/**
 * Applies a RenderModelPatch to a RenderModel, returning a new merged model.
 * This is pure and has no side effects.
 */
export function mergeRenderModelPatch(model: RenderModel, patch: RenderModelPatch): RenderModel {
    return {
        nodes: [...applyPatch(model.nodes, patch.nodes).values()],
        edges: [...applyPatch(model.edges, patch.edges).values()],
        extent: model.extent,
    };
}
