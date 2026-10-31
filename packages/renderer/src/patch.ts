/**
 * Shared patch utilities for renderer adapters.
 * Extracted from duplicate implementations in SpaceGraphRenderer and CytoscapeRenderer.
 */

import type { RenderModel, RenderModelPatch } from './index';

/**
 * Applies a RenderModelPatch to a RenderModel, returning a new merged model.
 * This is pure and has no side effects.
 */
export function mergeRenderModelPatch(model: RenderModel, patch: RenderModelPatch): RenderModel {
  const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));
  for (const id of patch.nodes.removed) nodeMap.delete(id);
  for (const node of patch.nodes.added) nodeMap.set(node.id, node);
  for (const node of patch.nodes.changed) nodeMap.set(node.id, node);

  const edgeMap = new Map(model.edges.map((e) => [e.id, e]));
  for (const id of patch.edges.removed) edgeMap.delete(id);
  for (const edge of patch.edges.added) edgeMap.set(edge.id, edge);
  for (const edge of patch.edges.changed) edgeMap.set(edge.id, edge);

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
    extent: model.extent,
  };
}